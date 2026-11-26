import {
  FLOOD_STATUSES,
  floodPins as sampleFloodPins,
  requests as sampleRequests,
  shelters as sampleShelters,
  supplies as sampleSupplies,
} from './data.js';
import { getSupabaseClient, hasSupabaseConfiguration } from './supabase-client.js';

const initialVolunteerTeams = [
  { id: 'VT-001', name: 'ทีมอพยพพื้นที่ทุ่งยาว', status: 'กำลังปฏิบัติงาน', mission: 'ประเมินพื้นที่และช่วยเคลื่อนย้ายผู้สูงอายุ', headcount: 4, equipment: 'เรือ 1 ลำ' },
  { id: 'VT-002', name: 'ทีมขนส่งสิ่งของ', status: 'พร้อมสนับสนุน', mission: 'เตรียมส่งน้ำดื่มและอาหารแห้ง', headcount: 5, equipment: 'รถกระบะ 2 คัน' },
  { id: 'VT-003', name: 'ทีมปฐมพยาบาล', status: 'กำลังปฏิบัติงาน', mission: 'สนับสนุนจุดพักพิงและคัดกรองผู้ป่วย', headcount: 3, equipment: 'ชุดปฐมพยาบาล' },
];

const initialAnnouncements = [
  { id: 'AN-001', tag: 'เฝ้าระวัง', title: 'ติดตามระดับน้ำในพื้นที่ลุ่มต่ำ', details: 'ขอให้ประชาชนติดตามประกาศจากหน่วยงานท้องถิ่นและเตรียมของจำเป็นให้พร้อม', isPublished: true, expiresAt: '' },
  { id: 'AN-002', tag: 'ศูนย์พักพิง', title: 'ตรวจสอบจุดพักพิงก่อนเดินทาง', details: 'กรุณาติดต่อผู้ดูแลศูนย์เพื่อยืนยันสถานะ ความจุ และเส้นทางที่ปลอดภัย', isPublished: true, expiresAt: '' },
  { id: 'AN-003', tag: 'ช่องทางช่วยเหลือ', title: 'แจ้งเหตุฉุกเฉินผ่านสายด่วน ปภ. 1784', details: 'หากเป็นเหตุเร่งด่วน โปรดติดต่อหน่วยงานฉุกเฉินโดยตรง ไม่ใช้ต้นแบบนี้แทนช่องทางแจ้งเหตุจริง', isPublished: true, expiresAt: '' },
];

const collections = {
  requests: {
    table: 'help_requests',
    storageKey: 'cmb-halabala-requests',
    fields: {
      id: 'id', name: 'name', phone: 'phone', location: 'location', need: 'need',
      people: 'people', details: 'details', urgent: 'urgent', consent: 'consent',
      status: 'status', createdAt: 'created_at',
    },
  },
  floodPins: {
    table: 'flood_reports',
    storageKey: 'cmb-halabala-flood-pins',
    fields: {
      id: 'id', area: 'area', village: 'village', moo: 'moo', subdistrict: 'subdistrict',
      district: 'district', latitude: 'latitude', longitude: 'longitude', status: 'status',
      waterLevel: 'water_level', details: 'details', imageUrl: 'image_url', videoUrl: 'video_url',
      imageName: 'image_name', videoName: 'video_name', verified: 'verified',
      verifiedAt: 'verified_at', createdBy: 'created_by', createdAt: 'created_at',
    },
  },
  shelters: {
    table: 'emergency_shelters',
    storageKey: 'cmb-halabala-shelters',
    fields: {
      id: 'id', name: 'name', location: 'location', occupancy: 'occupancy', capacity: 'capacity',
      facilities: 'facilities', latitude: 'latitude', longitude: 'longitude',
      isActive: 'is_active', isPublished: 'is_published', createdAt: 'created_at',
    },
  },
  supplies: {
    table: 'relief_supplies',
    storageKey: 'cmb-halabala-supplies',
    fields: {
      id: 'id', name: 'name', category: 'category', amount: 'amount', unit: 'unit',
      status: 'status', createdAt: 'created_at',
    },
  },
  volunteers: {
    table: 'volunteer_teams',
    storageKey: 'cmb-halabala-volunteers',
    fields: {
      id: 'id', name: 'name', status: 'status', mission: 'mission', headcount: 'headcount',
      equipment: 'equipment', createdAt: 'created_at',
    },
  },
  announcements: {
    table: 'public_announcements',
    storageKey: 'cmb-halabala-announcements',
    fields: {
      id: 'id', title: 'title', tag: 'tag', details: 'details',
      isPublished: 'is_published', expiresAt: 'expires_at', createdAt: 'created_at',
    },
  },
};

