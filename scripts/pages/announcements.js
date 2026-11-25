import { pages } from '../data.js';
import { announcements } from '../store.js';
import { escapeHtml } from '../utils.js';
import { isSupabaseConfigured } from '../supabase-client.js';

export function renderAnnouncements() {
  return `
    <div class="page-heading"><div><span class="eyebrow">${pages.announcements.eyebrow}</span><h1>${pages.announcements.title}</h1><p>${pages.announcements.description}</p></div><button class="button button-primary" data-record-action="create" data-collection="announcements">＋ เพิ่มประกาศ</button></div>
    <div class="info-banner">${isSupabaseConfigured() ? 'ประกาศที่เผยแพร่จะแสดงให้ประชาชนเห็น ตรวจสอบความถูกต้องและวันหมดอายุก่อนเผยแพร่' : 'ประกาศด้านล่างเป็นข้อความตัวอย่าง ไม่ใช่ข้อมูลเตือนภัยจริง กรุณาติดตามประกาศจากหน่วยงานราชการ'}</div>
    <div class="content-grid">${announcements.length ? announcements.map((notice) => `<article class="content-card"><span class="card-kicker">${escapeHtml(notice.tag)} <span class="footer-dot">•</span> ${notice.isPublished ? 'เผยแพร่' : 'ฉบับร่าง'}</span><h3>${escapeHtml(notice.title)}</h3><p>${escapeHtml(notice.details)}</p><div class="record-actions"><button class="button button-outline button-small" data-record-action="edit" data-collection="announcements" data-record-id="${escapeHtml(notice.id)}">แก้ไข</button><button class="button button-quiet button-small" data-record-action="delete" data-collection="announcements" data-record-id="${escapeHtml(notice.id)}">ลบ</button></div></article>`).join('') : '<div class="empty-state"><strong>ยังไม่มีประกาศ</strong>กด “เพิ่มประกาศ” เพื่อเผยแพร่ข้อมูล</div>'}</div>`;
}

export function renderPublicAnnouncements() {
  const published = announcements.filter((notice) => notice.isPublished);
  return `
    <section class="help-centers public-announcements" id="public-announcements">
      <div class="section-heading"><span class="section-kicker">ประกาศจากศูนย์ประสานงาน</span><h2><span class="section-heading-icon announcements-section-icon" aria-hidden="true">▤</span>ข่าวสารและคำแนะนำ</h2><p>ติดตามข้อมูลที่เผยแพร่โดยผู้ดูแลระบบ</p></div>
      <div class="content-grid">${published.length ? published.map((notice) => `<article class="content-card"><span class="card-kicker">${escapeHtml(notice.tag)}</span><h3>${escapeHtml(notice.title)}</h3><p>${escapeHtml(notice.details)}</p></article>`).join('') : '<div class="empty-state"><strong>ยังไม่มีประกาศ</strong>โปรดติดตามข้อมูลจากหน่วยงานท้องถิ่น</div>'}</div>
    </section>`;
}
