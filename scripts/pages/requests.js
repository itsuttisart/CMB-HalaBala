import { pages } from '../data.js';
import { requests } from '../store.js';
import { escapeHtml, formatTime } from '../utils.js';
import { isSupabaseConfigured } from '../supabase-client.js';

function statusOptions(current) {
  return ['รอประสานงาน', 'กำลังดำเนินการ', 'ช่วยเหลือแล้ว']
    .map((status) => `<option ${status === current ? 'selected' : ''}>${status}</option>`)
    .join('');
}

export function renderRequests() {
  const rows = [...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return `
    <div class="page-heading"><div><span class="eyebrow">${pages.requests.eyebrow}</span><h1>${pages.requests.title}</h1><p>${pages.requests.description}</p></div><button class="button button-primary" data-action="new-request">＋ แจ้งเหตุใหม่</button></div>
    <div class="info-banner">${isSupabaseConfigured() ? 'คำร้องที่มีข้อมูลติดต่อจะเห็นได้เฉพาะเจ้าหน้าที่ที่ได้รับสิทธิ์ โปรดจัดการข้อมูลส่วนบุคคลตามนโยบายหน่วยงาน' : 'โหมดตัวอย่างเก็บข้อมูลในเบราว์เซอร์นี้เท่านั้น กรุณาติดต่อผู้ประสานงานจริงสำหรับการช่วยเหลือเร่งด่วน'}</div>
    <div class="table-toolbar"><div class="search-box">⌕ <input id="request-search" type="search" placeholder="ค้นหาพื้นที่หรือหมายเลขคำร้อง" aria-label="ค้นหาคำร้อง" /></div><span class="panel-subtitle">${rows.length} รายการ</span></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>หมายเลข / พื้นที่</th><th>ความช่วยเหลือ</th><th>ผู้ประสบภัย</th><th>เวลาแจ้ง</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody id="request-table-body">${rows.length ? rows.map((request) => `
      <tr data-request-row data-search="${escapeHtml(`${request.id} ${request.location} ${request.need}`.toLowerCase())}">
        <td data-label="หมายเลข / พื้นที่"><div class="table-primary">${escapeHtml(request.id)} ${request.urgent ? '<span class="risk-tag">เร่งด่วน</span>' : ''}</div><div class="table-secondary">${escapeHtml(request.location)}</div></td>
        <td data-label="ความช่วยเหลือ">${escapeHtml(request.need)}</td><td data-label="ผู้ประสบภัย">${escapeHtml(request.people)} คน</td><td data-label="เวลาแจ้ง">${formatTime(request.createdAt)}</td>
        <td data-label="สถานะ"><select aria-label="เปลี่ยนสถานะ ${escapeHtml(request.id)}" data-status-id="${escapeHtml(request.id)}">${statusOptions(request.status)}</select></td>
        <td data-label="จัดการ"><div class="record-actions"><button class="button button-outline button-small" data-record-action="edit" data-collection="requests" data-record-id="${escapeHtml(request.id)}">แก้ไข</button><button class="button button-quiet button-small" data-record-action="delete" data-collection="requests" data-record-id="${escapeHtml(request.id)}">ลบ</button></div></td>
      </tr>`).join('') : '<tr><td colspan="6"><div class="empty-state"><strong>ยังไม่มีคำร้อง</strong>กด “แจ้งเหตุใหม่” เพื่อบันทึกคำร้อง</div></td></tr>'}</tbody></table></div>`;
}
