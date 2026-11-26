import { FLOOD_STATUSES, pages } from '../data.js';
import { createRecord, floodPins, getFloodCounts, getFloodStatus, updateRecord } from '../store.js';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase-client.js';
import { escapeHtml, formatTime } from '../utils.js';

const FLOOD_MEDIA_BUCKET = 'flood-report-media';
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']);
const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
};
const EXTENSION_BY_MIME = Object.fromEntries(Object.entries(MIME_BY_EXTENSION).map(([extension, mimeType]) => [mimeType, extension]));
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const pinDialogMarkup = `
  <dialog class="request-dialog pin-dialog" id="flood-report-dialog" aria-labelledby="flood-report-title">
    <form class="request-form-dialog" id="flood-report-form">
      <div class="dialog-heading">
        <div><span class="section-kicker">FLOOD MONITOR</span><h2 id="flood-report-title">บันทึกข้อมูลพื้นที่</h2><p>ระบุตำแหน่งด้วย GPS ค้นหาที่อยู่ หรือกรอกพิกัด</p></div>
        <button class="icon-button" type="button" data-close-flood-dialog aria-label="ปิดแบบฟอร์ม">×</button>
      </div>
      <section class="coordinate-fields" aria-label="พิกัดพื้นที่">
        <strong>⌖ ตำแหน่งรายงาน</strong>
        <div class="form-grid">
          <label>ละติจูด (Latitude) <span class="required">*</span><input name="latitude" type="number" inputmode="decimal" min="-90" max="90" step="any" required placeholder="เช่น 6.123456" /></label>
          <label>ลองจิจูด (Longitude) <span class="required">*</span><input name="longitude" type="number" inputmode="decimal" min="-180" max="180" step="any" required placeholder="เช่น 101.123456" /></label>
        </div>
        <button class="button button-outline button-small geoapify-location-button" type="button" data-current-location>⌖ ใช้ตำแหน่งปัจจุบันของฉัน</button>
        <div class="geoapify-search-row">
          <label>ค้นหาที่อยู่หรือสถานที่<input name="locationSearch" maxlength="250" placeholder="เช่น หมู่บ้าน ตำบล อำเภอ จังหวัด" /></label>
          <button class="button button-outline button-small" type="button" data-geocode-location>ค้นหาพิกัด</button>
        </div>
        <small>ไม่จำเป็นต้องแตะแผนที่ · ใช้ GPS ค้นหาที่อยู่ หรือกรอกพิกัดเองได้ · GPS ต้องใช้ HTTPS และได้รับอนุญาต Location</small>
      </section>
      <div class="form-grid flood-location-fields">
        <label>หมู่บ้าน <span class="required">*</span><input name="village" required maxlength="100" placeholder="ชื่อหมู่บ้าน / ชุมชน" /></label>
        <label>หมู่ที่<input name="moo" inputmode="numeric" maxlength="10" placeholder="เช่น 4" /></label>
        <label>ตำบล <span class="required">*</span><input name="subdistrict" required maxlength="100" placeholder="ชื่อตำบล" /></label>
        <label>อำเภอ <span class="required">*</span><input name="district" required maxlength="100" placeholder="ชื่ออำเภอ" /></label>
        <label class="form-wide">สถานการณ์ที่พบ <span class="required">*</span>
          <select name="status" required>
            <option value="ปกติ">🟢 0: ปกติ</option>
            <option value="เฝ้าระวัง">🔵 1: เฝ้าระวัง</option>
            <option value="เสี่ยงสูง">🟡 2: เสี่ยงสูง</option>
            <option value="วิกฤต">🔴 3: วิกฤต</option>
          </select>
        </label>
        <label>ระดับน้ำโดยประมาณ
          <select name="waterLevel"><option value="">ไม่ทราบ</option><option>ต่ำกว่าตาตุ่ม</option><option>ระดับตาตุ่ม–เข่า</option><option>ระดับเข่า–เอว</option><option>สูงกว่าระดับเอว</option></select>
        </label>
        <label class="form-wide">รายละเอียดสถานการณ์<textarea name="details" maxlength="1000" rows="3" placeholder="รายละเอียดน้ำท่วม สภาพเส้นทาง หรือสิ่งที่ควรระวัง"></textarea></label>
      </div>
      <section class="flood-media-fields" aria-label="สื่อประกอบ">
        <strong>▧ สื่อประกอบ (ไม่บังคับ)</strong>
        <label>แนบรูปภาพ<input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" data-file-name="image-file-name" /><small>JPG, PNG, WebP, GIF หรือ HEIC · ไม่เกิน 10 MB</small></label>
        <label>หรือ URL รูปภาพ<input name="imageUrl" type="url" placeholder="https://..." /></label>
        <label>แนบวิดีโอ<input name="videoFile" type="file" accept="video/mp4,video/quicktime,video/webm,video/x-msvideo" data-file-name="video-file-name" /><small>MP4, MOV, WebM หรือ AVI · ไม่เกิน 50 MB</small></label>
        <label>หรือ URL วิดีโอ<input name="videoUrl" type="url" placeholder="URL วิดีโอหรือ YouTube" /></label>
        <p id="image-file-name" class="selected-file-name" aria-live="polite">ยังไม่ได้เลือกรูปภาพ</p>
        <p id="video-file-name" class="selected-file-name" aria-live="polite">ยังไม่ได้เลือกวิดีโอ</p>
        <small class="flood-media-warning">${isSupabaseConfigured() ? 'ไฟล์จะอัปโหลดเข้า Supabase Storage และแสดงพร้อมรายงานหลังเจ้าหน้าที่ตรวจสอบ ผู้ที่มีลิงก์ตรงสามารถเข้าถึงไฟล์ได้' : 'การอัปโหลดไฟล์ต้องเชื่อมต่อ Supabase และสร้าง Storage bucket ก่อน'}</small>
      </section>
      <p class="upload-status" id="flood-upload-status" role="status" aria-live="polite" hidden></p>
      <p class="privacy-note">${isSupabaseConfigured() ? 'รายงานจะบันทึกใน Supabase และแสดงต่อสาธารณะหลังเจ้าหน้าที่ตรวจสอบ ระบบจะขอตำแหน่งเมื่อคุณกดปุ่มเท่านั้นและไม่ติดตามต่อเนื่อง' : 'ข้อมูลต้นแบบบันทึกไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น ระบบจะขอตำแหน่งเมื่อคุณกดปุ่มเท่านั้นและไม่ติดตามต่อเนื่อง รายงานจากประชาชนจะแสดงเป็น “รอตรวจสอบ”'}</p>
      <div class="dialog-actions">
        <button class="button button-quiet" type="button" data-close-flood-dialog>ยกเลิก</button>
        <button class="button button-primary button-large" type="submit">▣ บันทึกสถานการณ์</button>
      </div>
    </form>
  </dialog>`;

