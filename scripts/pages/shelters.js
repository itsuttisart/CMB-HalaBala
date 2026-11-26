import { pages } from '../data.js';
import { shelters } from '../store.js';
import { escapeHtml } from '../utils.js';
import { isSupabaseConfigured } from '../supabase-client.js';

/**
 * สร้าง HTML หน้าศูนย์พักพิง (เจ้าหน้าที่)
 */
export function renderShelters() {
  return `
    <div class="page-heading"><div><span class="eyebrow">${pages.shelters.eyebrow}</span><h1>${pages.shelters.title}</h1><p>${pages.shelters.description}</p></div><button class="button button-primary" data-record-action="create" data-collection="shelters">＋ เพิ่มศูนย์พักพิง</button></div>
    <div class="info-banner">${isSupabaseConfigured() ? 'อัปเดตสถานะและความจุให้เป็นปัจจุบัน เฉพาะศูนย์ที่เปิดให้บริการและเผยแพร่จะแสดงต่อประชาชน' : 'ข้อมูลตัวอย่างสำหรับต้นแบบ โปรดยืนยันสถานะและจำนวนที่ว่างกับผู้ดูแลก่อนเดินทาง'}</div>
    <div class="content-grid">${shelters.map((shelter) => `
      <article class="content-card"><span class="card-kicker">${shelter.isActive === false ? 'ปิดให้บริการ' : 'เปิดให้บริการ'} · ${escapeHtml(shelter.location)}</span><h3>${escapeHtml(shelter.name)}</h3><p>${escapeHtml(shelter.facilities)}</p>
        <div class="resource-stat"><strong>${shelter.occupancy}</strong> / ${shelter.capacity} คน <span class="table-secondary">รองรับอยู่</span></div>
        <div class="progress-track"><span style="width:${Math.min(100, Math.round(shelter.occupancy / shelter.capacity * 100))}%"></span></div>
        <div class="record-actions"><button class="button button-outline button-small" data-record-action="edit" data-collection="shelters" data-record-id="${escapeHtml(shelter.id)}">แก้ไข</button><button class="button button-quiet button-small" data-record-action="delete" data-collection="shelters" data-record-id="${escapeHtml(shelter.id)}">ลบ</button></div>
      </article>`).join('')}</div>`;
}

/**
 * สร้าง HTML ศูนย์พักพิงที่เปิดและเผยแพร่แล้ว (หน้าสาธารณะ)
 */
export function renderPublicShelters() {
      const publishedShelters = shelters.filter((shelter) => shelter.isActive !== false && shelter.isPublished !== false);
      return `${publishedShelters.map((shelter) => `
        <article class="public-shelter-card">
          <span class="shelter-status"><i></i>เปิดให้บริการ · ${escapeHtml(shelter.location)}</span>
          <h3>${escapeHtml(shelter.name)}</h3>
          <p>${escapeHtml(shelter.occupancy)} / ${escapeHtml(shelter.capacity)} คน · ${escapeHtml(shelter.facilities)}</p>
        </article>`).join('')}
        <article class="shelter-contact-card"><span class="contact-icon">☎</span><strong>${publishedShelters.length ? 'ต้องการสอบถามก่อนเดินทาง?' : 'ยังไม่มีศูนย์พักพิงที่เผยแพร่'}</strong><p>โทรสายด่วนเพื่อยืนยันสถานะและเส้นทาง</p><a href="tel:1784">โทร 1784 <span>→</span></a></article>`;
}
