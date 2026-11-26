import { pages } from './data.js';
import { createRecord, floodPins, getFloodCounts, refreshRemoteData, requests, updateRecord } from './store.js';
import { getSupabaseClient, fetchAdminProfile, getSupabaseConfigurationError, hasSupabaseConfiguration, isSupabaseConfigured } from './supabase-client.js';
import { focusGeoapifyMap, syncGeoapifyMaps } from './geoapify-map.js';
import { mountAdminCrudDialog } from './admin-crud.js';
import { renderAdminUsers, loadManagedAdmins, bindAdminUserControls } from './pages/admin-users.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderPublicSummary, renderPublicAlerts } from './pages/public-home.js';
import { initPublicTabs, resetPublicView } from './public-tabs.js';
import { renderFloodMonitor, renderPublicFloodMonitor, mountFloodReportDialog, openFloodReportDialog, bindFloodReportForm, handleFloodPinStatusChange, handleFloodReportVerification, showFloodPinDetails } from './pages/flood-monitor.js';
import { renderMap } from './pages/map.js';
import { renderRequests } from './pages/requests.js';
import { renderPublicShelters, renderShelters } from './pages/shelters.js';
import { renderSupplies } from './pages/supplies.js';
import { renderVolunteers } from './pages/volunteers.js';
import { renderAnnouncements, renderPublicAnnouncements } from './pages/announcements.js';
import { escapeHtml } from './utils.js';

const pageContent = document.querySelector('#page-content');
const requestForm = document.querySelector('#request-form');
const requestDialog = document.querySelector('#request-dialog');
const publicSite = document.querySelector('#public-site');
const loginPage = document.querySelector('#login-page');
const adminApp = document.querySelector('#admin-app');
const renderers = {
  dashboard: renderDashboard,
  requests: renderRequests,
  'flood-monitor': renderFloodMonitor,
  map: renderMap,
  shelters: renderShelters,
  supplies: renderSupplies,
  volunteers: renderVolunteers,
  announcements: renderAnnouncements,
  'admin-users': renderAdminUsers,
};

let currentPage = 'dashboard';
let currentProfile = null;
let demoAdmin = false;

/**
 * แปลงชื่อชุดข้อมูลเป็นรหัสเมนูสำหรับตรวจสิทธิ์ (floodPins → flood-monitor)
 */
function moduleForCollection(collection) {
  return collection === 'floodPins' ? 'flood-monitor' : collection;
}

/**
 * ตรวจว่าผู้ใช้ปัจจุบันเพิ่ม/แก้ไข/ลบชุดข้อมูลนี้ได้หรือไม่
 * @param {string} collection
 */
function canManage(collection) {
  if (!hasSupabaseConfiguration()) return demoAdmin;
  return Boolean(currentProfile
    && (currentProfile.role === 'superadmin' || currentProfile.modules.includes(moduleForCollection(collection))));
}

/**
 * ตรวจว่าผู้ใช้ปัจจุบันเข้าเมนูนี้ได้หรือไม่ (superadmin เข้าได้ทุกเมนู)
 * @param {string} page
 */
function canAccessPage(page) {
  if (page === 'dashboard') return true;
  if (page === 'admin-users') return Boolean(currentProfile?.role === 'superadmin');
  if (!hasSupabaseConfiguration()) return demoAdmin;
  return Boolean(currentProfile
    && (currentProfile.role === 'superadmin' || currentProfile.modules.includes(page)));
}

/**
 * ซ่อน/แสดงเมนูและปุ่มลัดตามสิทธิ์ของผู้ใช้
 */
function applyModuleAccess() {
  document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
    item.hidden = !canAccessPage(item.dataset.page);
  });
  pageContent.querySelectorAll('[data-page]').forEach((item) => {
    item.hidden = !canAccessPage(item.dataset.page);
  });
}

/**
 * สั่งวาดแผนที่น้ำท่วมใหม่และผูกการแตะแผนที่/คลิกหมุด
 */
