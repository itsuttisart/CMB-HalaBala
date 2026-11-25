import { DEFAULT_MAP_CENTER, FLOOD_STATUSES, pages } from '../data.js';
import { createRecord, floodPins, getFloodCounts, getFloodStatus, updateRecord } from '../store.js';
import { isSupabaseConfigured } from '../supabase-client.js';
import { escapeHtml, formatTime } from '../utils.js';

const pinDialogMarkup = `
  <dialog class="request-dialog pin-dialog" id="flood-report-dialog" aria-labelledby="flood-report-title">
    <form class="request-form-dialog" id="flood-report-form">
      <div class="dialog-heading">
        <div><span class="section-kicker">FLOOD MONITOR</span><h2 id="flood-report-title">บันทึกข้อมูลพื้นที่</h2><p>ตรวจสอบพิกัดและกรอกสถานการณ์ที่พบ</p></div>
        <button class="icon-button" type="button" data-close-flood-dialog aria-label="ปิดแบบฟอร์ม">×</button>
      </div>
      <section class="coordinate-fields" aria-label="พิกัดพื้นที่">
        <strong>⌖ พิกัดที่เลือก</strong>
        <div class="form-grid">
          <label>ละติจูด (Latitude) <span class="required">*</span><input name="latitude" type="number" inputmode="decimal" min="-90" max="90" step="any" required /></label>
          <label>ลองจิจูด (Longitude) <span class="required">*</span><input name="longitude" type="number" inputmode="decimal" min="-180" max="180" step="any" required /></label>
        </div>
        <button class="button button-outline button-small geoapify-location-button" type="button" data-current-location>⌖ ใช้ตำแหน่งปัจจุบันของฉัน</button>
        <div class="geoapify-search-row">
          <label>ค้นหาที่อยู่หรือสถานที่<input name="locationSearch" maxlength="250" placeholder="เช่น หมู่บ้าน ตำบล อำเภอ จังหวัด" /></label>
          <button class="button button-outline button-small" type="button" data-geocode-location>ค้นหาพิกัด</button>
        </div>
        <small>แตะแผนที่ ใช้ตำแหน่งมือถือ หรือค้นหาที่อยู่ได้ · การระบุตำแหน่งต้องใช้ HTTPS และอนุญาต Location</small>
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
        <label>รูปภาพ<input name="imageFile" type="file" accept="image/jpeg,image/png,image/gif" data-max-bytes="10485760" data-file-name="image-file-name" /><small>JPG, PNG, GIF ขนาดไม่เกิน 10 MB</small></label>
        <label>URL รูปภาพ<input name="imageUrl" type="url" placeholder="https://..." /></label>
        <label>วิดีโอ<input name="videoFile" type="file" accept="video/mp4,video/quicktime,video/x-msvideo" data-max-bytes="52428800" data-file-name="video-file-name" /><small>MP4, MOV, AVI ขนาดไม่เกิน 50 MB</small></label>
        <label>URL วิดีโอ<input name="videoUrl" type="url" placeholder="URL วิดีโอหรือ YouTube" /></label>
        <p id="image-file-name" class="selected-file-name">ยังไม่ได้เลือกรูปภาพ</p>
        <p id="video-file-name" class="selected-file-name">ยังไม่ได้เลือกวิดีโอ</p>
        <small class="flood-media-warning">ไฟล์ที่เลือกจะแสดงเป็นชื่อไฟล์เท่านั้น ต้นแบบนี้ยังไม่ได้อัปโหลดไฟล์ไปยังระบบหรือเก็บไฟล์ไว้</small>
      </section>
      <p class="privacy-note">${isSupabaseConfigured() ? 'รายงานจะบันทึกใน Supabase และแสดงต่อสาธารณะหลังเจ้าหน้าที่ตรวจสอบ ระบบจะขอตำแหน่งเมื่อคุณกดปุ่มเท่านั้นและไม่ติดตามต่อเนื่อง ไฟล์ที่เลือกยังไม่ถูกอัปโหลด' : 'ข้อมูลต้นแบบบันทึกไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น ระบบจะขอตำแหน่งเมื่อคุณกดปุ่มเท่านั้นและไม่ติดตามต่อเนื่อง รายงานจากประชาชนจะแสดงเป็น “รอตรวจสอบ”'}</p>
      <div class="dialog-actions">
        <button class="button button-quiet" type="button" data-close-flood-dialog>ยกเลิก</button>
        <button class="button button-primary button-large" type="submit">▣ บันทึกสถานการณ์</button>
      </div>
    </form>
  </dialog>`;

