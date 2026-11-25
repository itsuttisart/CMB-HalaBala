export const STORAGE_KEY = 'cmb-halabala-requests';
export const FLOOD_STORAGE_KEY = 'cmb-halabala-flood-pins';
export const DEFAULT_MAP_CENTER = { lat: 6.119966, lng: 101.187845 };

export const FLOOD_STATUSES = [
  { label: 'ปกติ', key: 'normal', className: 'flood-normal', color: '#16a875' },
  { label: 'เฝ้าระวัง', key: 'watch', className: 'flood-watch', color: '#3e83f7' },
  { label: 'เสี่ยงสูง', key: 'high', className: 'flood-high', color: '#f0b323' },
  { label: 'วิกฤต', key: 'critical', className: 'flood-critical', color: '#e34444' },
];

export const pages = {
  dashboard: { title: 'ภาพรวมสถานการณ์', eyebrow: 'ศูนย์บัญชาการ', description: 'ติดตามภาพรวมและประสานความช่วยเหลือในพื้นที่' },
  requests: { title: 'คำร้องขอความช่วยเหลือ', eyebrow: 'จัดการเหตุ', description: 'ตรวจสอบ จัดลำดับ และติดตามคำร้องจากประชาชน' },
  'flood-monitor': { title: 'อัปเดตสถานการณ์น้ำท่วม', eyebrow: 'FLOOD MONITOR', description: 'ตรวจสอบหมุดรายงานและปรับปรุงสถานการณ์ในพื้นที่' },
  map: { title: 'แผนที่สถานการณ์', eyebrow: 'ข้อมูลพื้นที่', description: 'จุดเสี่ยง เส้นทาง และตำแหน่งศูนย์ช่วยเหลือ' },
  shelters: { title: 'ศูนย์พักพิง', eyebrow: 'จุดช่วยเหลือ', description: 'ความพร้อมและจำนวนผู้รองรับของแต่ละศูนย์' },
  supplies: { title: 'คลังสิ่งของ', eyebrow: 'ทรัพยากร', description: 'ติดตามสิ่งของจำเป็นและการกระจายความช่วยเหลือ' },
  volunteers: { title: 'อาสาสมัครและทีม', eyebrow: 'กำลังสนับสนุน', description: 'ประสานทีมปฏิบัติงานและกำลังอาสาสมัคร' },
  announcements: { title: 'ข่าวประกาศ', eyebrow: 'สื่อสารสาธารณะ', description: 'ประกาศสถานการณ์และข้อมูลที่ประชาชนควรทราบ' },
  'admin-users': { title: 'จัดการบัญชีผู้ดูแล', eyebrow: 'สิทธิ์และบัญชี', description: 'เชิญเจ้าหน้าที่และกำหนดสิทธิ์แยกตามเมนู' },
};

const defaultFloodPins = [
  { id: 'FM-001', area: 'จุดตัวอย่าง A', village: 'จุดตัวอย่าง A', subdistrict: 'บาเจาะ', district: 'บาเจาะ', latitude: 6.129966, longitude: 101.187845, status: 'วิกฤต', waterLevel: 'ระดับเข่า–เอว', details: 'ข้อมูลจำลองสำหรับแสดงตัวอย่างเท่านั้น', verified: false, createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: 'FM-002', area: 'จุดตัวอย่าง B', village: 'จุดตัวอย่าง B', subdistrict: 'บาเจาะ', district: 'บาเจาะ', latitude: 6.119966, longitude: 101.202845, status: 'เสี่ยงสูง', waterLevel: 'ระดับตาตุ่ม–เข่า', details: 'ข้อมูลจำลองสำหรับแสดงตัวอย่างเท่านั้น', verified: false, createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString() },
  { id: 'FM-003', area: 'จุดตัวอย่าง C', village: 'จุดตัวอย่าง C', subdistrict: 'บาเจาะ', district: 'บาเจาะ', latitude: 6.104966, longitude: 101.183845, status: 'เฝ้าระวัง', waterLevel: 'ไม่ทราบ', details: 'ข้อมูลจำลองสำหรับแสดงตัวอย่างเท่านั้น', verified: false, createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString() },
  { id: 'FM-004', area: 'จุดตัวอย่าง D', village: 'จุดตัวอย่าง D', subdistrict: 'บาเจาะ', district: 'บาเจาะ', latitude: 6.119966, longitude: 101.168845, status: 'ปกติ', waterLevel: 'ไม่ทราบ', details: 'ข้อมูลจำลองสำหรับแสดงตัวอย่างเท่านั้น', verified: false, createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString() },
  { id: 'FM-005', area: 'จุดตัวอย่าง E', village: 'จุดตัวอย่าง E', subdistrict: 'บาเจาะ', district: 'บาเจาะ', latitude: 6.135966, longitude: 101.173845, status: 'เฝ้าระวัง', waterLevel: 'ต่ำกว่าตาตุ่ม', details: 'ข้อมูลจำลองสำหรับแสดงตัวอย่างเท่านั้น', verified: false, createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString() },
];