function syncFloodMaps() {
  syncGeoapifyMaps({
    onMapPick: ({ lat, lng }) => openFloodReportDialog({ lat, lng, source: adminApp.hidden ? 'public' : 'admin' }),
    onPinClick: showFloodPinDetails,
  });
}

/**
 * วาดหน้าของเจ้าหน้าที่ตามชื่อเมนู (ตรวจสิทธิ์ก่อน แล้วอัปเดต breadcrumb, ตัวเลขแจ้งเตือน, เมนูที่เลือก)
 * @param {string} [page] - รหัสเมนู เช่น "shelters"
 */
async function renderPage(page = currentPage) {
  const requestedPage = pages[page] ? page : 'dashboard';
  if (!canAccessPage(requestedPage)) {
    await Swal.fire({ icon: 'error', title: 'ไม่มีสิทธิ์เข้าถึงเมนูนี้', text: 'บัญชีของคุณยังไม่ได้รับมอบหมายเมนูดังกล่าว', confirmButtonText: 'รับทราบ' });
    currentPage = 'dashboard';
  } else {
    currentPage = requestedPage;
  }

  let pageError = '';
  if (currentPage === 'admin-users') {
    try {
      await loadManagedAdmins();
    } catch (error) {
      console.error('Unable to load admin accounts:', error);
      pageError = error.message || 'โหลดบัญชีไม่สำเร็จ';
    }
  }
  if (pageError) {
    pageContent.innerHTML = `<div class="page-heading"><div><span class="eyebrow">${escapeHtml(pages['admin-users'].eyebrow)}</span><h1>${escapeHtml(pages['admin-users'].title)}</h1></div></div><div class="info-banner info-banner-error">${escapeHtml(pageError)}</div><button class="button button-outline" data-page="admin-users">ลองอีกครั้ง</button>`;
  } else {
    pageContent.innerHTML = renderers[currentPage]();
  }

  document.querySelector('#breadcrumb-current').textContent = pages[currentPage].title;
  document.querySelector('#request-nav-count').textContent = requests.filter((request) => request.status !== 'ช่วยเหลือแล้ว').length;
  const pendingFloodReports = floodPins.filter((pin) => !pin.verified).length;
  const floodNavCount = document.querySelector('#flood-nav-count');
  floodNavCount.textContent = pendingFloodReports;
  floodNavCount.hidden = pendingFloodReports === 0;
  document.querySelectorAll('.nav-item').forEach((item) => {
    const isActive = item.dataset.page === currentPage;
    item.classList.toggle('active', isActive);
    if (isActive) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  applyModuleAccess();
  bindAdminUserControls(pageContent, () => renderPage('admin-users'));
  syncFloodMaps();
}

/**
 * สลับมุมมองหลัก: "public" (หน้าประชาชน), "login", "admin" (ต้องล็อกอินก่อนเมื่อต่อ Supabase)
 * @param {"public"|"login"|"admin"} view
 */
function showView(view) {
  if (view === 'admin' && hasSupabaseConfiguration() && !currentProfile) {
    Swal.fire({ icon: 'info', title: 'กรุณาเข้าสู่ระบบ', text: 'เข้าสู่ระบบด้วยบัญชีเจ้าหน้าที่ที่ได้รับสิทธิ์ก่อน', confirmButtonText: 'รับทราบ' });
    return;
  }
  publicSite.hidden = view !== 'public';
  loginPage.hidden = view !== 'login';
  adminApp.hidden = view !== 'admin';
  window.scrollTo({ top: 0, behavior: 'auto' });
  window.requestAnimationFrame(syncFloodMaps);
}

/**
 * วาดทุกส่วนของหน้าประชาชนใหม่: สรุปตัวเลข, แจ้งเตือน, สถานการณ์น้ำท่วม, ศูนย์พักพิง, ข่าวประกาศ
 */
function renderPublicSections() {
  document.querySelector('#public-summary-root').innerHTML = renderPublicSummary();
  document.querySelector('#public-alerts-root').innerHTML = renderPublicAlerts();
  document.querySelector('#public-flood-monitor-root').innerHTML = renderPublicFloodMonitor();
  document.querySelector('#public-shelters-root').innerHTML = renderPublicShelters();
  document.querySelector('#public-announcements-root').innerHTML = renderPublicAnnouncements();
}

/**
 * โหลดข้อมูลล่าสุดแล้ววาดส่วนสาธารณะ (และหน้าแอดมินถ้าเปิดอยู่) ใหม่
 */
async function refreshPublicViews() {
  if (isSupabaseConfigured()) await refreshRemoteData();
  renderPublicSections();
  if (!adminApp.hidden) await renderPage(currentPage);
  else syncFloodMaps();
}

/**
 * รีเฟรชข้อมูลน้ำท่วมทุกหน้า พร้อมแสดง popup ถ้าโหลดไม่สำเร็จ
 * @returns {Promise<boolean>}
 */
async function refreshFloodViews() {
  try {
    await refreshPublicViews();
    return true;
  } catch (error) {
    console.error('Unable to refresh Supabase data:', error);
    Swal.fire({ icon: 'error', title: 'โหลดข้อมูลล่าสุดไม่สำเร็จ', text: error.message || 'ตรวจสอบการเชื่อมต่อ Supabase', confirmButtonText: 'รับทราบ' });
    return false;
  }
}

/**
 * เรียกหลังเพิ่ม/แก้ไข/ลบข้อมูล: โหลดข้อมูลใหม่แล้ววาดหน้าใหม่
 */
async function afterRecordMutation() {
  try {
    if (isSupabaseConfigured()) await refreshRemoteData();
  } catch (error) {
    console.error('The record was saved but the latest data could not be loaded:', error);
    await Swal.fire({ icon: 'warning', title: 'บันทึกแล้ว แต่โหลดรายการล่าสุดไม่สำเร็จ', text: error.message, confirmButtonText: 'รับทราบ' });
    renderPublicSections();
    if (!adminApp.hidden) await renderPage(currentPage);
    else syncFloodMaps();
    return false;
  }
  renderPublicSections();
  if (!adminApp.hidden) await renderPage(currentPage);
  else syncFloodMaps();
  return true;
}

/**
 * เปิดหน้าเจ้าหน้าที่แบบตัวอย่าง (ใช้ได้เฉพาะเมื่อยังไม่ต่อ Supabase)
 */
async function openAdminPreview() {
  if (hasSupabaseConfiguration()) {
    await Swal.fire({ icon: 'info', title: 'ปิดโหมดตัวอย่างแล้ว', text: 'เมื่อเชื่อม Supabase จะต้องเข้าสู่ระบบด้วยบัญชีเจ้าหน้าที่ที่ได้รับสิทธิ์', confirmButtonText: 'รับทราบ' });
    return;
  }
  demoAdmin = true;
  currentProfile = null;
  showView('admin');
  await renderPage('dashboard');
}

/**
 * เปิดกล่องแจ้งเหตุขอความช่วยเหลือ
 */
function openRequestDialog() {
  if (!requestDialog.open) requestDialog.showModal();
  window.requestAnimationFrame(() => requestForm.elements.name.focus({ preventScroll: true }));
}

/**
 * สร้างหมายเลขอ้างอิงคำร้อง เช่น "HB-1A2B3C4D"
 */
function makeRequestId() {
  const suffix = typeof crypto.randomUUID === 'function' ? crypto.randomUUID().slice(0, 8).toUpperCase() : Date.now().toString(36).toUpperCase();
  return `HB-${suffix}`;
}

/**
 * แสดง popup ยืนยันว่ารับคำร้องแล้ว
 * @param {string} requestId
 */
function showSavedAlert(requestId) {
  const savedToDatabase = isSupabaseConfigured();
  Swal.fire({
    icon: 'success',
    title: savedToDatabase ? 'ส่งข้อมูลถึงศูนย์ประสานงานแล้ว' : 'รับข้อมูลแจ้งเหตุแล้ว',
    html: `<p>หมายเลขอ้างอิง <strong>${escapeHtml(requestId)}</strong></p><p class="swal-note">${savedToDatabase ? 'ข้อมูลถูกบันทึกในระบบแล้ว หากเป็นเหตุฉุกเฉินกรุณาโทร 1784' : 'ต้นแบบนี้บันทึกข้อมูลไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น ยังไม่ได้ส่งถึงเจ้าหน้าที่จริง หากเป็นเหตุฉุกเฉินกรุณาโทร 1784'}</p>`,
    confirmButtonText: 'รับทราบ',
    footer: '<a href="tel:1784">โทรสายด่วน ปภ. 1784</a>',
  });
}

/**
 * แสดง popup เมื่อบันทึก/โหลดข้อมูลไม่สำเร็จ
 * @param {Error} error
 */
function showStorageError(error) {
  console.error('Unable to save submitted data:', error);
  Swal.fire({
    icon: 'error',
    title: 'บันทึกข้อมูลไม่สำเร็จ',
    text: error.message || 'ตรวจสอบการเชื่อมต่อและสิทธิ์การใช้งาน แล้วลองอีกครั้ง',
    confirmButtonText: 'ตกลง',
  });
}

/**
 * อัปเดตส่วนหัว/ชื่อผู้ใช้/ปุ่มออกจากระบบ/ข้อความสถานะตามการล็อกอิน
 * @param {object|null} profile - โปรไฟล์เจ้าหน้าที่ หรือ null
 */
function updateAdminChrome(profile) {
  const isConnected = isSupabaseConfigured();
  const configError = getSupabaseConfigurationError();
  document.querySelector('#prototype-status').textContent = isConnected ? 'เชื่อม Supabase' : 'โหมดตัวอย่าง';
  document.querySelector('#prototype-banner').firstChild.textContent = isConnected
    ? 'ข้อมูลเจ้าหน้าที่บันทึกใน Supabase และจำกัดสิทธิ์ด้วย Row Level Security '
    : 'หน้าระบบเจ้าหน้าที่นี้เป็นตัวอย่าง ไม่มีการยืนยันตัวตนหรือเชื่อมฐานข้อมูลจริง ';
  document.querySelector('#admin-display-name').textContent = profile?.display_name || (demoAdmin ? 'โหมดตัวอย่าง' : 'ยังไม่ได้เข้าสู่ระบบ');
  document.querySelector('#admin-role-label').textContent = profile?.role === 'superadmin'
    ? 'ผู้ดูแลสูงสุด'
    : profile ? 'ผู้ดูแลเมนู' : demoAdmin ? 'ข้อมูลในเบราว์เซอร์นี้' : 'ยังไม่ได้ยืนยันตัวตน';
  document.querySelector('#admin-avatar').textContent = profile?.display_name?.slice(0, 2) || 'จน';
  document.querySelector('#admin-users-nav').hidden = profile?.role !== 'superadmin';
  document.querySelector('#logout-button').hidden = !profile;
  document.querySelector('#preview-admin').hidden = hasSupabaseConfiguration();
  document.querySelector('#login-system-note p').textContent = isConnected
    ? 'เข้าสู่ระบบด้วยอีเมลและรหัสผ่านของ Supabase บัญชีต้องได้รับการเชิญและกำหนดสิทธิ์แล้ว'
    : configError || 'ยังไม่ได้เชื่อม Supabase เพิ่ม URL และ publishable/anon key ใน supabase-config.js ก่อนเข้าสู่ระบบ';
  const requestPrivacyNote = document.querySelector('#request-form .privacy-note');
  if (requestPrivacyNote) {
    requestPrivacyNote.textContent = isConnected
      ? 'ข้อมูลติดต่อใช้เพื่อประสานงานช่วยเหลือเท่านั้น ไม่แสดงบนแผนที่สาธารณะ หากเป็นเหตุฉุกเฉินโทร 1784'
      : 'ต้นแบบนี้ยังไม่ได้เชื่อมฐานข้อมูลกลาง ข้อมูลจะถูกเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น';
  }
  document.querySelector('#public-system-note').textContent = isConnected
    ? 'เชื่อมต่อ Supabase แล้ว · รายงานน้ำท่วมรอตรวจสอบก่อนเผยแพร่'
    : configError || 'ข้อมูลตัวอย่างสำหรับต้นแบบ · ยังไม่ใช่ช่องทางแจ้งเหตุจริง';
  applyModuleAccess();
}

/**
 * เข้าหน้าเจ้าหน้าที่: ดึงโปรไฟล์ โหลดข้อมูล แล้วแสดงแดชบอร์ด (ถ้าไม่มีสิทธิ์จะออกจากระบบและโยน error)
 * @param {object} user - ผู้ใช้จาก Supabase Auth
 */
async function enterAdmin(user) {
  const client = await getSupabaseClient();
  if (!client) throw new Error('Supabase ยังไม่ได้ตั้งค่า');
  try {
    currentProfile = await fetchAdminProfile(user.id);
    demoAdmin = false;
    await refreshRemoteData();
    updateAdminChrome(currentProfile);
    showView('admin');
    await renderPage('dashboard');
  } catch (error) {
    await client.auth.signOut();
    currentProfile = null;
    updateAdminChrome(null);
    throw error;
  }
}

// ── [เหตุการณ์] คลิกทั่วทั้งหน้า: ปักหมุด/แจ้งเหตุ/สลับมุมมอง/ล็อกอิน/ออกจากระบบ/เลือกเมนู ──
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-action="manual-flood-report"]')) {
    openFloodReportDialog({ source: adminApp.hidden ? 'public' : 'admin' });
    return;
  }
  const placePinButton = event.target.closest('[data-action="place-pin"]');
  if (placePinButton) {
    openFloodReportDialog({ source: adminApp.hidden ? 'public' : 'admin' });
    return;
  }
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) {
    event.preventDefault();
    if (viewButton.dataset.view === 'public') resetPublicView();
    showView(viewButton.dataset.view);
    return;
  }
  if (event.target.closest('#open-login')) {
    if (currentProfile) {
      showView('admin');
      void renderPage('dashboard');
      return;
    }
    showView('login');
    return;
  }
  if (event.target.closest('#preview-admin')) {
    void openAdminPreview();
    return;
  }
  if (event.target.closest('#back-to-public') || event.target.closest('#leave-admin')) {
    showView('public');
    return;
  }
  if (event.target.closest('#logout-button')) {
    void (async () => {
      try {
        const client = await getSupabaseClient();
        if (client) {
          const { error } = await client.auth.signOut();
          if (error) throw error;
        }
        currentProfile = null;
        demoAdmin = false;
        updateAdminChrome(null);
        showView('public');
        await refreshPublicViews();
      } catch (error) {
        showStorageError(error);
      }
    })();
    return;
  }
  if (event.target.closest('[data-action="report"]')
    || event.target.closest('[data-action="new-request"]')
    || event.target.closest('#new-request-top')) {
    openRequestDialog();
    return;
  }
  const pageButton = event.target.closest('[data-page]');
  if (pageButton) {
    event.preventDefault();
    void renderPage(pageButton.dataset.page);
    document.querySelector('#sidebar').classList.remove('open');
    document.querySelector('#mobile-menu').setAttribute('aria-expanded', 'false');
  }
});