let pinDialog;
let pinForm;
let locationRequestId = 0;
const currentLocationButtonLabel = '⌖ ใช้ตำแหน่งปัจจุบันของฉัน';

function showFloodFormAlert(options) {
  return Swal.fire({ target: pinDialog, ...options });
}

function mapMarkup(id, label) {
  const publicMap = id === 'public-flood-map';
  return `<div class="geoapify-flood-map" id="${id}" data-flood-map data-map-public="${publicMap}" data-map-interactive="true" data-map-zoom="12" aria-label="${label}"><div class="geoapify-map-canvas"></div></div>`;
}

function floodLegend() {
  return FLOOD_STATUSES.map((status) => `<span class="flood-legend-item"><i class="${status.className}"></i>${status.label}</span>`).join('');
}

function safeMediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}

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
      ${fileNames ? `<small>เลือกไฟล์ไว้ในเครื่อง: ${fileNames} · ไม่ได้อัปโหลด</small>` : ''}
    </article>`;
}

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
        <div><span class="section-kicker">FLOOD MONITOR</span><h2>ติดตามสถานการณ์น้ำท่วม</h2><p>แผนที่ Geoapify · แตะจุดที่ต้องการรายงานเพื่อปักหมุด</p></div>
        <button class="button button-primary button-pin" data-action="place-pin" data-map-target="public-flood-map">＋ ปักหมุดสถานการณ์</button>
      </div>
      <div class="flood-monitor-card">
        <div class="flood-map-heading"><strong>แผนที่รายงานสถานการณ์</strong><span class="map-demo-tag">${isSupabaseConfigured() ? 'ข้อมูลจากฐานข้อมูล' : 'ข้อมูลตัวอย่าง · ตรวจสอบก่อนใช้งาน'}</span></div>
        ${mapMarkup('public-flood-map', 'แผนที่ Geoapify แตะตำแหน่งเพื่อบันทึกสถานการณ์')}
        <div class="flood-map-footer"><div class="flood-legend">${floodLegend()}</div><small>🔴 วิกฤต (กะพริบเร็ว) · 🟡 เสี่ยงสูง · 🔵 เฝ้าระวัง · 🟢 ปกติ (กะพริบช้า) · หมุดจากประชาชนรอตรวจสอบ</small></div>
        <div class="flood-public-summary">${FLOOD_STATUSES.map((status) => `
          <div class="flood-count-card ${status.className}"><span class="flood-count-dot"></span><span>${status.label}</span><strong>${counts[status.label]}</strong></div>`).join('')}
        </div>
        <div class="flood-public-reports">${reports}</div>
      </div>
    </section>`;
}

function statusOptions(current) {
  return FLOOD_STATUSES.map((status) => `<option ${current === status.label ? 'selected' : ''}>${status.label}</option>`).join('');
}

function coordinatesLabel(pin) {
  return Number.isFinite(pin.latitude) && Number.isFinite(pin.longitude)
    ? `${pin.latitude.toFixed(6)}, ${pin.longitude.toFixed(6)}`
    : 'ไม่มีพิกัดจริง · เลือกจุดบนแผนที่ใหม่';
}

