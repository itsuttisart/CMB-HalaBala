/**
 * เมนูของหน้าประชาชน: แต่ละเมนูแสดงเนื้อหาของตัวเองในหน้าเดียวของมัน (ไม่เลื่อนยาวทั้งหน้า)
 * ใช้ hash บน URL เป็นตัวระบุ: #home, #flood-monitor, #public-announcements, #help-centers, #public-report
 */
const VIEW_NAMES = ['home', 'flood-monitor', 'public-announcements', 'help-centers', 'public-report'];

/**
 * แปลง hash ปัจจุบันเป็นชื่อมุมมอง (ไม่รู้จัก = หน้าแรก)
 * @returns {string}
 */
function viewFromHash() {
  const name = window.location.hash.replace(/^#/, '');
  return VIEW_NAMES.includes(name) ? name : 'home';
}

/**
 * แสดงมุมมองที่เลือก ซ่อนอันอื่น และไฮไลต์ลิงก์เมนูที่ตรงกัน
 * @param {string} view
 */
function applyView(view) {
  document.querySelectorAll('[data-public-view]').forEach((section) => {
    section.hidden = section.dataset.publicView !== view;
  });
  document.querySelectorAll('.public-nav a[href^="#"], .public-mobile-nav a[href^="#"]').forEach((link) => {
    const isCurrent = link.getAttribute('href') === `#${view}`;
    if (isCurrent) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

/**
 * เริ่มระบบเมนูหน้าประชาชน (เรียกครั้งเดียวตอนเริ่มแอป)
 * @param {Function} onShow - เรียกหลังสลับมุมมอง (ใช้ซิงก์แผนที่ที่เพิ่งแสดง)
 */
export function initPublicTabs(onShow = () => {}) {
  const sync = (scrollTop) => {
    applyView(viewFromHash());
    if (scrollTop) window.scrollTo({ top: 0, behavior: 'auto' });
    onShow();
  };
  window.addEventListener('hashchange', () => sync(true));
  sync(false);
}

/**
 * กลับไปหน้าแรกของหน้าประชาชน (ล้าง hash)
 */
export function resetPublicView() {
  if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  applyView('home');
}