// ── [เหตุการณ์] ส่งฟอร์มล็อกอินเจ้าหน้าที่ (อีเมล + รหัสผ่านผ่าน Supabase Auth) ──
document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!isSupabaseConfigured()) {
    await Swal.fire({
      icon: 'info',
      title: getSupabaseConfigurationError() ? 'ตั้งค่า Supabase ไม่ถูกต้อง' : 'ยังไม่ได้เชื่อม Supabase',
      text: getSupabaseConfigurationError() || 'ตั้งค่า Project URL และ publishable/anon key ใน supabase-config.js ก่อนเข้าสู่ระบบ',
      confirmButtonText: 'รับทราบ',
    });
    return;
  }
  const formData = new FormData(event.currentTarget);
  try {
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: String(formData.get('email')).trim(),
      password: String(formData.get('password')),
    });
    if (error) throw error;
    if (!data.user) throw new Error('Supabase ไม่ได้ส่งข้อมูลบัญชีผู้ใช้กลับมา');
    await enterAdmin(data.user);
    event.currentTarget.reset();
  } catch (error) {
    showStorageError(error);
  }
});

// ── [เหตุการณ์] คลิกในหน้าเจ้าหน้าที่: ยืนยันรายงานน้ำท่วม / ไปยังรายงานรอตรวจสอบ ──
pageContent.addEventListener('click', (event) => {
  const verifyButton = event.target.closest('[data-action="verify-flood-report"]');
  if (verifyButton) {
    void handleFloodReportVerification(verifyButton.dataset.floodId, refreshFloodViews);
    return;
  }
  if (!event.target.closest('[data-action="show-pending-flood-reports"]')) return;
  const firstPendingRow = pageContent.querySelector('tr[data-flood-verified="false"]');
  if (!firstPendingRow) return;
  firstPendingRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
  firstPendingRow.classList.add('is-highlighted');
  firstPendingRow.querySelector('[data-action="verify-flood-report"]')?.focus({ preventScroll: true });
  window.setTimeout(() => firstPendingRow.classList.remove('is-highlighted'), 1800);
});

