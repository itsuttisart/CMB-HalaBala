import { announcements, floodPins, getFloodStatus, getPublicSummary } from '../store.js';
import { escapeHtml } from '../utils.js';
import { isSupabaseConfigured } from '../supabase-client.js';

/**
 * สร้าง HTML การ์ดสรุปตัวเลขบนหน้าหลักประชาชน
 * แยกกลุ่มชัดเจน: สรุปการรับเคส · สรุปอาสาสมัคร · สรุปคลังอุปกรณ์
 * การ์ดมีพื้นหลังสีและลายน้ำ
 */
export function renderPublicSummary() {
  const summary = getPublicSummary();
  const show = (value) => (summary ? Number(value).toLocaleString('th-TH') : '—');

  const caseCards = [
    { tone: 'green', icon: '✚', label: 'เคสที่รับทั้งหมด', value: summary?.requestsTotal, foot: 'คำร้องขอความช่วยเหลือ' },
    { tone: 'orange', icon: '◔', label: 'รอดำเนินการ', value: summary?.pending, foot: 'รอทีมประสานงาน' },
    { tone: 'blue', icon: '➜', label: 'กำลังดำเนินการ', value: summary?.inProgress, foot: 'ทีมกำลังช่วยเหลือ' },
    { tone: 'teal', icon: '✓', label: 'ช่วยเหลือแล้ว', value: summary?.done, foot: 'ดำเนินการเสร็จสิ้น' },
  ];

  const volunteerCards = [
    { tone: 'violet', icon: '♧', label: 'อาสาสมัครทั้งหมด', value: summary?.volunteersTotal, foot: 'จำนวนคน' },
    { tone: 'indigo', icon: '⬡', label: 'ทีมอาสา', value: summary?.volunteerTeams, foot: 'ทีมที่พร้อมปฏิบัติงาน' },
  ];

  const supplyCards = [
    { tone: 'sand', icon: '▤', label: 'อุปกรณ์และสิ่งของ', value: summary?.supplyItems, foot: 'รายการในคลัง' },
  ];

  const cardHtml = (card) => `
    <article class="summary-card summary-${card.tone}">
      <span class="summary-watermark" aria-hidden="true">${card.icon}</span>
      <span class="summary-icon" aria-hidden="true">${card.icon}</span>
      <span class="summary-label">${card.label}</span>
      <strong class="summary-number">${show(card.value)}</strong>
      <small>${escapeHtml(card.foot)}</small>
    </article>`;

  return `
    <section class="public-summary" aria-label="สรุปสถานการณ์">
      <div class="public-summary-head">
        <div>
          <span class="section-kicker">ภาพรวมการช่วยเหลือ</span>
          <h2>สรุปสถานการณ์ล่าสุด</h2>
        </div>
        <small>${summary ? 'ข้อมูลจากศูนย์ประสานงาน' : 'ยังโหลดตัวเลขสรุปไม่ได้'}</small>
      </div>

      <div class="summary-group">
        <div class="summary-group-head">
          <span class="summary-group-icon summary-group-cases" aria-hidden="true">✚</span>
          <div>
            <h3 class="summary-group-title">สรุปการรับเคส</h3>
            <p class="summary-group-desc">คำร้องขอความช่วยเหลือและสถานะการดำเนินงาน</p>
          </div>
        </div>
        <div class="public-summary-grid summary-grid-cases">
          ${caseCards.map(cardHtml).join('')}
        </div>
      </div>

      <div class="summary-group">
        <div class="summary-group-head">
          <span class="summary-group-icon summary-group-volunteers" aria-hidden="true">♧</span>
          <div>
            <h3 class="summary-group-title">สรุปอาสาสมัคร</h3>
            <p class="summary-group-desc">กำลังคนและทีมที่พร้อมช่วยเหลือ</p>
          </div>
        </div>
        <div class="public-summary-grid summary-grid-volunteers">
          ${volunteerCards.map(cardHtml).join('')}
        </div>
      </div>

      <div class="summary-group">
        <div class="summary-group-head">
          <span class="summary-group-icon summary-group-supplies" aria-hidden="true">▤</span>
          <div>
            <h3 class="summary-group-title">สรุปคลังอุปกรณ์</h3>
            <p class="summary-group-desc">สิ่งของและอุปกรณ์ที่พร้อมแจกจ่าย</p>
          </div>
        </div>
        <div class="public-summary-grid summary-grid-supplies">
          ${supplyCards.map(cardHtml).join('')}
        </div>
      </div>
    </section>`;
}

/**
 * ตรวจว่าประกาศยังไม่หมดอายุ
 */
function isActiveNotice(notice) {
  return !notice.expiresAt || new Date(notice.expiresAt).getTime() > Date.now();
}

/**
 * สร้าง HTML ส่วนแจ้งเตือนบนหน้าหลัก: แถบเตือนพื้นที่เสี่ยง + ประกาศล่าสุด 3 รายการ
 */
export function renderPublicAlerts() {
  const published = announcements.filter((notice) => notice.isPublished && isActiveNotice(notice)).slice(0, 3);
  const visiblePins = isSupabaseConfigured() ? floodPins.filter((pin) => pin.verified) : floodPins;
  const critical = visiblePins.filter((pin) => getFloodStatus(pin.status).label === 'วิกฤต').length;
  const high = visiblePins.filter((pin) => getFloodStatus(pin.status).label === 'เสี่ยงสูง').length;
  const banner = critical || high
    ? `<a class="alert-banner" href="#flood-monitor"><span class="alert-banner-icon" aria-hidden="true">!</span><span><strong>แจ้งเตือนพื้นที่น้ำท่วม</strong><small>${critical ? `ระดับวิกฤต ${critical} จุด` : ''}${critical && high ? ' · ' : ''}${high ? `เสี่ยงสูง ${high} จุด` : ''}</small></span><b>ดูแผนที่ →</b></a>`
    : '';
  if (!banner && !published.length) return '';
  return `
    <section class="public-alerts" aria-label="แจ้งเตือนและประกาศ">
      <div class="public-summary-head"><div><span class="section-kicker">แจ้งเตือน</span><h2>ประกาศและข่าวล่าสุด</h2></div><a href="#public-announcements">ดูทั้งหมด →</a></div>
      ${banner}
      ${published.length ? `<div class="alert-grid">${published.map((notice) => `
        <article class="alert-card"><span class="card-kicker">${escapeHtml(notice.tag)}</span><h3>${escapeHtml(notice.title)}</h3><p>${escapeHtml(notice.details)}</p></article>`).join('')}</div>` : ''}
    </section>`;
}
