import { announcements, createRecord, deleteRecord, floodPins, requests, shelters, supplies, updateRecord, volunteers } from './store.js';
import { isSupabaseConfigured } from './supabase-client.js';
import { escapeHtml } from './utils.js';

const definitions = {
  requests: {
    label: 'คำร้องขอความช่วยเหลือ',
    prefix: 'HB',
    fields: [
      { name: 'name', label: 'ชื่อผู้แจ้ง', required: true },
      { name: 'phone', label: 'เบอร์ติดต่อ', required: true },
      { name: 'location', label: 'พื้นที่ / จุดเกิดเหตุ', required: true, wide: true },
      { name: 'need', label: 'ความช่วยเหลือ', type: 'select', options: ['อพยพ / ติดค้าง', 'อาหารและน้ำดื่ม', 'ยาและการแพทย์', 'เรือหรือการเดินทาง', 'สิ่งของจำเป็น', 'อื่น ๆ'] },
      { name: 'people', label: 'จำนวนผู้ประสบภัย', type: 'number', min: 1, required: true },
      { name: 'details', label: 'ข้อมูลเพิ่มเติม', type: 'textarea', wide: true },
      { name: 'urgent', label: 'เร่งด่วน / มีกลุ่มเปราะบาง', type: 'checkbox', wide: true },
      { name: 'status', label: 'สถานะ', type: 'select', options: ['รอประสานงาน', 'กำลังดำเนินการ', 'ช่วยเหลือแล้ว'] },
    ],
  },
  floodPins: {
    label: 'สถานการณ์น้ำท่วม',
    prefix: 'FM',
    fields: [
      { name: 'village', label: 'หมู่บ้าน', required: true },
      { name: 'moo', label: 'หมู่ที่' },
      { name: 'subdistrict', label: 'ตำบล', required: true },
      { name: 'district', label: 'อำเภอ', required: true },
      { name: 'latitude', label: 'ละติจูด', type: 'number', step: 'any', required: true },
      { name: 'longitude', label: 'ลองจิจูด', type: 'number', step: 'any', required: true },
      { name: 'status', label: 'สถานการณ์', type: 'select', options: ['ปกติ', 'เฝ้าระวัง', 'เสี่ยงสูง', 'วิกฤต'] },
      { name: 'waterLevel', label: 'ระดับน้ำ', type: 'select', options: ['ไม่ทราบ','ปกติ', 'ต่ำกว่าตาตุ่ม', 'ระดับตาตุ่ม–เข่า', 'ระดับเข่า–เอว', 'สูงกว่าระดับเอว'] },
      { name: 'details', label: 'รายละเอียด', type: 'textarea', wide: true },
      { name: 'verified', label: 'ตรวจสอบโดยเจ้าหน้าที่แล้ว', type: 'checkbox', wide: true },
    ],
  },
  shelters: {
    label: 'ศูนย์พักพิง',
    prefix: 'SH',
    fields: [
      { name: 'name', label: 'ชื่อศูนย์', required: true },
      { name: 'location', label: 'ที่ตั้ง', required: true },
      { name: 'occupancy', label: 'ผู้เข้าพักปัจจุบัน', type: 'number', min: 0, required: true },
      { name: 'capacity', label: 'รองรับได้ (คน)', type: 'number', min: 1, required: true },
      { name: 'facilities', label: 'สิ่งอำนวยความสะดวก', type: 'textarea', wide: true },
      { name: 'latitude', label: 'ละติจูด', type: 'number', step: 'any' },
      { name: 'longitude', label: 'ลองจิจูด', type: 'number', step: 'any' },
      { name: 'isActive', label: 'เปิดให้บริการ', type: 'checkbox' },
      { name: 'isPublished', label: 'แสดงต่อประชาชน', type: 'checkbox' },
    ],
  },
  supplies: {
    label: 'คลังสิ่งของ',
    prefix: 'SP',
    fields: [
      { name: 'name', label: 'ชื่อสิ่งของ', required: true },
      { name: 'category', label: 'หมวดหมู่', required: true },
      { name: 'amount', label: 'จำนวนคงเหลือ', type: 'number', min: 0, step: 'any', required: true },
      { name: 'unit', label: 'หน่วยนับ', required: true },
      { name: 'status', label: 'สถานะ', type: 'select', options: ['พร้อมจ่าย', 'คงเหลือน้อย', 'หมดชั่วคราว'] },
    ],
  },
  volunteers: {
    label: 'ทีมอาสาสมัคร',
    prefix: 'VT',
    fields: [
      { name: 'name', label: 'ชื่อทีม', required: true },
      { name: 'status', label: 'สถานะทีม', type: 'select', options: ['พร้อมสนับสนุน', 'กำลังปฏิบัติงาน', 'พัก / ไม่พร้อม'] },
      { name: 'mission', label: 'ภารกิจ', type: 'textarea', wide: true },
      { name: 'headcount', label: 'จำนวนอาสาสมัคร', type: 'number', min: 0, required: true },
      { name: 'equipment', label: 'ยานพาหนะ / อุปกรณ์', type: 'textarea', wide: true },
    ],
  },
  announcements: {
    label: 'ข่าวประกาศ',
    prefix: 'AN',
    fields: [
      { name: 'title', label: 'หัวข้อประกาศ', required: true },
      { name: 'tag', label: 'หมวดหมู่', required: true },
      { name: 'details', label: 'รายละเอียด', type: 'textarea', wide: true, required: true },
      { name: 'isPublished', label: 'เผยแพร่ต่อประชาชน', type: 'checkbox', wide: true },
      { name: 'expiresAt', label: 'วันหมดอายุ (ไม่บังคับ)', type: 'datetime-local', wide: true },
    ],
  },
};