// ── [เหตุการณ์] เปิด/ปิดเมนูข้างบนมือถือ ──
document.querySelector('#mobile-menu').addEventListener('click', (event) => {
  const isOpen = document.querySelector('#sidebar').classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(isOpen));
});

document.querySelector('#close-dialog').addEventListener('click', () => requestDialog.close());
document.querySelector('#cancel-dialog').addEventListener('click', () => requestDialog.close());

// ── [เหตุการณ์] ส่งฟอร์มแจ้งเหตุขอความช่วยเหลือจากประชาชน ──
requestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!requestForm.reportValidity()) return;
  const formData = new FormData(requestForm);
  const newRequest = {
    id: makeRequestId(),
    name: String(formData.get('name')).trim(),
    phone: String(formData.get('phone')).trim(),
    location: String(formData.get('location')).trim(),
    need: String(formData.get('need')),
    people: Number(formData.get('people')),
    details: String(formData.get('details')).trim(),
    urgent: formData.get('urgent') === 'on',
    consent: formData.get('consent') === 'on',
    status: 'รอประสานงาน',
    createdAt: new Date().toISOString(),
  };
  try {
    await createRecord('requests', newRequest);
    requestForm.reset();
    requestForm.elements.people.value = '1';
    requestDialog.close();
    if (!adminApp.hidden) {
      if (isSupabaseConfigured()) {
        try {
          await refreshRemoteData();
        } catch (error) {
          console.error('The request was saved but the latest list could not be loaded:', error);
          await Swal.fire({ icon: 'warning', title: 'ส่งข้อมูลแล้ว แต่โหลดรายการล่าสุดไม่สำเร็จ', text: error.message, confirmButtonText: 'รับทราบ' });
          return;
        }
      }
      await renderPage(currentPage);
    }
    showSavedAlert(newRequest.id);
  } catch (error) {
    showStorageError(error);
  }
});