/**
 * โหลดข้อมูลชุดหนึ่งสำหรับโหมดตัวอย่างจาก localStorage (ถ้าต่อ Supabase แล้วคืนรายการว่าง)
 */
function demoCollection(collection, fallback) {
  if (hasSupabaseConfiguration()) return [];
  let rows = fallback;
  try {
    const stored = localStorage.getItem(collections[collection].storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) rows = parsed;
      else console.error(`Saved ${collection} data is not a list.`);
    }
  } catch (error) {
    console.error(`Unable to load local ${collection} data:`, error);
  }
  const prefixes = { shelters: 'SH', supplies: 'SP' };
  return rows.map((record, index) => ({
    ...record,
    id: record.id || `${prefixes[collection] || collection}-${String(index + 1).padStart(3, '0')}`,
    ...(collection === 'shelters' ? { isActive: record.isActive !== false, isPublished: record.isPublished !== false } : {}),
    ...(collection === 'announcements' ? { isPublished: record.isPublished !== false } : {}),
  }));
}

export let requests = demoCollection('requests', sampleRequests);
export let floodPins = demoCollection('floodPins', sampleFloodPins);
export let shelters = demoCollection('shelters', sampleShelters);
export let supplies = demoCollection('supplies', sampleSupplies);
export let volunteers = demoCollection('volunteers', initialVolunteerTeams);
export let announcements = demoCollection('announcements', initialAnnouncements);

/**
 * กำหนดค่าให้ตัวแปรข้อมูลกลาง (requests, floodPins, shelters, ...) ตามชื่อชุดข้อมูล
 */
function assignCollection(name, rows) {
  if (name === 'requests') requests = rows;
  else if (name === 'floodPins') floodPins = rows;
  else if (name === 'shelters') shelters = rows;
  else if (name === 'supplies') supplies = rows;
  else if (name === 'volunteers') volunteers = rows;
  else if (name === 'announcements') announcements = rows;
  else throw new Error(`Unknown data collection: ${name}`);
}

/**
 * แปลงแถวจากฐานข้อมูล (ชื่อคอลัมน์ snake_case) เป็น object ที่แอปใช้
 */
function fromDatabase(name, row) {
  const fields = collections[name].fields;
  return Object.fromEntries(Object.entries(fields)
    .filter(([, column]) => Object.hasOwn(row, column))
    .map(([property, column]) => [property, row[column]]));
}

/**
 * แปลง object ของแอปเป็นแถวสำหรับบันทึกลงฐานข้อมูล
 */
function toDatabase(name, record) {
  const fields = collections[name].fields;
  return Object.fromEntries(Object.entries(fields)
    .filter(([property]) => Object.hasOwn(record, property))
    .map(([property, column]) => [column, record[property]]));
}

/**
 * ดึงข้อมูลทุกชุดจาก Supabase มาแทนข้อมูลในหน่วยความจำ (เรียกหลังล็อกอินและหลังแก้ไขข้อมูล)
 */
export async function refreshRemoteData() {
  if (!hasSupabaseConfiguration()) return;
  const client = await getSupabaseClient();
  if (!client) throw new Error('Supabase client is unavailable.');
  const names = Object.keys(collections);
  const results = await Promise.all(names.map(async (name) => {
    const { data, error } = await client
      .from(collections[name].table)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return [name, data.map((row) => fromDatabase(name, row))];
  }));
  results.forEach(([name, rows]) => assignCollection(name, rows));
}

