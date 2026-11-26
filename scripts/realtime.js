/**
 * Supabase Realtime: ฟังการเปลี่ยนแปลงของตารางหลัก แล้วรีเฟรชหน้าจอ
 * - ใช้ debounce กันรีเฟรชถี่เกินไปตอนอัปเดตหลายแถวติดกัน
 * - ถ้า subscribe ไม่สำเร็จ (เน็ตอ่อน / realtime ปิด) จะไม่ทำให้แอปพัง
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase-client.js';

/** ตารางที่ต้องซิงค์แบบ realtime (ชื่อตารางใน Supabase) */
export const REALTIME_TABLES = [
  'help_requests',
  'flood_reports',
  'emergency_shelters',
  'relief_supplies',
  'volunteer_teams',
  'public_announcements',
];

const CHANNEL_NAME = 'cmb-halabala-data-sync';
const DEBOUNCE_MS = 600;

let channel = null;
let debounceTimer = null;
let started = false;
let lastEventAt = 0;

/**
 * เริ่มฟัง Realtime
 * @param {() => Promise<void>|void} onChange - เรียกเมื่อมีข้อมูลเปลี่ยน (เช่น refreshPublicViews)
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function startRealtimeSync(onChange) {
  if (started) return { ok: true, reason: 'already-started' };
  if (!isSupabaseConfigured()) return { ok: false, reason: 'supabase-not-configured' };

  let client;
  try {
    client = await getSupabaseClient();
  } catch (error) {
    console.warn('Realtime: unable to get Supabase client', error);
    return { ok: false, reason: 'client-error' };
  }
  if (!client) return { ok: false, reason: 'no-client' };

  const scheduleRefresh = (payload) => {
    lastEventAt = Date.now();
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      try {
        const result = onChange?.(payload);
        if (result && typeof result.then === 'function') {
          result.catch((error) => console.error('Realtime refresh failed:', error));
        }
      } catch (error) {
        console.error('Realtime onChange error:', error);
      }
    }, DEBOUNCE_MS);
  };

  try {
    let builder = client.channel(CHANNEL_NAME);
    REALTIME_TABLES.forEach((table) => {
      builder = builder.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          console.debug('[realtime]', table, payload?.eventType || payload?.event);
          scheduleRefresh(payload);
        },
      );
    });

    channel = builder.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        started = true;
        console.info('Realtime sync subscribed');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('Realtime channel status:', status);
      } else if (status === 'CLOSED') {
        started = false;
      }
    });

    return { ok: true };
  } catch (error) {
    console.warn('Realtime subscribe failed:', error);
    return { ok: false, reason: error?.message || 'subscribe-failed' };
  }
}

/**
 * หยุดฟัง Realtime (เช่น ตอนออกจากระบบถ้าต้องการ)
 */
export async function stopRealtimeSync() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (!channel) {
    started = false;
    return;
  }
  try {
    const client = await getSupabaseClient();
    if (client) await client.removeChannel(channel);
  } catch (error) {
    console.warn('Realtime unsubscribe failed:', error);
  }
  channel = null;
  started = false;
}

export function isRealtimeStarted() {
  return started;
}

export function getLastRealtimeEventAt() {
  return lastEventAt;
}