// ── [เหตุการณ์] เปลี่ยนค่า dropdown ในหน้าเจ้าหน้าที่ (สถานะคำร้อง/สถานะน้ำท่วม) ──
pageContent.addEventListener('change', async (event) => {
  const floodSelect = event.target.closest('[data-flood-status-id]');
  if (floodSelect) {
    await handleFloodPinStatusChange(floodSelect, refreshFloodViews);
    return;
  }
  const select = event.target.closest('[data-status-id]');
  if (!select) return;
  const request = requests.find((item) => item.id === select.dataset.statusId);
  if (!request || !canManage('requests')) return;
  const previousStatus = request.status;
  const nextStatus = select.value;
  select.value = previousStatus;
  const result = await Swal.fire({
    icon: 'question',
    title: 'ยืนยันการเปลี่ยนสถานะ?',
    text: `เปลี่ยน ${request.id} จาก “${previousStatus}” เป็น “${nextStatus}”`,
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true,
  });
  if (!result.isConfirmed) return;
  try {
    await updateRecord('requests', request.id, { status: nextStatus });
    await renderPage(currentPage);
    Swal.fire({
      toast: true,
      position: 'top',
      icon: 'success',
      title: `อัปเดต ${request.id} แล้ว`,
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
    });
  } catch (error) {
    showStorageError(error);
  }
});

