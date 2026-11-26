import { getSupabaseClient } from '../supabase-client.js';
import { escapeHtml, formatTime } from '../utils.js';

export const ADMIN_MODULES = [
  { key: 'requests', label: 'คำร้องขอความช่วยเหลือ' },
  { key: 'flood-monitor', label: 'อัปเดตสถานการณ์น้ำท่วม' },
  { key: 'map', label: 'แผนที่สถานการณ์' },
  { key: 'shelters', label: 'ศูนย์พักพิง' },
  { key: 'supplies', label: 'คลังสิ่งของ' },
  { key: 'volunteers', label: 'อาสาสมัครและทีม' },
  { key: 'announcements', label: 'ข่าวประกาศ' },
];

export let managedAdmins = [];

/**
 * เรียก Edge Function "admin-users" (list/create/update/delete) พร้อมแปลง error เป็นข้อความไทยที่เข้าใจง่าย
 * @param {object} body - { action, ... }
 */
async function callAdminFunction(body) {
  const client = await getSupabaseClient();
  if (!client) throw new Error('กรุณาตั้งค่า Supabase ก่อนจัดการบัญชี');
  const { data, error } = await client.functions.invoke('admin-users', { body });
  if (error) {
    let message = error.message;
    if (error.context?.status === 404) {
      message = 'ไม่พบ Edge Function admin-users ใน Supabase โปรเจกต์นี้ ตรวจ Project URL และ deploy ฟังก์ชันพร้อมตั้ง SUPABASE_SERVICE_ROLE_KEY ตาม README ก่อน แล้วลองอีกครั้ง';
    } else if (error.name === 'FunctionsFetchError') {
      message = 'เชื่อมต่อ Edge Function admin-users ไม่สำเร็จ ตรวจสอบการ deploy, CORS และการเชื่อมต่อเครือข่าย';
    } else if (error.context && typeof error.context.json === 'function') {
      try {
        const responseBody = await error.context.json();
        if (responseBody.error || responseBody.message) message = responseBody.error || responseBody.message;
      } catch {
        message = error.message;
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * โหลดรายชื่อผู้ดูแลเมนูจาก Edge Function เก็บไว้ใน managedAdmins
 */
export async function loadManagedAdmins() {
  const result = await callAdminFunction({ action: 'list' });
  managedAdmins = Array.isArray(result.users)
    ? result.users.filter((admin) => admin.role === 'module_admin')
    : [];
}

/**
 * แปลงรหัสเมนูเป็นชื่อภาษาไทย คั่นด้วย " · "
 */
function moduleNames(modules) {
  const labels = new Map(ADMIN_MODULES.map((module) => [module.key, module.label]));
  return (modules || []).map((module) => labels.get(module) || module).join(' · ');
}

/**
 * สร้าง HTML หน้า "ผู้ดูแลและสิทธิ์" (ตาราง + กล่องเชิญ/แก้ไขผู้ดูแล)
 */
export function renderAdminUsers() {
  return `
    <div class="page-heading"><div><span class="eyebrow">สิทธิ์และบัญชี</span><h1>จัดการบัญชีผู้ดูแล</h1><p>เชิญเจ้าหน้าที่และกำหนดสิทธิ์แยกตามเมนูได้จากหน้านี้</p></div><button class="button button-primary" data-admin-user-action="create">＋ เชิญผู้ดูแล</button></div>
    <div class="info-banner">กด “เชิญผู้ดูแล” กรอกอีเมลและชื่อ เลือกเมนูที่รับผิดชอบ แล้วส่งคำเชิญทางอีเมล ภายหลังแก้ไขสิทธิ์ ระงับ หรือถอนบัญชีได้ที่นี่ ไม่ต้องแก้โค้ด · การตั้ง superadmin บัญชีแรกเป็นขั้นตอนเริ่มต้นครั้งเดียว</div>
    <section class="admin-users-guide" aria-label="ขั้นตอนเชิญผู้ดูแล">
      <div><span>01</span><strong>ระบุอีเมล</strong><small>ส่งคำเชิญให้ตั้งรหัสผ่าน</small></div>
      <div><span>02</span><strong>เลือกสิทธิ์เมนู</strong><small>กำหนดเฉพาะงานที่ดูแล</small></div>
      <div><span>03</span><strong>จัดการภายหลัง</strong><small>แก้ไข ระงับ หรือลบบัญชี</small></div>
    </section>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>ชื่อ / อีเมล</th><th>เมนูที่ได้รับมอบหมาย</th><th>สถานะ</th><th>วันที่สร้าง</th><th>จัดการ</th></tr></thead><tbody>${managedAdmins.length ? managedAdmins.map((admin) => `
      <tr>
        <td data-label="ชื่อ / อีเมล"><div class="table-primary">${escapeHtml(admin.display_name)}</div><div class="table-secondary">${escapeHtml(admin.email)}</div></td>
        <td data-label="เมนูที่ได้รับมอบหมาย">${escapeHtml(moduleNames(admin.modules))}</td>
        <td data-label="สถานะ"><span class="status-pill ${admin.is_active ? 'status-done' : ''}">${admin.is_active ? 'ใช้งานได้' : 'ระงับแล้ว'}</span></td>
        <td data-label="วันที่สร้าง">${formatTime(admin.created_at)}</td>
        <td data-label="จัดการ"><div class="record-actions"><button class="button button-outline button-small" data-admin-user-action="edit" data-admin-user-id="${escapeHtml(admin.user_id)}">แก้ไข</button><button class="button button-quiet button-small" data-admin-user-action="delete" data-admin-user-id="${escapeHtml(admin.user_id)}">ลบ</button></div></td>
      </tr>`).join('') : '<tr><td colspan="5"><div class="empty-state"><strong>ยังไม่มีผู้ดูแลเมนู</strong>กด “เชิญผู้ดูแล” เพื่อส่งคำเชิญทางอีเมล</div></td></tr>'}</tbody></table></div>
    <dialog class="request-dialog admin-user-dialog" id="admin-user-dialog" aria-labelledby="admin-user-title">
      <form class="request-form-dialog" id="admin-user-form">
        <div class="dialog-heading"><div><span class="section-kicker">สิทธิ์เจ้าหน้าที่</span><h2 id="admin-user-title"></h2><p>กำหนดเมนูที่บัญชีนี้สามารถดูและแก้ไขได้</p></div><button class="icon-button" type="button" data-close-admin-user>×</button></div>
        <label class="login-field">อีเมลสำหรับเข้าสู่ระบบ<input name="email" type="email" autocomplete="email" required /></label>
        <label class="login-field">ชื่อผู้ดูแล<input name="displayName" maxlength="100" required /></label>
        <fieldset class="admin-module-options"><legend>เมนูที่ได้รับมอบหมาย <span class="required">*</span></legend>${ADMIN_MODULES.map((module) => `
          <label><input type="checkbox" name="modules" value="${module.key}" /><span>${module.label}</span></label>`).join('')}
        </fieldset>
        <label class="admin-record-checkbox" id="admin-user-active-row"><input name="isActive" type="checkbox" checked /><span>บัญชีนี้ใช้งานได้</span></label>
        <input type="hidden" name="userId" />
        <p class="privacy-note">ระบบจะส่งอีเมลเชิญให้ตั้งรหัสผ่าน บัญชีที่ถูกระงับจะเข้าถึงข้อมูลไม่ได้</p>
        <div class="dialog-actions"><button class="button button-quiet" type="button" data-close-admin-user>ยกเลิก</button><button class="button button-primary button-large" type="submit">บันทึกบัญชี</button></div>
      </form>
    </dialog>`;
}

/**
 * ผูกปุ่มเชิญ/แก้ไข/ลบ/บันทึกบัญชีผู้ดูแล (ผูกครั้งเดียวต่อ container)
 * @param {HTMLElement} container
 * @param {Function} onChanged - เรียกหลังเปลี่ยนข้อมูลเพื่อวาดหน้าใหม่
 */
export function bindAdminUserControls(container, onChanged) {
  if (container.dataset.adminUsersBound === 'true') return;
  container.dataset.adminUsersBound = 'true';
  container.addEventListener('click', async (event) => {
    const closeButton = event.target.closest('[data-close-admin-user]');
    if (closeButton) {
      container.querySelector('#admin-user-dialog')?.close();
      return;
    }
    const button = event.target.closest('[data-admin-user-action]');
    if (!button) return;
    const dialog = container.querySelector('#admin-user-dialog');
    const form = container.querySelector('#admin-user-form');
    if (!dialog || !form) return;
    const action = button.dataset.adminUserAction;
    if (action === 'delete') {
      const target = managedAdmins.find((admin) => admin.user_id === button.dataset.adminUserId);
      if (!target) return;
      const result = await Swal.fire({
        icon: 'warning',
        title: 'ลบบัญชีผู้ดูแล?',
        text: `บัญชี ${target.email} จะถูกลบและไม่สามารถเข้าสู่ระบบได้`,
        showCancelButton: true,
        confirmButtonText: 'ลบบัญชี',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#c83e3e',
      });
      if (!result.isConfirmed) return;
      try {
        await callAdminFunction({ action: 'delete', userId: target.user_id });
        await onChanged();
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'ลบบัญชีไม่สำเร็จ', text: error.message, confirmButtonText: 'ตกลง' });
      }
      return;
    }

    form.reset();
    const target = action === 'edit'
      ? managedAdmins.find((admin) => admin.user_id === button.dataset.adminUserId)
      : null;
    if (action === 'edit' && !target) return;
    form.dataset.action = action;
    form.elements.email.disabled = Boolean(target);
    form.elements.email.value = target?.email || '';
    form.elements.displayName.value = target?.display_name || '';
    form.elements.userId.value = target?.user_id || '';
    form.elements.isActive.checked = target ? target.is_active : true;
    container.querySelector('#admin-user-active-row').hidden = !target;
    form.querySelectorAll('input[name="modules"]').forEach((input) => {
      input.checked = target ? target.modules.includes(input.value) : false;
    });
    container.querySelector('#admin-user-title').textContent = target ? 'แก้ไขสิทธิ์ผู้ดูแล' : 'เชิญผู้ดูแลเมนู';
    dialog.showModal();
  });

  container.addEventListener('submit', async (event) => {
    const form = event.target.closest('#admin-user-form');
    if (!form) return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    const modules = [...form.querySelectorAll('input[name="modules"]:checked')].map((input) => input.value);
    if (!modules.length) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกอย่างน้อยหนึ่งเมนู', confirmButtonText: 'รับทราบ' });
      return;
    }
    const payload = {
      action: form.dataset.action === 'create' ? 'create' : 'update',
      email: form.elements.email.value.trim(),
      displayName: form.elements.displayName.value.trim(),
      modules,
      userId: form.elements.userId.value,
      isActive: form.elements.isActive.checked,
    };
    try {
      await callAdminFunction(payload);
      container.querySelector('#admin-user-dialog').close();
      await onChanged();
      Swal.fire({
        icon: 'success',
        title: payload.action === 'create' ? 'ส่งคำเชิญแล้ว' : 'อัปเดตบัญชีแล้ว',
        text: payload.action === 'create' ? 'ส่งอีเมลเชิญให้ผู้ดูแลตั้งรหัสผ่านแล้ว' : '',
        confirmButtonText: 'รับทราบ',
      });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'บันทึกบัญชีไม่สำเร็จ', text: error.message, confirmButtonText: 'ตกลง' });
    }
  });
}