export function renderFloodMonitor() {
  const counts = getFloodCounts();
  const sortedPins = [...floodPins].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unlocatedCount = floodPins.filter((pin) => !Number.isFinite(pin.latitude) || !Number.isFinite(pin.longitude)).length;
  return `
    <div class="page-heading"><div><span class="eyebrow">${pages['flood-monitor'].eyebrow}</span><h1>${pages['flood-monitor'].title}</h1><p>${pages['flood-monitor'].description}</p></div><button class="button button-primary" data-action="place-pin" data-map-target="admin-flood-map">＋ เพิ่มจุดสถานการณ์</button></div>
    <div class="info-banner">แผนที่ Geoapify แสดงพิกัดจริงเมื่อเลือกจุดบนแผนที่ รายงานจากประชาชนจะแสดงเป็น “รอตรวจสอบ” จนกว่าเจ้าหน้าที่จะยืนยัน${unlocatedCount ? ` · มี ${unlocatedCount} รายการจากแผนที่เดิมที่ยังไม่มีพิกัดจริง` : ''}</div>
    <section class="flood-admin-counts">${FLOOD_STATUSES.map((status) => `<article class="flood-admin-count ${status.className}"><span>${status.label}</span><strong>${counts[status.label]}</strong><small>จุดรายงาน</small></article>`).join('')}</section>
    <div class="flood-admin-layout">
      <section class="panel flood-admin-map-panel">
        <div class="panel-head"><div><h2 class="panel-title">Flood Monitor</h2><div class="panel-subtitle">แตะตำแหน่งบนแผนที่เพื่อเพิ่มรายงานใหม่</div></div><span class="map-demo-tag">Geoapify</span></div>
        ${mapMarkup('admin-flood-map', 'แผนที่ Geoapify สำหรับเจ้าหน้าที่')}
        <div class="flood-map-footer"><div class="flood-legend">${floodLegend()}</div><small>พิกัดหมุดอ่านจากตำแหน่งที่เลือกบนแผนที่</small></div>
      </section>
      <section class="panel">
        <div class="panel-head"><div><h2 class="panel-title">สถานการณ์แยกตามระดับ</h2><div class="panel-subtitle">รวม ${floodPins.length} จุด</div></div></div>
        <div class="flood-admin-summary">${FLOOD_STATUSES.map((status) => `<div><span class="flood-count-dot ${status.className}"></span><span>${status.label}</span><strong>${counts[status.label]}</strong></div>`).join('')}</div>
      </section>
    </div>
    <section class="panel flood-admin-table-panel">
      <div class="panel-head"><div><h2 class="panel-title">รายงานสถานการณ์ล่าสุด</h2><div class="panel-subtitle">ตรวจสอบข้อมูลและปรับสถานะรายงาน</div></div><span class="panel-subtitle">${sortedPins.length} รายการ</span></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>พื้นที่ / หมายเลข</th><th>พิกัด</th><th>ระดับน้ำ</th><th>สถานะ</th><th>รายละเอียด</th><th>การตรวจสอบ</th><th>จัดการ</th></tr></thead><tbody>${sortedPins.length ? sortedPins.map((pin) => `<tr>
          <td data-label="พื้นที่ / หมายเลข"><div class="table-primary">${escapeHtml(pin.area)}</div><div class="table-secondary">${escapeHtml(pin.id)} · ${formatTime(pin.createdAt)}</div></td>
          <td data-label="พิกัด">${escapeHtml(coordinatesLabel(pin))}</td>
          <td data-label="ระดับน้ำ">${escapeHtml(pin.waterLevel || 'ไม่ระบุ')}</td>
          <td data-label="สถานะ"><select aria-label="เปลี่ยนสถานะ ${escapeHtml(pin.area)}" data-flood-status-id="${escapeHtml(pin.id)}">${statusOptions(pin.status)}</select></td>
          <td data-label="รายละเอียด">${escapeHtml(pin.details || 'ไม่มีรายละเอียด')}</td>
          <td data-label="การตรวจสอบ"><span class="verification-pill ${pin.verified ? 'is-verified' : ''}">${pin.verified ? 'ตรวจสอบแล้ว' : 'รอตรวจสอบ'}</span></td>
          <td data-label="จัดการ"><div class="record-actions"><button class="button button-outline button-small" data-record-action="edit" data-collection="floodPins" data-record-id="${escapeHtml(pin.id)}">แก้ไข</button><button class="button button-quiet button-small" data-record-action="delete" data-collection="floodPins" data-record-id="${escapeHtml(pin.id)}">ลบ</button></div></td>
        </tr>`).join('') : '<tr><td colspan="7"><div class="empty-state"><strong>ยังไม่มีหมุดสถานการณ์</strong>แตะบนแผนที่เพื่อเพิ่มรายงาน</div></td></tr>'}</tbody></table></div>
    </section>`;
}