// ── [เหตุการณ์] พิมพ์ค้นหาในตารางคำร้อง ──
pageContent.addEventListener('input', (event) => {
  if (event.target.id !== 'request-search') return;
  const query = event.target.value.trim().toLowerCase();
  pageContent.querySelectorAll('[data-request-row]').forEach((row) => {
    row.hidden = !row.dataset.search.includes(query);
  });
});

// ── [เริ่มต้น] ตั้งวันที่/เวลาอัปเดต, สร้างกล่องฟอร์มต่าง ๆ, วาดส่วนสาธารณะ แล้วเรียก initializeApp() ──
document.querySelector('#today-date').textContent = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date());
document.querySelector('#updated-time').textContent = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(new Date());
initPublicTabs(() => window.requestAnimationFrame(syncFloodMaps));
mountFloodReportDialog();
bindFloodReportForm(async () => {
  return refreshFloodViews();
}, focusGeoapifyMap);
mountAdminCrudDialog(canManage, afterRecordMutation);
renderPublicSections();
updateAdminChrome(null);

/**
 * จุดเริ่มต้นของแอป: ตรวจค่า Supabase, จำ session เดิมไว้แต่ยังแสดงหน้าสาธารณะก่อน, ฟังเหตุการณ์ออกจากระบบ
 */