const defaultRequests = [
  { id: 'HB-2601', name: 'ไม่ประสงค์ออกนาม', phone: '', location: 'บ้านทุ่งยาว · ต.บาเจาะ', need: 'อพยพ / ติดค้าง', people: 4, details: 'มีผู้สูงอายุ 1 คน ระดับน้ำเพิ่มขึ้น', urgent: true, status: 'รอประสานงาน', createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
  { id: 'HB-2602', name: 'ไม่ประสงค์ออกนาม', phone: '', location: 'ชุมชนตลาดเก่า · ต.บาเจาะ', need: 'อาหารและน้ำดื่ม', people: 3, details: 'ต้องการน้ำดื่มและอาหารแห้ง', urgent: false, status: 'กำลังดำเนินการ', createdAt: new Date(Date.now() - 48 * 60 * 1000).toISOString() },
  { id: 'HB-2603', name: 'ไม่ประสงค์ออกนาม', phone: '', location: 'หมู่ 4 · ต.บาเจาะ', need: 'ยาและการแพทย์', people: 1, details: 'ต้องการยาประจำตัว', urgent: false, status: 'ช่วยเหลือแล้ว', createdAt: new Date(Date.now() - 125 * 60 * 1000).toISOString() },
];

export const shelters = [
  { name: 'ศูนย์โรงเรียนบ้านบาเจาะ', location: 'ต.บาเจาะ', occupancy: 68, capacity: 100, facilities: 'อาหาร · น้ำดื่ม · ห้องน้ำ' },
  { name: 'อาคารอเนกประสงค์เทศบาล', location: 'ต.บาเจาะ', occupancy: 42, capacity: 80, facilities: 'อาหาร · จุดปฐมพยาบาล' },
  { name: 'ศูนย์ชุมชนทุ่งยาว', location: 'ต.บาเจาะ', occupancy: 24, capacity: 60, facilities: 'น้ำดื่ม · ห้องน้ำ' },
];

export const supplies = [
  { name: 'น้ำดื่ม', category: 'อาหารและน้ำ', amount: '320', unit: 'แพ็ก', status: 'พร้อมจ่าย' },
  { name: 'อาหารแห้ง', category: 'อาหารและน้ำ', amount: '145', unit: 'ชุด', status: 'พร้อมจ่าย' },
  { name: 'ชุดปฐมพยาบาล', category: 'การแพทย์', amount: '28', unit: 'ชุด', status: 'คงเหลือน้อย' },
  { name: 'เสื้อชูชีพ', category: 'อุปกรณ์กู้ภัย', amount: '16', unit: 'ตัว', status: 'พร้อมจ่าย' },
];

export const volunteerSummary = { teams: 3, available: 12 };

function readStorage(key, fallback, validator) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [...fallback];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      console.error(`Saved data for ${key} is not a list.`);
      return [...fallback];
    }
    const valid = parsed.filter(validator);
    if (valid.length !== parsed.length) console.error(`Some invalid records in ${key} were ignored.`);
    return valid;
  } catch (error) {
    console.error(`Unable to load saved data for ${key}:`, error);
    return [...fallback];
  }
}

function isRequest(request) {
  return request && typeof request.id === 'string' && typeof request.location === 'string';
}

function normalizeFloodPin(pin) {
  if (!pin || typeof pin.id !== 'string' || typeof pin.area !== 'string'
    || !FLOOD_STATUSES.some((status) => status.label === pin.status)) return null;

  const rawLatitude = pin.latitude ?? pin.lat;
  const rawLongitude = pin.longitude ?? pin.lng;
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);
  const hasCoordinates = rawLatitude !== null && rawLatitude !== undefined && String(rawLatitude).trim() !== ''
    && rawLongitude !== null && rawLongitude !== undefined && String(rawLongitude).trim() !== ''
    && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;

  return {
    id: pin.id,
    area: pin.area,
    village: typeof pin.village === 'string' ? pin.village : '',
    moo: typeof pin.moo === 'string' || typeof pin.moo === 'number' ? String(pin.moo) : '',
    subdistrict: typeof pin.subdistrict === 'string' ? pin.subdistrict : '',
    district: typeof pin.district === 'string' ? pin.district : '',
    latitude: hasCoordinates ? latitude : null,
    longitude: hasCoordinates ? longitude : null,
    status: pin.status,
    waterLevel: typeof pin.waterLevel === 'string' ? pin.waterLevel : '',
    details: typeof pin.details === 'string' ? pin.details : '',
    imageUrl: typeof pin.imageUrl === 'string' ? pin.imageUrl : '',
    videoUrl: typeof pin.videoUrl === 'string' ? pin.videoUrl : '',
    imageName: typeof pin.imageName === 'string' ? pin.imageName : '',
    videoName: typeof pin.videoName === 'string' ? pin.videoName : '',
    verified: pin.verified === true,
    verifiedAt: typeof pin.verifiedAt === 'string' ? pin.verifiedAt : '',
    createdAt: typeof pin.createdAt === 'string' ? pin.createdAt : new Date().toISOString(),
  };
}

function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Unable to save data for ${key}:`, error);
    return false;
  }
}

export let requests = readStorage(STORAGE_KEY, defaultRequests, isRequest);
export let floodPins = readStorage(FLOOD_STORAGE_KEY, defaultFloodPins, (pin) => normalizeFloodPin(pin) !== null)
  .map(normalizeFloodPin);

export function getFloodCounts() {
  return Object.fromEntries(FLOOD_STATUSES.map((status) => [
    status.label,
    floodPins.filter((pin) => pin.status === status.label).length,
  ]));
}

export function getFloodStatus(status) {
  return FLOOD_STATUSES.find((item) => item.label === status) || FLOOD_STATUSES[1];
}

export function saveRequests(nextRequests) {
  if (!persist(STORAGE_KEY, nextRequests)) return false;
  requests = nextRequests;
  return true;
}

export function saveFloodPins(nextPins) {
  if (!persist(FLOOD_STORAGE_KEY, nextPins)) return false;
  floodPins = nextPins;
  return true;
}
