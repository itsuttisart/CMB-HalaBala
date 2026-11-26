const configuration = window.CMB_SUPABASE_CONFIG || {};

/**
 * ตรวจว่ามีการกรอกค่า url หรือ anonKey ใน supabase-config.js หรือไม่ (false = โหมดตัวอย่าง)
 */
export function hasSupabaseConfiguration() {
  return Boolean(configuration.url || configuration.anonKey);
}

/**
 * ตรวจความถูกต้องของค่าตั้งค่า Supabase
 * @returns {string} ข้อความ error ภาษาไทย หรือ "" ถ้าถูกต้อง
 */
export function getSupabaseConfigurationError() {
  if (!hasSupabaseConfiguration()) return '';
  try {
    const projectUrl = new URL(configuration.url);
    if (projectUrl.protocol !== 'https:' || !projectUrl.hostname.endsWith('.supabase.co')) {
      return 'Project URL ต้องเป็น HTTPS URL ของ Supabase เช่น https://project-id.supabase.co';
    }
    if (typeof configuration.anonKey !== 'string'
      || configuration.anonKey.length <= 20
      || configuration.anonKey.includes('YOUR_')) {
      return 'กรุณาใส่ publishable key หรือ anon key จาก Supabase';
    }
    return '';
  } catch {
    return 'Project URL ใน supabase-config.js ไม่ถูกต้อง';
  }
}

/**
 * คืน true เมื่อตั้งค่า Supabase ครบและถูกต้อง พร้อมใช้งานจริง
 */
export function isSupabaseConfigured() {
  return hasSupabaseConfiguration() && !getSupabaseConfigurationError();
}

let clientPromise;

/**
 * โหลดไลบรารี supabase-js (เฉพาะครั้งแรก) แล้วสร้าง client ใช้ร่วมกันทั้งแอป
 * @returns {Promise<object|null>} null เมื่อไม่ได้ตั้งค่า Supabase
 */
export function getSupabaseClient() {
  if (!hasSupabaseConfiguration()) return Promise.resolve(null);
  const configurationError = getSupabaseConfigurationError();
  if (configurationError) return Promise.reject(new Error(configurationError));
  if (!clientPromise) {
    clientPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'node_modules/@supabase/supabase-js/dist/umd/supabase.js';
      script.onload = () => {
        const createClient = window.supabase && window.supabase.createClient;
        if (typeof createClient !== 'function') {
          reject(new Error('Supabase JavaScript client did not load correctly.'));
          return;
        }
        resolve(createClient(configuration.url, configuration.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        }));
      };
      script.onerror = () => reject(new Error('Unable to load the Supabase JavaScript client.'));
      document.head.append(script);
    });
  }
  return clientPromise;
}

/**
 * ดึงโปรไฟล์เจ้าหน้าที่ (role, เมนูที่ดูแล) จากตาราง admin_profiles
 * @param {string} userId - auth user id
 * @throws ถ้าไม่มีสิทธิ์หรือบัญชีถูกระงับ
 */
export async function fetchAdminProfile(userId) {
  const client = await getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  const { data, error } = await client
    .from('admin_profiles')
    .select('user_id, email, display_name, role, modules, is_active')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.is_active) throw new Error('บัญชีนี้ยังไม่ได้รับสิทธิ์หรือถูกระงับการใช้งาน');
  return data;
}
