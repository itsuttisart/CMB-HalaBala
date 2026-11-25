import { pages } from '../data.js';
import { floodPins, getFloodCounts, requests, shelters, supplies, getVolunteerSummary } from '../store.js';
import { escapeHtml, formatDate, formatTime } from '../utils.js';
import { isSupabaseConfigured } from '../supabase-client.js';

function renderRequestRow(request) {
  const symbol = request.urgent ? '!' : '↗';
  const label = request.urgent ? 'เร่งด่วน' : request.need;
  const statusClass = request.status === 'ช่วยเหลือแล้ว' ? 'status-done' : request.status === 'กำลังดำเนินการ' ? 'status-progress' : '';
  return `
    <div class="request-row">
      <span class="request-symbol ${request.urgent ? '' : 'normal'}">${symbol}</span>
      <div class="request-info">
        <strong>${escapeHtml(label)} · ${escapeHtml(request.location)}</strong>
        <small>${escapeHtml(request.id)} <span class="footer-dot">•</span> ${escapeHtml(request.need)} <span class="footer-dot">•</span> ${escapeHtml(request.people)} คน</small>
      </div>
      <div class="request-meta">
        <span class="status-pill ${statusClass}">${escapeHtml(request.status)}</span>
        <time>${formatTime(request.createdAt)}</time>
      </div>
    </div>`;
}