function collectionRecords(name) {
  return { requests, floodPins, shelters, supplies, volunteers, announcements }[name];
}

function fieldValue(field, record) {
  const value = record?.[field.name];
  if (field.type === 'checkbox') return `<input name="${field.name}" type="checkbox" ${value ? 'checked' : ''} />`;
  if (field.type === 'select') {
    return `<select name="${field.name}" ${field.required ? 'required' : ''}>${field.options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select>`;
  }
  if (field.type === 'textarea') {
    return `<textarea name="${field.name}" rows="3" ${field.required ? 'required' : ''}>${escapeHtml(value || '')}</textarea>`;
  }
  const type = field.type || 'text';
  let valueString = value ?? '';
  if (field.type === 'datetime-local' && value) {
    const date = new Date(value);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    valueString = date.toISOString().slice(0, 16);
  }
  return `<input name="${field.name}" type="${type}" value="${escapeHtml(valueString)}" ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.step ? `step="${field.step}"` : ''} ${field.required ? 'required' : ''} />`;
}

function renderField(field, record) {
  const control = fieldValue(field, record);
  if (field.type === 'checkbox') {
    return `<label class="admin-record-checkbox ${field.wide ? 'form-wide' : ''}">${control}<span>${escapeHtml(field.label)}</span></label>`;
  }
  return `<label class="${field.wide ? 'form-wide' : ''}">${escapeHtml(field.label)}${control}</label>`;
}

function createId(prefix) {
  const suffix = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().slice(0, 8)
    : Date.now().toString(36);
  return `${prefix}-${suffix}`;
}

function readFormValue(field, formData) {
  if (field.type === 'checkbox') return formData.has(field.name);
  const value = formData.get(field.name);
  if (field.type === 'number') return value === '' ? null : Number(value);
  if (field.type === 'datetime-local') return value ? new Date(String(value)).toISOString() : null;
  return String(value || '').trim();
}

function showFailure(error) {
  console.error('Unable to manage record:', error);
  Swal.fire({
    icon: 'error',
    title: 'บันทึกข้อมูลไม่สำเร็จ',
    text: error.message || 'โปรดลองอีกครั้ง',
    confirmButtonText: 'ตกลง',
  });
}