let pinDialog;
let pinForm;
let locationRequestId = 0;
let reportSubmissionPending = false;
const currentLocationButtonLabel = '⌖ ใช้ตำแหน่งปัจจุบันของฉัน';

/**
 * แสดง popup ภายในกล่องรายงานน้ำท่วม (ให้ popup อยู่เหนือ dialog)
 */
function showFloodFormAlert(options) {
  return Swal.fire({ target: pinDialog, ...options });
}

/**
 * สร้างกล่องแผนที่ของหน้าน้ำท่วม (id = public-flood-map หรือ admin-flood-map)
 */
function mapMarkup(id, label) {
  const publicMap = id === 'public-flood-map';
  return `<div class="geoapify-flood-map" id="${id}" data-flood-map data-map-public="${publicMap}" data-map-interactive="true" data-map-zoom="12" aria-label="${label}"><div class="geoapify-map-canvas"></div></div>`;
}

/**
 * สร้าง HTML คำอธิบายสีของสถานะน้ำท่วม
 */
function floodLegend() {
  return FLOOD_STATUSES.map((status) => `<span class="flood-legend-item"><i class="${status.className}"></i>${status.label}</span>`).join('');
}

/**
 * ตรวจลิงก์รูป/วิดีโอให้ปลอดภัย (http/https หรือ path ใน storage) คืน "" ถ้าไม่ปลอดภัย
 */
function safeMediaUrl(value) {
  const mediaValue = String(value || '').trim();
  try {
    const url = new URL(mediaValue);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    if (!/^reports\/[A-Za-z0-9._/-]+$/.test(mediaValue)
      || mediaValue.split('/').some((part) => !part || part === '.' || part === '..')) return '';
    try {
      const projectUrl = new URL(window.CMB_SUPABASE_CONFIG?.url);
      if (projectUrl.protocol !== 'https:' || !projectUrl.hostname.endsWith('.supabase.co')) return '';
      const encodedPath = mediaValue.split('/').map(encodeURIComponent).join('/');
      return new URL(`/storage/v1/object/public/${FLOOD_MEDIA_BUCKET}/${encodedPath}`, projectUrl).href;
    } catch {
      return '';
    }
  }
}

/**
 * ตรวจชนิดและขนาดไฟล์รูป/วิดีโอที่เลือก และแสดงชื่อไฟล์
 * @param {HTMLInputElement} input
 */
