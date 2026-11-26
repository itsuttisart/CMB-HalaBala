/**
 * คิวส่งข้อมูลเมื่อเน็ตอ่อน/ออฟไลน์
 * - เก็บคำร้องที่ส่งไม่สำเร็จใน localStorage
 * - พอออนไลน์หรือเน็ตกลับมา จะลองส่งใหม่เอง
 */

const QUEUE_KEY = 'cmb-halabala-offline-request-queue';

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function getOfflineQueueCount() {
  return readQueue().length;
}

export function enqueueRequest(record) {
  const queue = readQueue();
  queue.push({ ...record, queuedAt: new Date().toISOString() });
  writeQueue(queue);
  return queue.length;
}

/**
 * ลองส่งคิวที่ค้างอยู่
 * @param {(record: object) => Promise<void>} sendFn - ฟังก์ชันบันทึกจริง เช่น createRecord('requests', record)
 * @returns {Promise<{sent: number, remaining: number}>}
 */
export async function flushOfflineQueue(sendFn) {
  const queue = readQueue();
  if (!queue.length) return { sent: 0, remaining: 0 };

  const remaining = [];
  let sent = 0;
  for (const item of queue) {
    try {
      const { queuedAt, ...record } = item;
      await sendFn(record);
      sent += 1;
    } catch (error) {
      console.warn('Offline queue item still pending:', error);
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  return { sent, remaining: remaining.length };
}

/**
 * แสดงแถบสถานะเครือข่าย + ล้างคิวเมื่อกลับออนไลน์
 * @param {(record: object) => Promise<void>} sendFn
 */
export function initNetworkStatus(sendFn) {
  let banner = document.querySelector('#network-status');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'network-status';
    banner.className = 'network-status';
    banner.setAttribute('role', 'status');
    document.body.appendChild(banner);
  }

  const render = (mode, message) => {
    banner.classList.remove('is-visible', 'is-offline', 'is-queued');
    if (!mode) {
      banner.textContent = '';
      return;
    }
    banner.classList.add('is-visible', mode === 'offline' ? 'is-offline' : 'is-queued');
    banner.textContent = message;
  };

  const refreshBanner = () => {
    const pending = getOfflineQueueCount();
    if (!navigator.onLine) {
      render('offline', pending
        ? `ออฟไลน์ — มี ${pending} รายการรอส่งเมื่อเน็ตกลับมา`
        : 'ออฟไลน์ — ยังใช้งานฟอร์มได้ ข้อมูลจะถูกส่งเมื่อเน็ตกลับมา');
      return;
    }
    if (pending) {
      render('queued', `เน็ตกลับมาแล้ว กำลังส่งคิวที่ค้าง ${pending} รายการ…`);
      return;
    }
    render(null);
  };

  const tryFlush = async () => {
    if (!navigator.onLine) {
      refreshBanner();
      return;
    }
    const pending = getOfflineQueueCount();
    if (!pending) {
      refreshBanner();
      return;
    }
    refreshBanner();
    try {
      const result = await flushOfflineQueue(sendFn);
      if (result.sent) {
        banner.classList.add('is-visible');
        banner.classList.remove('is-offline', 'is-queued');
        banner.style.background = '#1a6b52';
        banner.textContent = `ส่งข้อมูลที่ค้างสำเร็จ ${result.sent} รายการ`;
        setTimeout(() => {
          banner.style.background = '';
          refreshBanner();
        }, 2800);
      } else {
        refreshBanner();
      }
    } catch (error) {
      console.error('Unable to flush offline queue:', error);
      refreshBanner();
    }
  };

  window.addEventListener('online', () => {
    void tryFlush();
  });
  window.addEventListener('offline', refreshBanner);
  refreshBanner();
  if (navigator.onLine) void tryFlush();

  return { refreshBanner, tryFlush };
}

/**
 * บันทึกคำร้องแบบทนเน็ตอ่อน: ลองส่งจริง ถ้าล้มเหลวและน่าจะเป็นเน็ต → เข้าคิว
 * @param {(record: object) => Promise<void>} sendFn
 * @param {object} record
 * @returns {Promise<'saved'|'queued'>}
 */
export async function saveRequestResilient(sendFn, record) {
  if (!navigator.onLine) {
    enqueueRequest(record);
    return 'queued';
  }
  try {
    await sendFn(record);
    return 'saved';
  } catch (error) {
    const message = String(error?.message || error || '');
    const looksNetwork = /network|fetch|failed|timeout|offline|Failed to fetch|ERR_/i.test(message)
      || error?.name === 'TypeError';
    if (looksNetwork) {
      enqueueRequest(record);
      return 'queued';
    }
    throw error;
  }
}
