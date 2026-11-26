/**
 * แปลงอักขระพิเศษเป็น HTML entity ป้องกัน XSS (ใช้ทุกครั้งก่อนใส่ข้อความผู้ใช้ลง innerHTML)
 * @param {*} value - ข้อความที่จะแสดง
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

/**
 * แปลงวันเวลา ISO เป็นข้อความภาษาไทยสำหรับแสดงในตาราง
 * @param {string} dateString
 */
export function formatTime(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'ไม่ระบุเวลา';
  return new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(date);
}

/**
 * แปลงวันที่เป็นข้อความภาษาไทย (ค่าเริ่มต้นคือวันนี้)
 * @param {Date} [date]
 */
export function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(date);
}
