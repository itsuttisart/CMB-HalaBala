import { pages } from '../data.js';
import { getVolunteerSummary, volunteers } from '../store.js';
import { escapeHtml } from '../utils.js';
import { isSupabaseConfigured } from '../supabase-client.js';

/**
 * สร้าง HTML หน้าอาสาสมัครและทีม
 */
export function renderVolunteers() {
  const volunteerSummary = getVolunteerSummary();
  return `
    <div class="page-heading"><div><span class="eyebrow">${pages.volunteers.eyebrow}</span><h1>${pages.volunteers.title}</h1><p>${pages.volunteers.description}</p></div><button class="button button-primary" data-record-action="create" data-collection="volunteers">＋ เพิ่มทีม</button></div>
    <div class="info-banner">${isSupabaseConfigured() ? 'ข้อมูลทีมและอุปกรณ์เห็นได้เฉพาะผู้ดูแลเมนูอาสาสมัครที่ได้รับสิทธิ์' : 'รายชื่อทีมเป็นข้อมูลจำลอง โปรดตรวจสอบการมอบหมายและความพร้อมกับผู้ประสานงาน'}</div>
    <div class="stats-grid">
      <article class="stat-card"><div class="stat-top"><span>ทีมปฏิบัติงาน</span><span class="stat-icon teal">♧</span></div><div class="stat-number">${volunteerSummary.teams}</div><div class="stat-foot">ข้อมูลตัวอย่าง</div></article>
      <article class="stat-card"><div class="stat-top"><span>อาสาสมัครพร้อม</span><span class="stat-icon blue">✓</span></div><div class="stat-number">${volunteerSummary.available}</div><div class="stat-foot">จำนวนสมาชิกของทีมพร้อมสนับสนุน</div></article>
    </div>
    <div class="content-grid">
      ${volunteers.length ? volunteers.map((team) => `<article class="content-card"><span class="card-kicker">${escapeHtml(team.status)}</span><h3>${escapeHtml(team.name)}</h3><p>ภารกิจ: ${escapeHtml(team.mission || 'ยังไม่ได้ระบุ')}</p><div class="resource-stat"><strong>${escapeHtml(team.headcount)}</strong> คน · ${escapeHtml(team.equipment || 'ไม่ระบุอุปกรณ์')}</div><div class="record-actions"><button class="button button-outline button-small" data-record-action="edit" data-collection="volunteers" data-record-id="${escapeHtml(team.id)}">แก้ไข</button><button class="button button-quiet button-small" data-record-action="delete" data-collection="volunteers" data-record-id="${escapeHtml(team.id)}">ลบ</button></div></article>`).join('') : '<div class="empty-state"><strong>ยังไม่มีทีมอาสาสมัคร</strong>กด “เพิ่มทีม” เพื่อบันทึกข้อมูล</div>'}
    </div>`;
}