export function mountFloodReportDialog() {
  if (!document.querySelector('#flood-report-dialog')) document.body.insertAdjacentHTML('beforeend', pinDialogMarkup);
  pinDialog = document.querySelector('#flood-report-dialog');
  pinForm = document.querySelector('#flood-report-form');
  pinDialog.querySelectorAll('[data-close-flood-dialog]').forEach((button) => {
    button.addEventListener('click', () => pinDialog.close());
  });
  pinForm.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener('change', () => {
      input.setCustomValidity('');
      const selectedFile = input.files[0];
      const output = document.getElementById(input.dataset.fileName);
      if (!selectedFile) {
        output.textContent = input.name === 'imageFile' ? 'ยังไม่ได้เลือกรูปภาพ' : 'ยังไม่ได้เลือกวิดีโอ';
        return;
      }
      const maxBytes = Number(input.dataset.maxBytes);
      const allowedTypes = input.name === 'imageFile'
        ? ['image/jpeg', 'image/png', 'image/gif']
        : ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
      if (!allowedTypes.includes(selectedFile.type)) {
        input.setCustomValidity('ชนิดไฟล์นี้ไม่รองรับ');
        output.textContent = 'ชนิดไฟล์นี้ไม่รองรับ';
        return;
      }
      if (selectedFile.size > maxBytes) {
        input.setCustomValidity(`ไฟล์มีขนาดเกิน ${maxBytes / 1024 / 1024} MB`);
        output.textContent = 'ไฟล์มีขนาดใหญ่เกินกำหนด';
        return;
      }
      output.textContent = `เลือกแล้ว: ${selectedFile.name} · ยังไม่ได้อัปโหลด`;
    });
  });
}

export function openFloodReportDialog({ lat = DEFAULT_MAP_CENTER.lat, lng = DEFAULT_MAP_CENTER.lng, source = 'public' } = {}) {
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
  pinForm.dataset.source = source;
  pinForm.elements.latitude.value = Number(lat).toFixed(6);
  pinForm.elements.longitude.value = Number(lng).toFixed(6);
  pinDialog.showModal();
  window.requestAnimationFrame(() => pinForm.elements.village.focus({ preventScroll: true }));
}

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
    if (!pinForm.reportValidity()) return;

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
    if ((rawImageUrl && !safeMediaUrl(rawImageUrl)) || (rawVideoUrl && !safeMediaUrl(rawVideoUrl))) {
      showFloodFormAlert({ icon: 'error', title: 'URL สื่อไม่ถูกต้อง', text: 'ใช้ URL ที่ขึ้นต้นด้วย http:// หรือ https:// เท่านั้น', confirmButtonText: 'ตรวจสอบอีกครั้ง' });
      return;
    }
    const pin = {
      id: `FM-${typeof crypto.randomUUID === 'function' ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`,
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

    try {
      await createRecord('floodPins', pin);
    } catch (error) {
      console.error('Unable to save flood report:', error);
      showFloodFormAlert({ icon: 'error', title: 'บันทึกหมุดไม่สำเร็จ', text: error.message || 'โปรดลองอีกครั้ง', confirmButtonText: 'ตกลง' });
      return;
    }
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

export function showFloodPinDetails(pinId) {
  const pin = floodPins.find((item) => item.id === pinId);
  if (!pin) return;
  const status = getFloodStatus(pin.status);
  const mediaLinks = [
    safeMediaUrl(pin.imageUrl) ? `<p><a href="${escapeHtml(safeMediaUrl(pin.imageUrl))}" target="_blank" rel="noopener noreferrer">เปิดรูปภาพแนบ</a></p>` : '',
    safeMediaUrl(pin.videoUrl) ? `<p><a href="${escapeHtml(safeMediaUrl(pin.videoUrl))}" target="_blank" rel="noopener noreferrer">เปิดวิดีโอแนบ</a></p>` : '',
    pin.imageName || pin.videoName ? `<p class="swal-note">ชื่อไฟล์: ${escapeHtml([pin.imageName, pin.videoName].filter(Boolean).join(' · '))} · ไฟล์ไม่ได้อัปโหลด</p>` : '',
  ].join('');
  Swal.fire({
    icon: pin.status === 'วิกฤต' ? 'error' : 'info',
    title: escapeHtml(pin.area),
    html: `<p><strong>${status.label}</strong> · ${escapeHtml(pin.waterLevel || 'ไม่ระบุระดับน้ำ')}</p><p>${escapeHtml(pin.details || 'ไม่มีรายละเอียดเพิ่มเติม')}</p><p class="swal-note">${pin.verified ? 'เจ้าหน้าที่ตรวจสอบแล้ว' : 'รายงานจากประชาชน · ยังไม่ได้รับการยืนยัน'} · ${formatTime(pin.createdAt)}</p>${mediaLinks}`,
    confirmButtonText: 'ปิด',
  });
}

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
