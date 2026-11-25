import { FLOOD_STATUSES, pages } from '../data.js';
import { floodPins, getFloodCounts, shelters } from '../store.js';
import { escapeHtml } from '../utils.js';
import { isSupabaseConfigured } from '../supabase-client.js';

function mapMarkup(id, label, interactive = true, zoom = 12) {
  return `<div class="geoapify-flood-map" id="${id}" data-flood-map data-map-interactive="${interactive}" data-map-zoom="${zoom}" aria-label="${label}"><div class="geoapify-map-canvas"></div></div>`;
}

export function renderMap() {
  const counts = getFloodCounts();
  const activeLocations = counts['เฝ้าระวัง'] + counts['เสี่ยงสูง'] + counts['วิกฤต'];
  return `
    <div class="page-heading"><div><span class="eyebrow">${pages.map.eyebrow}</span><h1>${pages.map.title}</h1><p>${pages.map.description}</p></div></div>
    <div class="info-banner">${isSupabaseConfigured() ? 'แผนที่ Geoapify แสดงรายงานที่ผ่านการตรวจสอบแล้ว ข้อมูลศูนย์พักพิงขึ้นกับสิทธิ์บัญชีของคุณ' : 'แผนที่ Geoapify แสดงพิกัดตัวอย่างสำหรับต้นแบบ โปรดยืนยันข้อมูลก่อนใช้งานจริง'}</div>
    <div class="dashboard-grid">
      <section class="panel flood-admin-map-panel"><div class="panel-head"><div><h2 class="panel-title">หมุดสถานการณ์ล่าสุด</h2><div class="panel-subtitle">${floodPins.length} จุด · เสี่ยงสูงหรือวิกฤต ${counts['เสี่ยงสูง'] + counts['วิกฤต']} จุด</div></div><button class="text-button" data-page="flood-monitor">จัดการ Flood Monitor →</button></div>
        ${mapMarkup('situation-map', 'แผนที่สถานการณ์ Geoapify')}
        <div class="flood-map-footer"><div class="flood-legend">${FLOOD_STATUSES.map((status) => `<span class="flood-legend-item"><i class="${status.className}"></i>${status.label}</span>`).join('')}</div><small>แตะแผนที่เพื่อปักหมุดรายงานใหม่</small></div>
      </section>
      <div class="side-stack">
        <section class="situation-card"><div class="situation-label"><span class="live-dot"></span>สถานการณ์ตามหมุด</div><h2>${activeLocations} จุดต้องติดตาม</h2><p>รวมหมุดเฝ้าระวัง เสี่ยงสูง และวิกฤต</p><hr class="situation-rule">${FLOOD_STATUSES.map((status) => `<div class="situation-row"><span><i class="flood-count-dot ${status.className}"></i> ${status.label}</span><strong>${counts[status.label]} จุด</strong></div>`).join('')}<button class="button button-outline button-small" data-page="flood-monitor">ไปที่ Flood Monitor →</button></section>
        <section class="shelter-card"><h2 class="panel-title">ศูนย์ช่วยเหลือ</h2>${shelters.map((shelter) => `<div class="shelter-row"><span class="shelter-dot"></span><span>${escapeHtml(shelter.name)}</span></div>`).join('')}</section>
      </div>
    </div>`;
}