async function initializeApp() {
  const configurationError = getSupabaseConfigurationError();
  if (configurationError) {
    syncFloodMaps();
    await Swal.fire({ icon: 'error', title: 'ตั้งค่า Supabase ไม่ถูกต้อง', text: configurationError, confirmButtonText: 'รับทราบ' });
    return;
  }
  if (!hasSupabaseConfiguration()) {
    syncFloodMaps();
    return;
  }
  try {
    const client = await getSupabaseClient();
    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && currentProfile) {
        currentProfile = null;
        updateAdminChrome(null);
        showView('public');
        void refreshPublicViews().catch(showStorageError);
      }
    });
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data.session?.user) {
      try {
        currentProfile = await fetchAdminProfile(data.session.user.id);
        demoAdmin = false;
        updateAdminChrome(currentProfile);
      } catch (profileError) {
        console.error('Stored session has no admin profile:', profileError);
        await client.auth.signOut();
        currentProfile = null;
        updateAdminChrome(null);
      }
    }
    await refreshPublicViews();
  } catch (error) {
    console.error('Unable to initialize Supabase:', error);
    syncFloodMaps();
    await Swal.fire({ icon: 'error', title: 'เชื่อมต่อ Supabase ไม่สำเร็จ', text: error.message, confirmButtonText: 'รับทราบ' });
  }
}

void initializeApp();
