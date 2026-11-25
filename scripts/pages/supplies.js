import { pages } from '../data.js';
import { supplies } from '../store.js';
import { escapeHtml } from '../utils.js';
import { isSupabaseConfigured } from '../supabase-client.js';

export function renderSupplies() {
  return `
    <div class="page-heading"><div><span class="eyebrow">${pages.supplies.eyebrow}</span><h1>${pages.supplies.title}</h1><p>${pages.supplies.description}</p></div><button class="button button-primary" data-record-action="create" data-collection="supplies">＋ เพิ่มสิ่งของ</button></div>
    <div class="info-banner">${isSupabaseConfigured() ? 'ข้อมูลคลังสิ่งของแสดงเฉพาะเจ้าหน้าที่ที่ได้รับสิทธิ์จัดการคลัง' : 'ยอดคงเหลือตัวอย่างเท่านั้น ยังไม่มีการบันทึกรับเข้า–จ่ายออกจริง'}</div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>รายการ</th><th>หมวดหมู่</th><th>คงเหลือ</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>${supplies.length ? supplies.map((item) => `<tr><td data-label="รายการ" class="table-primary">${escapeHtml(item.name)}</td><td data-label="หมวดหมู่">${escapeHtml(item.category)}</td><td data-label="คงเหลือ">${escapeHtml(item.amount)} ${escapeHtml(item.unit)}</td><td data-label="สถานะ"><span class="status-pill ${item.status === 'พร้อมจ่าย' ? 'status-done' : ''}">${escapeHtml(item.status)}</span></td><td data-label="จัดการ"><div class="record-actions"><button class="button button-outline button-small" data-record-action="edit" data-collection="supplies" data-record-id="${escapeHtml(item.id)}">แก้ไข</button><button class="button button-quiet button-small" data-record-action="delete" data-collection="supplies" data-record-id="${escapeHtml(item.id)}">ลบ</button></div></td></tr>`).join('') : '<tr><td colspan="5"><div class="empty-state"><strong>ยังไม่มีรายการสิ่งของ</strong>กด “เพิ่มสิ่งของ” เพื่อบันทึกข้อมูลคลัง</div></td></tr>'}</tbody></table></div>`;
}