function validateMediaInput(input) {
  input.setCustomValidity('');
  const file = input.files?.[0];
  const output = document.getElementById(input.dataset.fileName);
  if (!file) {
    output.textContent = input.name === 'imageFile' ? 'ยังไม่ได้เลือกรูปภาพ' : 'ยังไม่ได้เลือกวิดีโอ';
    return true;
  }

  const isImage = input.name === 'imageFile';
  const allowedTypes = isImage ? IMAGE_TYPES : VIDEO_TYPES;
  const extension = file.name.split('.').pop().toLowerCase();
  const mimeType = allowedTypes.has(file.type) ? file.type : MIME_BY_EXTENSION[extension];
  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  let error = '';
  if (!allowedTypes.has(mimeType)) error = isImage ? 'ชนิดรูปภาพนี้ไม่รองรับ' : 'ชนิดวิดีโอนี้ไม่รองรับ';
  else if (file.size > maxBytes) error = `ไฟล์มีขนาดเกิน ${maxBytes / 1024 / 1024} MB`;

  input.setCustomValidity(error);
  output.textContent = error
    ? error
    : `พร้อมแนบ: ${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  return !error;
}

/**
 * อัปโหลดรูป/วิดีโอรายงานไป Supabase Storage
 * @param {File} file
 * @param {string} reportId
 * @param {"image"|"video"} kind
 * @returns {Promise<string>} path ของไฟล์ใน storage
 */
async function uploadFloodMedia(file, reportId, kind) {
  const isImage = kind === 'image';
  const allowedTypes = isImage ? IMAGE_TYPES : VIDEO_TYPES;
  const extension = file.name.split('.').pop().toLowerCase();
  const mimeType = allowedTypes.has(file.type) ? file.type : MIME_BY_EXTENSION[extension];
  if (!allowedTypes.has(mimeType)) throw new Error('ชนิดไฟล์นี้ไม่รองรับ');

  const client = await getSupabaseClient();
  if (!client) throw new Error('การแนบไฟล์ต้องเชื่อมต่อ Supabase ก่อน');
  const uniqueId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const path = `reports/${reportId}/${kind}-${uniqueId}.${EXTENSION_BY_MIME[mimeType]}`;
  const storage = client.storage.from(FLOOD_MEDIA_BUCKET);
  const { error } = await storage.upload(path, file, {
    cacheControl: '3600',
    contentType: mimeType,
    upsert: false,
  });
  if (error) {
    const message = /bucket not found/i.test(error.message || '')
      ? 'ยังไม่พบ Storage bucket กรุณาตั้งค่า flood-report-media ใน Supabase ก่อน'
      : /row-level security|permission denied/i.test(error.message || '')
        ? 'Supabase Storage ยังไม่ได้กำหนดสิทธิ์อัปโหลด กรุณารัน migration สำหรับไฟล์แนบ'
        : error.message || 'โปรดลองอีกครั้ง';
    throw new Error(`อัปโหลด${isImage ? 'รูปภาพ' : 'วิดีโอ'}ไม่สำเร็จ: ${message}`);
  }
  return path;
}

/**
 * ลบไฟล์ที่อัปโหลดแล้วแต่บันทึกรายงานไม่สำเร็จ
 * @param {string[]} paths
 */
async function removeUnlinkedFloodMedia(paths) {
  if (!paths.length) return;
  const client = await getSupabaseClient();
  if (!client) throw new Error('Supabase Storage ไม่พร้อมใช้งาน');
  const { error } = await client.storage.from(FLOOD_MEDIA_BUCKET).remove(paths);
  if (error) throw error;
}

/**
 * สร้าง HTML แถวรายงานในตารางสาธารณะ
 */
function publicReportRow(pin) {
  const status = getFloodStatus(pin.status);
  const location = [pin.village || pin.area, pin.moo ? `หมู่ ${pin.moo}` : '', pin.subdistrict ? `ต.${pin.subdistrict}` : '', pin.district ? `อ.${pin.district}` : ''].filter(Boolean).join(' · ');
  const mediaLinks = [
    safeMediaUrl(pin.imageUrl) ? `<a href="${escapeHtml(safeMediaUrl(pin.imageUrl))}" target="_blank" rel="noopener noreferrer">เปิดรูปภาพ</a>` : '',
    safeMediaUrl(pin.videoUrl) ? `<a href="${escapeHtml(safeMediaUrl(pin.videoUrl))}" target="_blank" rel="noopener noreferrer">เปิดวิดีโอ</a>` : '',
  ].filter(Boolean).join(' · ');
  const fileNames = [pin.imageName, pin.videoName].filter(Boolean).map(escapeHtml).join(' · ');
  return `
    <article class="flood-report-row">
      <strong>${escapeHtml(location)}</strong>
      <span>${status.label} · ${escapeHtml(pin.waterLevel || 'ไม่ทราบระดับน้ำ')} · ${pin.verified ? 'เจ้าหน้าที่ตรวจสอบแล้ว' : 'รายงานประชาชน · รอตรวจสอบ'}</span>
      <small>${escapeHtml(pin.details || 'ไม่มีรายละเอียดเพิ่มเติม')} · ${formatTime(pin.createdAt)}</small>
      ${mediaLinks ? `<span class="flood-media-links">${mediaLinks}</span>` : ''}
      ${fileNames ? `<small>ไฟล์แนบ: ${fileNames}</small>` : ''}
    </article>`;
}

/**
 * สร้าง HTML ส่วนอัปเดตสถานการณ์น้ำท่วมของหน้าสาธารณะ (แผนที่ + รายงานที่ยืนยันแล้ว)
 */
export function renderPublicFloodMonitor() {
  const publicPins = isSupabaseConfigured() ? floodPins.filter((pin) => pin.verified) : floodPins;
  const counts = Object.fromEntries(FLOOD_STATUSES.map((status) => [
    status.label,
    publicPins.filter((pin) => pin.status === status.label).length,
  ]));
  const reports = FLOOD_STATUSES.map((status) => {
    const statusPins = publicPins.filter((pin) => pin.status === status.label)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);
    return `
      <section class="flood-status-group ${status.className}">
        <div class="flood-status-heading"><strong>${status.label}</strong><span>${counts[status.label]} จุด</span></div>
        ${statusPins.length ? `<div class="flood-report-list">${statusPins.map(publicReportRow).join('')}</div>` : '<div class="flood-empty-row">ยังไม่มีรายงานในสถานะนี้</div>'}
      </section>`;
  }).join('');

  return `
    <section class="public-flood-monitor" id="flood-monitor">
      <div class="section-heading section-heading-row">
        <div><span class="section-kicker">FLOOD MONITOR</span><h2><span class="section-heading-icon flood-section-icon" aria-hidden="true">⌖</span>ติดตามสถานการณ์น้ำท่วม</h2><p>ปักหมุดด้วย GPS ค้นหาที่อยู่ กรอกพิกัด หรือแตะแผนที่ (ทางเลือก)</p></div>
        <button class="button button-primary button-pin" data-action="place-pin">＋ ปักหมุดสถานการณ์</button>
      </div>
      <div class="flood-monitor-card">
        <div class="flood-map-heading"><strong>แผนที่รายงานสถานการณ์</strong><span class="map-demo-tag">${isSupabaseConfigured() ? 'ข้อมูลจากฐานข้อมูล' : 'ข้อมูลตัวอย่าง · ตรวจสอบก่อนใช้งาน'}</span></div>
        ${mapMarkup('public-flood-map', 'แผนที่ Geoapify สำหรับดูสถานการณ์และเลือกพิกัดเพิ่มเติม (ไม่บังคับ)')}
        <div class="flood-map-footer"><div class="flood-legend">${floodLegend()}</div><small>🔴 วิกฤต (กะพริบเร็ว) · 🟡 เสี่ยงสูง · 🔵 เฝ้าระวัง · 🟢 ปกติ (กะพริบช้า) · หมุดจากประชาชนรอตรวจสอบ</small></div>
        <div class="flood-public-summary">${FLOOD_STATUSES.map((status) => `
          <div class="flood-count-card ${status.className}"><span class="flood-count-dot"></span><span>${status.label}</span><strong>${counts[status.label]}</strong></div>`).join('')}
        </div>
        <div class="flood-public-reports">${reports}</div>
      </div>
    </section>`;
}

/**
 * สร้างตัวเลือกสถานะน้ำท่วม (<option>) โดยเลือกสถานะปัจจุบัน
 */
function statusOptions(current) {
  return FLOOD_STATUSES.map((status) => `<option ${current === status.label ? 'selected' : ''}>${status.label}</option>`).join('');
}

/**
 * แปลงพิกัดของหมุดเป็นข้อความ "lat, lng"
 */
function coordinatesLabel(pin) {
  return Number.isFinite(pin.latitude) && Number.isFinite(pin.longitude)
    ? `${pin.latitude.toFixed(6)}, ${pin.longitude.toFixed(6)}`
    : 'ยังไม่มีพิกัด · ใช้ GPS ค้นหาที่อยู่ หรือกรอกพิกัด';
}

/**
 * สร้าง HTML หน้าอัปเดตสถานการณ์น้ำท่วมของเจ้าหน้าที่ (รายงานรอตรวจสอบอยู่ด้านบน)
 */
export function renderFloodMonitor() {
  const counts = getFloodCounts();
  const sortedPins = [...floodPins].sort((a, b) => Number(a.verified) - Number(b.verified)
    || new Date(b.createdAt) - new Date(a.createdAt));
  const pendingVerificationCount = sortedPins.filter((pin) => !pin.verified).length;
  const unlocatedCount = floodPins.filter((pin) => !Number.isFinite(pin.latitude) || !Number.isFinite(pin.longitude)).length;
  return `
    <div class="page-heading"><div><span class="eyebrow">${pages['flood-monitor'].eyebrow}</span><h1>${pages['flood-monitor'].title}</h1><p>${pages['flood-monitor'].description}</p></div><button class="button button-primary" data-action="place-pin">＋ เพิ่มจุดสถานการณ์</button></div>
    ${pendingVerificationCount ? `<div class="flood-review-banner" role="status"><span class="flood-review-icon" aria-hidden="true">!</span><div><strong>มีรายงานจากประชาชน ${pendingVerificationCount} จุดรอตรวจสอบ</strong><small>ตรวจสอบรายละเอียด แล้วกด “ยืนยันและเผยแพร่” ในแถวนั้น</small></div><button class="button button-review" data-action="show-pending-flood-reports">ดูรายการแรก ↓</button></div>` : '<div class="flood-review-banner is-clear" role="status"><span class="flood-review-icon" aria-hidden="true">✓</span><div><strong>ไม่มีรายงานรอตรวจสอบ</strong><small>รายงานใหม่จากประชาชนจะแสดงในรายการนี้</small></div></div>'}
    <div class="info-banner">จัดการรายงานในตารางด้านล่าง · เพิ่มรายงานได้ด้วย GPS ค้นหาที่อยู่ กรอกพิกัด หรือแตะแผนที่${unlocatedCount ? ` · มี ${unlocatedCount} รายการจากแผนที่เดิมที่ยังไม่มีพิกัดจริง` : ''}</div>
    <section class="flood-admin-counts">${FLOOD_STATUSES.map((status) => `<article class="flood-admin-count ${status.className}"><span>${status.label}</span><strong>${counts[status.label]}</strong><small>จุดรายงาน</small></article>`).join('')}</section>
    <div class="flood-admin-layout">
      <section class="panel flood-admin-map-panel">
        <div class="panel-head"><div><h2 class="panel-title">Flood Monitor</h2><div class="panel-subtitle">แผนที่เป็นทางเลือก · ใช้ GPS หรือค้นหาที่อยู่ได้</div></div><span class="map-demo-tag">Geoapify</span></div>
        ${mapMarkup('admin-flood-map', 'แผนที่ Geoapify สำหรับเจ้าหน้าที่และเลือกพิกัดเพิ่มเติม (ไม่บังคับ)')}
        <div class="flood-map-footer"><div class="flood-legend">${floodLegend()}</div><small>เลือกพิกัดบนแผนที่ หรือใช้ GPS / ค้นหาที่อยู่</small></div>
      </section>
      <section class="panel">
        <div class="panel-head"><div><h2 class="panel-title">สถานการณ์แยกตามระดับ</h2><div class="panel-subtitle">รวม ${floodPins.length} จุด</div></div></div>
        <div class="flood-admin-summary">${FLOOD_STATUSES.map((status) => `<div><span class="flood-count-dot ${status.className}"></span><span>${status.label}</span><strong>${counts[status.label]}</strong></div>`).join('')}</div>
      </section>
    </div>
    <section class="panel flood-admin-table-panel">
      <div class="panel-head"><div><h2 class="panel-title">รายงานสถานการณ์ล่าสุด</h2><div class="panel-subtitle">${pendingVerificationCount} จุดรอตรวจสอบ · ${sortedPins.length} รายการทั้งหมด</div></div><span class="panel-subtitle">${sortedPins.length} รายการ</span></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>พื้นที่ / หมายเลข</th><th>พิกัด</th><th>ระดับน้ำ</th><th>สถานะ</th><th>รายละเอียด</th><th>การตรวจสอบ</th><th>จัดการ</th></tr></thead><tbody>${sortedPins.length ? sortedPins.map((pin) => `<tr data-flood-verified="${pin.verified}">
          <td data-label="พื้นที่ / หมายเลข"><div class="table-primary">${escapeHtml(pin.area)}</div><div class="table-secondary">${escapeHtml(pin.id)} · ${formatTime(pin.createdAt)}</div></td>
          <td data-label="พิกัด">${escapeHtml(coordinatesLabel(pin))}</td>
          <td data-label="ระดับน้ำ">${escapeHtml(pin.waterLevel || 'ไม่ระบุ')}</td>
          <td data-label="สถานะ"><select aria-label="เปลี่ยนสถานะ ${escapeHtml(pin.area)}" data-flood-status-id="${escapeHtml(pin.id)}">${statusOptions(pin.status)}</select></td>
          <td data-label="รายละเอียด">${escapeHtml(pin.details || 'ไม่มีรายละเอียด')}</td>
          <td data-label="การตรวจสอบ"><span class="verification-pill ${pin.verified ? 'is-verified' : ''}">${pin.verified ? 'ตรวจสอบแล้ว' : 'รอตรวจสอบ'}</span></td>
          <td data-label="จัดการ"><div class="record-actions">${pin.verified ? '' : `<button class="button button-verify button-small" data-action="verify-flood-report" data-flood-id="${escapeHtml(pin.id)}">✓ ยืนยันและเผยแพร่</button>`}<button class="button button-outline button-small" data-record-action="edit" data-collection="floodPins" data-record-id="${escapeHtml(pin.id)}">แก้ไข</button><button class="button button-quiet button-small" data-record-action="delete" data-collection="floodPins" data-record-id="${escapeHtml(pin.id)}">ลบ</button></div></td>
        </tr>`).join('') : '<tr><td colspan="7"><div class="empty-state"><strong>ยังไม่มีหมุดสถานการณ์</strong>กด “เพิ่มจุดสถานการณ์” แล้วใช้ GPS ค้นหาที่อยู่ กรอกพิกัด หรือแตะแผนที่</div></td></tr>'}</tbody></table></div>
    </section>`;
}

/**
 * สร้างกล่องฟอร์มรายงานน้ำท่วมใน body (เรียกครั้งเดียวตอนเริ่มแอป)
 */
export function mountFloodReportDialog() {
  if (!document.querySelector('#flood-report-dialog')) document.body.insertAdjacentHTML('beforeend', pinDialogMarkup);
  pinDialog = document.querySelector('#flood-report-dialog');
  pinForm = document.querySelector('#flood-report-form');
  pinDialog.querySelectorAll('[data-close-flood-dialog]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!reportSubmissionPending) pinDialog.close();
    });
  });
  pinDialog.addEventListener('cancel', (event) => {
    if (reportSubmissionPending) event.preventDefault();
  });
  pinForm.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener('change', () => validateMediaInput(input));
  });
}

/**
 * เปิดกล่องรายงานน้ำท่วม ล้างฟอร์ม และใส่พิกัดถ้ามี
 * @param {{lat?:number,lng?:number,source?:"public"|"admin"}} options
 */
export function openFloodReportDialog({ lat, lng, source = 'public' } = {}) {
  if (!pinDialog || !pinForm) mountFloodReportDialog();
  locationRequestId += 1;
  pinForm.reset();
  const locationButton = pinForm.querySelector('[data-current-location]');
  locationButton.disabled = false;
  locationButton.textContent = currentLocationButtonLabel;
  pinForm.querySelectorAll('input[type="file"]').forEach((input) => {
    input.setCustomValidity('');
    document.getElementById(input.dataset.fileName).textContent = input.name === 'imageFile' ? 'ยังไม่ได้เลือกรูปภาพ' : 'ยังไม่ได้เลือกวิดีโอ';
  });
  pinForm.querySelector('#flood-upload-status').hidden = true;
  pinForm.querySelector('#flood-upload-status').textContent = '';
  pinForm.dataset.source = source;
  pinForm.elements.latitude.value = Number.isFinite(lat) ? Number(lat).toFixed(6) : '';
  pinForm.elements.longitude.value = Number.isFinite(lng) ? Number(lng).toFixed(6) : '';
  pinDialog.showModal();
  window.requestAnimationFrame(() => pinForm.elements.village.focus({ preventScroll: true }));
}

/**
 * ผูกปุ่มในกล่องรายงาน: ใช้ตำแหน่ง GPS, ค้นหาที่อยู่ และส่งรายงาน (อัปโหลดสื่อ + บันทึก)
 * @param {Function} onSaved - เรียกหลังบันทึกสำเร็จ
 * @param {Function} onCoordinatesFound - เรียกเมื่อได้พิกัดเพื่อเลื่อนแผนที่
 */
export function bindFloodReportForm(onSaved, onCoordinatesFound) {
  if (!pinForm) mountFloodReportDialog();
  pinForm.querySelector('[data-current-location]').addEventListener('click', (event) => {
    const button = event.currentTarget;
    if (!window.isSecureContext) {
      showFloodFormAlert({ icon: 'warning', title: 'ต้องเปิดเว็บผ่าน HTTPS', text: 'เบราว์เซอร์อนุญาตการใช้ตำแหน่งบน HTTPS หรือ localhost เท่านั้น', confirmButtonText: 'รับทราบ' });
      return;
    }
    if (!navigator.geolocation) {
      showFloodFormAlert({ icon: 'error', title: 'อุปกรณ์นี้ระบุตำแหน่งไม่ได้', text: 'เลือกจุดบนแผนที่หรือค้นหาจากที่อยู่แทนได้', confirmButtonText: 'รับทราบ' });
      return;
    }

    const requestId = ++locationRequestId;
    const source = pinForm.dataset.source;
    const restoreButton = () => {
      if (requestId !== locationRequestId) return;
      button.disabled = false;
      button.textContent = currentLocationButtonLabel;
    };
    const showLocationError = (error) => {
      if (requestId !== locationRequestId || !pinDialog.open) return;
      const message = error.code === 1
        ? 'อนุญาตให้เว็บไซต์เข้าถึงตำแหน่ง แล้วลองอีกครั้ง'
        : error.code === 3
          ? 'ใช้เวลาระบุตำแหน่งนานเกินไป ลองอีกครั้งหรือเลือกจุดบนแผนที่'
          : 'มือถือระบุตำแหน่งไม่ได้ ตรวจสอบ GPS แล้วลองอีกครั้ง';
      restoreButton();
      showFloodFormAlert({ icon: 'error', title: 'ระบุตำแหน่งไม่สำเร็จ', text: message, confirmButtonText: 'รับทราบ' });
    };

    button.disabled = true;
    button.textContent = 'กำลังระบุตำแหน่ง...';
    try {
      navigator.geolocation.getCurrentPosition((position) => {
        if (requestId !== locationRequestId || !pinDialog.open) return;
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
          showLocationError({ code: 2 });
          return;
        }
        pinForm.elements.latitude.value = lat.toFixed(6);
        pinForm.elements.longitude.value = lng.toFixed(6);
        onCoordinatesFound?.({ lat, lng, source });
        restoreButton();
        Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'ใช้ตำแหน่งปัจจุบันแล้ว', showConfirmButton: false, timer: 1800 });
      }, showLocationError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      });
    } catch (error) {
      showLocationError(error);
    }
  });

  pinForm.querySelector('[data-geocode-location]').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const apiKey = window.CMB_GEOAPIFY_CONFIG?.apiKey;
    const searchText = pinForm.elements.locationSearch.value.trim()
      || [pinForm.elements.village.value, pinForm.elements.subdistrict.value, pinForm.elements.district.value]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(', ');
    if (!apiKey || typeof apiKey !== 'string' || apiKey.includes('YOUR_')) {
      showFloodFormAlert({ icon: 'error', title: 'ยังไม่ได้ตั้งค่า Geoapify', text: 'เพิ่ม API key ใน geoapify-config.js ก่อนค้นหาพิกัด', confirmButtonText: 'รับทราบ' });
      return;
    }
    if (!searchText) {
      showFloodFormAlert({ icon: 'info', title: 'กรอกที่อยู่ก่อนค้นหา', text: 'ระบุชื่อสถานที่ หมู่บ้าน ตำบล หรืออำเภอ', confirmButtonText: 'รับทราบ' });
      return;
    }

    button.disabled = true;
    try {
      const url = new URL('https://api.geoapify.com/v1/geocode/search');
      url.searchParams.set('text', searchText);
      url.searchParams.set('format', 'json');
      url.searchParams.set('lang', 'th');
      url.searchParams.set('limit', '1');
      url.searchParams.set('filter', 'countrycode:th');
      url.searchParams.set('apiKey', apiKey);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Geoapify ตอบกลับสถานะ ${response.status}`);
      const result = (await response.json()).results?.[0];
      if (!result || !Number.isFinite(result.lat) || !Number.isFinite(result.lon)) {
        throw new Error('ไม่พบพิกัดของสถานที่นี้ ลองระบุชื่อพื้นที่ให้ละเอียดขึ้น');
      }

      pinForm.elements.latitude.value = result.lat.toFixed(6);
      pinForm.elements.longitude.value = result.lon.toFixed(6);
      pinForm.elements.locationSearch.value = result.formatted || searchText;
      onCoordinatesFound?.({ lat: result.lat, lng: result.lon, source: pinForm.dataset.source });
      Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'ค้นหาพิกัดแล้ว', showConfirmButton: false, timer: 1800 });
    } catch (error) {
      console.error('Unable to geocode the flood report location:', error);
      showFloodFormAlert({ icon: 'error', title: 'ค้นหาพิกัดไม่สำเร็จ', text: error.message || 'ตรวจสอบการเชื่อมต่อและ Geoapify API key', confirmButtonText: 'รับทราบ' });
    } finally {
      button.disabled = false;
    }
  });

  pinForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fileInputs = [...pinForm.querySelectorAll('input[type="file"]')];
    const filesValid = fileInputs.every(validateMediaInput);
    const formValid = pinForm.reportValidity();
    if (!filesValid || !formValid) return;

    const formData = new FormData(pinForm);
    const latitude = Number(formData.get('latitude'));
    const longitude = Number(formData.get('longitude'));
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      showFloodFormAlert({ icon: 'error', title: 'พิกัดไม่ถูกต้อง', text: 'ตรวจสอบละติจูดและลองจิจูดอีกครั้ง', confirmButtonText: 'ตกลง' });
      return;
    }

    const village = String(formData.get('village')).trim();
    const moo = String(formData.get('moo')).trim();
    const subdistrict = String(formData.get('subdistrict')).trim();
    const district = String(formData.get('district')).trim();
    const area = [village, moo ? `หมู่ ${moo}` : '', `ต.${subdistrict}`, `อ.${district}`].filter(Boolean).join(' · ');
    const imageFile = pinForm.elements.imageFile.files[0];
    const videoFile = pinForm.elements.videoFile.files[0];
    const rawImageUrl = String(formData.get('imageUrl')).trim();
    const rawVideoUrl = String(formData.get('videoUrl')).trim();
    if ((imageFile && rawImageUrl) || (videoFile && rawVideoUrl)) {
      showFloodFormAlert({ icon: 'warning', title: 'เลือกไฟล์หรือ URL อย่างใดอย่างหนึ่ง', text: 'แนบไฟล์หรือกรอก URL สำหรับสื่อแต่ละประเภท ไม่ต้องใส่ทั้งสองแบบพร้อมกัน', confirmButtonText: 'ตรวจสอบอีกครั้ง' });
      return;
    }
    if ((rawImageUrl && !safeMediaUrl(rawImageUrl)) || (rawVideoUrl && !safeMediaUrl(rawVideoUrl))) {
      showFloodFormAlert({ icon: 'error', title: 'URL สื่อไม่ถูกต้อง', text: 'ใช้ URL ที่ขึ้นต้นด้วย http:// หรือ https:// เท่านั้น', confirmButtonText: 'ตรวจสอบอีกครั้ง' });
      return;
    }
    if ((imageFile || videoFile) && !isSupabaseConfigured()) {
      showFloodFormAlert({ icon: 'warning', title: 'ยังไม่ได้ตั้งค่าที่เก็บไฟล์', text: 'การแนบรูปภาพหรือวิดีโอต้องเชื่อมต่อ Supabase และสร้าง Storage bucket ก่อน', confirmButtonText: 'รับทราบ' });
      return;
    }
    const reportId = `FM-${typeof crypto.randomUUID === 'function' ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
    const pin = {
      id: reportId,
      area,
      village,
      moo,
      subdistrict,
      district,
      latitude,
      longitude,
      status: String(formData.get('status')),
      waterLevel: String(formData.get('waterLevel') || 'ไม่ทราบ'),
      details: String(formData.get('details')).trim(),
      imageUrl: safeMediaUrl(rawImageUrl),
      videoUrl: safeMediaUrl(rawVideoUrl),
      imageName: imageFile ? imageFile.name : '',
      videoName: videoFile ? videoFile.name : '',
      verified: pinForm.dataset.source === 'admin',
      createdAt: new Date().toISOString(),
    };

    const uploadedPaths = [];
    const submitButton = pinForm.querySelector('button[type="submit"]');
    const uploadStatus = pinForm.querySelector('#flood-upload-status');
    const closeButtons = [...pinForm.querySelectorAll('[data-close-flood-dialog]')];
    reportSubmissionPending = true;
    submitButton.disabled = true;
    closeButtons.forEach((button) => { button.disabled = true; });
    if (imageFile || videoFile) {
      uploadStatus.hidden = false;
      uploadStatus.textContent = 'กำลังอัปโหลดไฟล์และบันทึกรายงาน...';
      submitButton.textContent = 'กำลังอัปโหลด...';
    }
    try {
      if (imageFile) {
        pin.imageUrl = await uploadFloodMedia(imageFile, reportId, 'image');
        uploadedPaths.push(pin.imageUrl);
      }
      if (videoFile) {
        pin.videoUrl = await uploadFloodMedia(videoFile, reportId, 'video');
        uploadedPaths.push(pin.videoUrl);
      }
      await createRecord('floodPins', pin);
    } catch (error) {
      console.error('Unable to save flood report:', error);
      let cleanupFailed = false;
      try {
        await removeUnlinkedFloodMedia(uploadedPaths);
      } catch (cleanupError) {
        cleanupFailed = true;
        console.error('Unable to remove unlinked flood media:', cleanupError);
      }
      reportSubmissionPending = false;
      submitButton.disabled = false;
      submitButton.textContent = '▣ บันทึกสถานการณ์';
      closeButtons.forEach((button) => { button.disabled = false; });
      uploadStatus.hidden = true;
      const cleanupMessage = cleanupFailed ? ' ไฟล์ชั่วคราวบางส่วนลบไม่สำเร็จ โปรดแจ้งผู้ดูแลระบบ' : '';
      showFloodFormAlert({ icon: 'error', title: 'บันทึกรายงานไม่สำเร็จ', text: `${error.message || 'โปรดลองอีกครั้ง'}${cleanupMessage}`, confirmButtonText: 'ตรวจสอบอีกครั้ง' });
      return;
    }
    reportSubmissionPending = false;
    submitButton.disabled = false;
    submitButton.textContent = '▣ บันทึกสถานการณ์';
    closeButtons.forEach((button) => { button.disabled = false; });
    pinDialog.close();
    const refreshed = await onSaved();
    if (refreshed === false) return;
    Swal.fire({
      icon: 'success',
      title: pin.verified ? 'เพิ่มสถานการณ์แล้ว' : 'ส่งหมุดรายงานแล้ว',
      text: pin.verified
        ? (isSupabaseConfigured() ? 'บันทึกข้อมูลใน Supabase แล้ว' : 'บันทึกข้อมูลในต้นแบบเบราว์เซอร์แล้ว')
        : 'ส่งรายงานแล้ว รอเจ้าหน้าที่ตรวจสอบก่อนแสดงบนแผนที่สาธารณะ',
      confirmButtonText: 'รับทราบ',
    });
  });
}

/**
 * แสดง popup รายละเอียดหมุดน้ำท่วม (ตอนคลิกหมุด)
 * @param {string} pinId
 */
export function showFloodPinDetails(pinId) {
  const pin = floodPins.find((item) => item.id === pinId);
  if (!pin) return;
  const status = getFloodStatus(pin.status);
  const mediaLinks = [
    safeMediaUrl(pin.imageUrl) ? `<p><a href="${escapeHtml(safeMediaUrl(pin.imageUrl))}" target="_blank" rel="noopener noreferrer">เปิดรูปภาพแนบ</a></p>` : '',
    safeMediaUrl(pin.videoUrl) ? `<p><a href="${escapeHtml(safeMediaUrl(pin.videoUrl))}" target="_blank" rel="noopener noreferrer">เปิดวิดีโอแนบ</a></p>` : '',
    pin.imageName || pin.videoName ? `<p class="swal-note">ไฟล์แนบ: ${escapeHtml([pin.imageName, pin.videoName].filter(Boolean).join(' · '))}</p>` : '',
  ].join('');
  Swal.fire({
    icon: pin.status === 'วิกฤต' ? 'error' : 'info',
    title: escapeHtml(pin.area),
    html: `<p><strong>${status.label}</strong> · ${escapeHtml(pin.waterLevel || 'ไม่ระบุระดับน้ำ')}</p><p>${escapeHtml(pin.details || 'ไม่มีรายละเอียดเพิ่มเติม')}</p><p class="swal-note">${pin.verified ? 'เจ้าหน้าที่ตรวจสอบแล้ว' : 'รายงานจากประชาชน · ยังไม่ได้รับการยืนยัน'} · ${formatTime(pin.createdAt)}</p>${mediaLinks}`,
    confirmButtonText: 'ปิด',
  });
}

/**
 * เปลี่ยนสถานะหมุดน้ำท่วมหลังเจ้าหน้าที่ยืนยัน
 * @param {HTMLSelectElement} select
 * @param {Function} onUpdated
 */
export async function handleFloodPinStatusChange(select, onUpdated) {
  const pin = floodPins.find((item) => item.id === select.dataset.floodStatusId);
  if (!pin) return;
  const previousStatus = pin.status;
  const nextStatus = select.value;
  select.value = previousStatus;
  const result = await Swal.fire({
    icon: 'question',
    title: 'ยืนยันการอัปเดตสถานการณ์?',
    text: `เปลี่ยน ${pin.area} จาก “${previousStatus}” เป็น “${nextStatus}” และระบุว่าตรวจสอบแล้ว`,
    showCancelButton: true,
    confirmButtonText: 'ยืนยันการอัปเดต',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true,
  });
  if (!result.isConfirmed) return;
  const updatedPin = { ...pin, status: nextStatus, verified: true, verifiedAt: new Date().toISOString() };
  try {
    await updateRecord('floodPins', pin.id, { status: nextStatus, verified: true, verifiedAt: updatedPin.verifiedAt });
  } catch (error) {
    console.error('Unable to update flood report:', error);
    Swal.fire({ icon: 'error', title: 'บันทึกสถานะไม่สำเร็จ', text: error.message || 'โปรดลองอีกครั้ง', confirmButtonText: 'ตกลง' });
    return;
  }
  const refreshed = await onUpdated();
  if (refreshed === false) return;
  Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'อัปเดตสถานการณ์แล้ว', showConfirmButton: false, timer: 2200, timerProgressBar: true });
}

/**
 * ยืนยันและเผยแพร่รายงานรอตรวจสอบ ให้แสดงบนแผนที่สาธารณะ
 * @param {string} pinId
 * @param {Function} onUpdated
 */
export async function handleFloodReportVerification(pinId, onUpdated) {
  const pin = floodPins.find((item) => item.id === pinId);
  if (!pin || pin.verified) return;
  const result = await Swal.fire({
    icon: 'question',
    title: 'ยืนยันและเผยแพร่รายงาน?',
    text: `${pin.area} จะแสดงบนแผนที่สาธารณะหลังยืนยัน`,
    showCancelButton: true,
    confirmButtonText: 'ยืนยันรายงาน',
    cancelButtonText: 'กลับไปตรวจสอบ',
    reverseButtons: true,
  });
  if (!result.isConfirmed) return;
  try {
    await updateRecord('floodPins', pin.id, { verified: true, verifiedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Unable to verify flood report:', error);
    await Swal.fire({ icon: 'error', title: 'ยืนยันรายงานไม่สำเร็จ', text: error.message || 'โปรดลองอีกครั้ง', confirmButtonText: 'รับทราบ' });
    return;
  }
  const refreshed = await onUpdated();
  if (refreshed === false) return;
  Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'ยืนยันและเผยแพร่รายงานแล้ว', showConfirmButton: false, timer: 2200, timerProgressBar: true });
}