export function renderDashboard() {
  const volunteerSummary = getVolunteerSummary();
  const urgentCount = requests.filter((request) => request.urgent && request.status !== 'ช่วยเหลือแล้ว').length;
  const activeCount = requests.filter((request) => request.status !== 'ช่วยเหลือแล้ว').length;
  const doneCount = requests.filter((request) => request.status === 'ช่วยเหลือแล้ว').length;
  const latest = [...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  const shelterOccupancy = shelters.reduce((total, shelter) => total + shelter.occupancy, 0);
  const floodCounts = getFloodCounts();
  const highRiskCount = floodCounts['เสี่ยงสูง'] + floodCounts['วิกฤต'];

  return `
    <div class="page-heading">
      <div><span class="eyebrow">${pages.dashboard.eyebrow}</span><h1>${pages.dashboard.title}</h1><p>${pages.dashboard.description}</p></div>
      <span class="heading-date">◷ &nbsp;${formatDate()}</span>
    </div>
    <section class="stats-grid" aria-label="ตัวเลขสถานการณ์">
      <article class="stat-card stat-card-teal"><span class="stat-watermark" aria-hidden="true">✚</span><div class="stat-top"><span>คำร้องทั้งหมด</span><span class="stat-icon teal">✚</span></div><div class="stat-number">${requests.length}</div><div class="stat-foot"><span>รายการ</span><span>ในระบบ</span></div></article>
      <article class="stat-card stat-card-amber"><span class="stat-watermark" aria-hidden="true">◷</span><div class="stat-top"><span>รอดำเนินการ</span><span class="stat-icon amber">◷</span></div><div class="stat-number">${activeCount}</div><div class="stat-foot"><span>ต้องติดตาม</span></div></article>
      <article class="stat-card stat-card-purple"><span class="stat-watermark" aria-hidden="true">!</span><div class="stat-top"><span>เหตุเร่งด่วน</span><span class="stat-icon purple">!</span></div><div class="stat-number">${urgentCount}</div><div class="stat-foot"><span>ต้องประสานโดยเร็ว</span></div></article>
      <article class="stat-card stat-card-blue"><span class="stat-watermark" aria-hidden="true">✓</span><div class="stat-top"><span>ช่วยเหลือแล้ว</span><span class="stat-icon blue">✓</span></div><div class="stat-number">${doneCount}</div><div class="stat-foot"><span>ปิดคำร้องแล้ว</span></div></article>
    </section>
    <section class="dashboard-modules">
      <div class="modules-heading"><div><h2>สรุปเมนูและสถานการณ์ล่าสุด</h2><p>เลือกการ์ดเพื่อไปยังข้อมูลของแต่ละงาน</p></div><span class="module-sync">${isSupabaseConfigured() ? 'อัปเดตจาก Supabase' : 'โหมดตัวอย่างในเบราว์เซอร์'}</span></div>
      <div class="dashboard-module-grid">
        <button class="module-link-card module-flood" data-page="flood-monitor"><span class="module-card-icon">⌖</span><span class="module-card-copy"><strong>Flood Monitor</strong><small>${floodPins.length} จุด · เสี่ยงสูง/วิกฤต ${highRiskCount} จุด</small></span><span class="module-arrow">→</span><span class="module-watermark" aria-hidden="true">⌖</span></button>
        <button class="module-link-card module-amber" data-page="requests"><span class="module-card-icon module-icon-amber">✚</span><span class="module-card-copy"><strong>คำร้องช่วยเหลือ</strong><small>${activeCount} รายการรอดำเนินการ</small></span><span class="module-arrow">→</span><span class="module-watermark" aria-hidden="true">✚</span></button>
        <button class="module-link-card module-blue" data-page="map"><span class="module-card-icon module-icon-blue">⌖</span><span class="module-card-copy"><strong>แผนที่สถานการณ์</strong><small>${floodPins.length} จุดรายงานในแผนที่</small></span><span class="module-arrow">→</span><span class="module-watermark" aria-hidden="true">⌖</span></button>
        <button class="module-link-card module-purple" data-page="shelters"><span class="module-card-icon module-icon-purple">⌂</span><span class="module-card-copy"><strong>ศูนย์พักพิง</strong><small>${shelters.length} ศูนย์ · ${shelterOccupancy} ผู้พักพิง</small></span><span class="module-arrow">→</span><span class="module-watermark" aria-hidden="true">⌂</span></button>
        <button class="module-link-card module-sky" data-page="supplies"><span class="module-card-icon module-icon-blue">▤</span><span class="module-card-copy"><strong>คลังสิ่งของ</strong><small>${supplies.length} รายการสิ่งของ</small></span><span class="module-arrow">→</span><span class="module-watermark" aria-hidden="true">▤</span></button>
        <button class="module-link-card module-green" data-page="volunteers"><span class="module-card-icon">♧</span><span class="module-card-copy"><strong>อาสาสมัครและทีม</strong><small>${volunteerSummary.teams} ทีม · ${volunteerSummary.available} อาสาสมัครพร้อมสนับสนุน</small></span><span class="module-arrow">→</span><span class="module-watermark" aria-hidden="true">♧</span></button>
        <button class="module-link-card module-rose" data-page="announcements"><span class="module-card-icon module-icon-amber">▱</span><span class="module-card-copy"><strong>ข่าวประกาศ</strong><small>ดูประกาศและข้อมูลประชาชน</small></span><span class="module-arrow">→</span><span class="module-watermark" aria-hidden="true">▱</span></button>
      </div>
    </section>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-head"><div><h2 class="panel-title">คำร้องล่าสุด</h2><div class="panel-subtitle">ติดตามคำขอความช่วยเหลือในพื้นที่</div></div><button class="text-button" data-page="requests">ดูคำร้องทั้งหมด →</button></div>
        <div class="request-list">${latest.length ? latest.map(renderRequestRow).join('') : '<div class="empty-state"><strong>ยังไม่มีคำร้อง</strong>คำร้องใหม่จะแสดงที่นี่</div>'}</div>
      </section>
      <div class="side-stack">
        <section class="situation-card">
          <div class="situation-label"><span class="live-dot"></span>สรุปสถานการณ์ <span class="risk-tag">เฝ้าระวัง</span></div>
          <h2>บาเจาะ, นราธิวาส</h2><p>ข้อมูลตัวอย่างสำหรับต้นแบบ · โปรดยืนยันก่อนเผยแพร่</p>
          <div class="geoapify-flood-map geoapify-map-preview" id="dashboard-flood-map" data-flood-map data-map-interactive="false" data-map-zoom="10" aria-label="แผนที่ Geoapify ตัวอย่าง"><div class="geoapify-map-canvas"></div></div>
          <div class="situation-row"><span>จุดเสี่ยงสูง/วิกฤต</span><strong>${highRiskCount} จุด</strong></div>
          <div class="situation-row"><span>คำร้องที่ยังเปิด</span><strong>${activeCount} รายการ</strong></div>
        </section>
        <section class="shelter-card">
          <h2 class="panel-title">ศูนย์พักพิงที่เปิดอยู่</h2>
          ${shelters.slice(0, 2).map((shelter) => `
            <div class="shelter-row"><span class="shelter-dot"></span><span>${escapeHtml(shelter.name)}</span><small>${shelter.occupancy}/${shelter.capacity}</small></div>
            <div class="progress-track"><span style="width:${Math.round(shelter.occupancy / shelter.capacity * 100)}%"></span></div>`).join('')}
          <div class="situation-row"><span>ผู้พักพิงรวม</span><strong>${shelterOccupancy} คน</strong></div>
        </section>
      </div>
    </div>`;
}