export function mountAdminCrudDialog(canManage, onSaved) {
  if (document.querySelector('#admin-record-dialog')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <dialog class="request-dialog admin-record-dialog" id="admin-record-dialog" aria-labelledby="admin-record-title">
      <form class="request-form-dialog" id="admin-record-form">
        <div class="dialog-heading"><div><span class="section-kicker">จัดการข้อมูล</span><h2 id="admin-record-title"></h2><p id="admin-record-description"></p></div><button class="icon-button" type="button" data-close-record-dialog aria-label="ปิดแบบฟอร์ม">×</button></div>
        <div class="form-grid" id="admin-record-fields"></div>
        <p class="privacy-note" id="admin-record-note"></p>
        <div class="dialog-actions"><button class="button button-quiet" type="button" data-close-record-dialog>ยกเลิก</button><button class="button button-primary button-large" type="submit">บันทึกข้อมูล</button></div>
      </form>
    </dialog>`);

  const dialog = document.querySelector('#admin-record-dialog');
  const form = document.querySelector('#admin-record-form');
  dialog.querySelectorAll('[data-close-record-dialog]').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-record-action]');
    if (!button) return;
    event.preventDefault();
    const collection = button.dataset.collection;
    const definition = definitions[collection];
    if (!definition || !canManage(collection)) {
      await Swal.fire({ icon: 'error', title: 'ไม่มีสิทธิ์จัดการเมนูนี้', confirmButtonText: 'รับทราบ' });
      return;
    }

    if (button.dataset.recordAction === 'delete') {
      const recordId = button.dataset.recordId;
      const result = await Swal.fire({
        icon: 'warning',
        title: 'ยืนยันการลบข้อมูล?',
        text: 'รายการนี้จะถูกลบออกจากระบบและไม่สามารถกู้คืนได้',
        showCancelButton: true,
        confirmButtonText: 'ลบรายการ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#c83e3e',
      });
      if (!result.isConfirmed) return;
      try {
        await deleteRecord(collection, recordId);
        const refreshed = await onSaved();
        await Swal.fire({
          icon: refreshed === false ? 'warning' : 'success',
          title: refreshed === false ? 'ลบแล้ว แต่โหลดรายการล่าสุดไม่สำเร็จ' : 'ลบข้อมูลแล้ว',
          timer: refreshed === false ? undefined : 1400,
          showConfirmButton: refreshed === false,
        });
      } catch (error) {
        showFailure(error);
      }
      return;
    }

    const recordId = button.dataset.recordId || '';
    const record = recordId ? collectionRecords(collection).find((item) => item.id === recordId) : null;
    form.dataset.collection = collection;
    form.dataset.recordId = recordId;
    document.querySelector('#admin-record-title').textContent = `${record ? 'แก้ไข' : 'เพิ่ม'}${definition.label}`;
    document.querySelector('#admin-record-description').textContent = record ? 'บันทึกการเปลี่ยนแปลงเพื่ออัปเดตข้อมูลในระบบ' : 'กรอกข้อมูลที่จำเป็นแล้วกดบันทึก';
    document.querySelector('#admin-record-note').textContent = isSupabaseConfigured()
      ? 'ระบบจะบันทึกข้อมูลในฐานข้อมูลกลางตามสิทธิ์ของบัญชีนี้'
      : 'โหมดตัวอย่างจะบันทึกข้อมูลไว้ในเบราว์เซอร์เครื่องนี้';
    document.querySelector('#admin-record-fields').innerHTML = definition.fields.map((field) => renderField(field, record)).join('');
    dialog.showModal();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const collection = form.dataset.collection;
    const definition = definitions[collection];
    if (!definition || !canManage(collection)) return;
    const formData = new FormData(form);
    const values = Object.fromEntries(definition.fields.map((field) => [field.name, readFormValue(field, formData)]));
    const recordId = form.dataset.recordId;
    try {
      if (collection === 'shelters' && values.occupancy > values.capacity) {
        throw new Error('จำนวนผู้เข้าพักต้องไม่เกินความจุของศูนย์');
      }
      if (collection === 'floodPins') {
        values.area = [values.village, values.moo ? `หมู่ ${values.moo}` : '', `ต.${values.subdistrict}`, `อ.${values.district}`].filter(Boolean).join(' · ');
        if (values.latitude < -90 || values.latitude > 90 || values.longitude < -180 || values.longitude > 180) {
          throw new Error('พิกัดละติจูดหรือลองจิจูดอยู่นอกช่วงที่ถูกต้อง');
        }
      }
      if (collection === 'shelters'
        && ((values.latitude !== null && (values.latitude < -90 || values.latitude > 90))
          || (values.longitude !== null && (values.longitude < -180 || values.longitude > 180)))) {
        throw new Error('พิกัดละติจูดหรือลองจิจูดอยู่นอกช่วงที่ถูกต้อง');
      }
      if (collection === 'requests' && !recordId) {
        values.consent = true;
      }
      if (collection === 'floodPins' && !recordId) {
        values.verified = true;
        values.verifiedAt = new Date().toISOString();
      }
      if (collection === 'announcements' && values.expiresAt && new Date(values.expiresAt) <= new Date()) {
        throw new Error('วันหมดอายุต้องอยู่ในอนาคต');
      }
      if (recordId) {
        await updateRecord(collection, recordId, values);
      } else {
        const now = new Date().toISOString();
        values.id = createId(definition.prefix);
        values.createdAt = now;
        if (collection === 'floodPins') values.verifiedAt = now;
        await createRecord(collection, values);
      }
      dialog.close();
      const refreshed = await onSaved();
      await Swal.fire({
        icon: refreshed === false ? 'warning' : 'success',
        title: refreshed === false ? 'บันทึกแล้ว แต่โหลดรายการล่าสุดไม่สำเร็จ' : 'บันทึกข้อมูลแล้ว',
        timer: refreshed === false ? undefined : 1400,
        showConfirmButton: refreshed === false,
      });
    } catch (error) {
      showFailure(error);
    }
  });
}