/**
 * บันทึกข้อมูลชุดหนึ่งลง localStorage (โหมดตัวอย่าง)
 */
function persistDemoCollection(name, rows) {
  try {
    localStorage.setItem(collections[name].storageKey, JSON.stringify(rows));
  } catch (error) {
    console.error(`Unable to save local ${name} data:`, error);
    throw new Error('เบราว์เซอร์ไม่สามารถจัดเก็บข้อมูลนี้ได้');
  }
}

/**
 * เพิ่มรายการใหม่ (Supabase หรือ localStorage)
 * @param {string} name - ชื่อชุดข้อมูล เช่น "shelters"
 * @param {object} record
 */
export async function createRecord(name, record) {
  const definition = collections[name];
  if (!definition) throw new Error(`Unknown data collection: ${name}`);
  const client = await getSupabaseClient();
  if (client) {
    const { error } = await client.from(definition.table).insert(toDatabase(name, record));
    if (error) throw error;
  } else {
    const current = ({ requests, floodPins, shelters, supplies, volunteers, announcements })[name];
    persistDemoCollection(name, [record, ...current]);
    assignCollection(name, [record, ...current]);
  }
  return record;
}

/**
 * แก้ไขรายการตาม id
 * @param {string} name
 * @param {string} id
 * @param {object} updates - ฟิลด์ที่เปลี่ยน
 */
export async function updateRecord(name, id, updates) {
  const definition = collections[name];
  if (!definition) throw new Error(`Unknown data collection: ${name}`);
  const current = ({ requests, floodPins, shelters, supplies, volunteers, announcements })[name];
  const existing = current.find((record) => record.id === id);
  if (!existing) throw new Error('ไม่พบข้อมูลที่ต้องการแก้ไข');
  const updated = { ...existing, ...updates };
  const client = await getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from(definition.table)
      .update(toDatabase(name, updates))
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('ไม่พบข้อมูลที่ต้องการแก้ไข หรือบัญชีไม่มีสิทธิ์จัดการ');
  } else {
    persistDemoCollection(name, current.map((record) => record.id === id ? updated : record));
  }
  assignCollection(name, current.map((record) => record.id === id ? updated : record));
  return updated;
}

/**
 * ลบรายการตาม id
 * @param {string} name
 * @param {string} id
 */
export async function deleteRecord(name, id) {
  const definition = collections[name];
  if (!definition) throw new Error(`Unknown data collection: ${name}`);
  const current = ({ requests, floodPins, shelters, supplies, volunteers, announcements })[name];
  const client = await getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from(definition.table)
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('ไม่พบข้อมูลที่ต้องการลบ หรือบัญชีไม่มีสิทธิ์จัดการ');
  } else {
    persistDemoCollection(name, current.filter((record) => record.id !== id));
  }
  assignCollection(name, current.filter((record) => record.id !== id));
}

/**
 * นับจำนวนหมุดน้ำท่วมแยกตามสถานะ (ข้อมูลที่โหลดอยู่ปัจจุบัน)
 */
export function getFloodCounts() {
  return Object.fromEntries(FLOOD_STATUSES.map((status) => [
    status.label,
    floodPins.filter((pin) => pin.status === status.label).length,
  ]));
}

/**
 * คืนข้อมูลสถานะน้ำท่วม (สี/คลาส) จากชื่อสถานะ ถ้าไม่พบใช้ "เฝ้าระวัง"
 */
export function getFloodStatus(status) {
  return FLOOD_STATUSES.find((item) => item.label === status) || FLOOD_STATUSES[1];
}

/**
 * สรุปจำนวนทีมอาสาและจำนวนคนที่พร้อมสนับสนุน (ใช้บนแดชบอร์ด)
 */
export function getVolunteerSummary() {
  return {
    teams: volunteers.length,
    available: volunteers
      .filter((team) => team.status === 'พร้อมสนับสนุน')
      .reduce((total, team) => total + Number(team.headcount || 0), 0),
  };
}
