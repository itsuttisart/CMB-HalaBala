export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function formatTime(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'ไม่ระบุเวลา';
  return new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(date);
}
