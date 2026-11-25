# CMB-HalaBala

เว็บศูนย์ประสานงานช่วยเหลืออุทกภัย ออกแบบ mobile-first ใช้ฟอนต์ Kanit, SweetAlert2 และแผนที่ Geoapify (Leaflet + OpenStreetMap) แยกโค้ดหน้าเว็บตามเมนู พร้อมระบบ Supabase Auth, Postgres และ Row Level Security (RLS)

## เริ่มใช้งาน

```powershell
npm install
python -m http.server 8000
```

เปิด `http://localhost:8000`

## ตั้งค่า Geoapify Maps และ Geocoding

1. สร้าง API key ใน Geoapify และอนุญาต **Map Tiles API** กับ **Geocoding API**
2. จำกัด key ด้วย HTTP referrer/origin และเปิดเฉพาะ API ที่เว็บต้องใช้
3. คัดลอก `geoapify-config.example.js` เป็น `geoapify-config.js` แล้วใส่ key ในไฟล์ local ที่ถูก ignore จาก Git
4. รัน `npm install` เพื่อใช้ Leaflet ที่จัดเก็บในโครงการ

Geoapify key จะถูกส่งจากเบราว์เซอร์ไปกับคำขอแผนที่และค้นหาพิกัด จึงไม่ใช่ secret; จำกัด referrer และ API ใน Geoapify Dashboard ก่อนเผยแพร่เว็บ

## นำเว็บขึ้นโฮสต์ฟรี

เว็บนี้เป็น static site สามารถใช้บริการโฮสต์ static ที่รองรับ HTTPS ได้ การใช้ตำแหน่งจากมือถือจำเป็นต้องเปิดเว็บผ่าน HTTPS (ยกเว้น localhost) และผู้ใช้ต้องอนุญาต Location ในเบราว์เซอร์

ไฟล์ `supabase-config.js` และ `geoapify-config.js` ถูก ignore จาก Git จึงต้องเตรียมไฟล์เหล่านี้ในขั้นตอน deploy ของโฮสต์ด้วย ตั้งค่า allowed redirect/site URL ใน Supabase Auth และจำกัด Geoapify key ให้รับคำขอจากโดเมนจริงเท่านั้น ห้ามนำ Supabase service-role key ไปไว้ในเว็บ

### Deploy ด้วย GitHub Pages

โปรเจกต์มี workflow สำหรับเผยแพร่ไปยัง GitHub Pages เมื่อ push ไปยัง branch `main` หรือเมื่อสั่ง `workflow_dispatch`:

1. สร้าง GitHub repository และ push โค้ดขึ้น branch `main`
2. ใน **Settings → Pages → Build and deployment → Source** เลือก **GitHub Actions** ไม่ใช่ **Deploy from a branch** เพื่อให้ Pages เผยแพร่ไฟล์ที่ build ไว้ใน `dist`
3. ใน **Settings → Secrets and variables → Actions** เพิ่ม repository secrets ชื่อ `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` และ `GEOAPIFY_API_KEY`
4. ตรวจสอบ workflow ที่ **Actions → Deploy to GitHub Pages** และ URL เว็บไซต์ที่ workflow แสดงเมื่อเสร็จ
5. เพิ่ม URL ของเว็บไซต์ใน Supabase Auth → URL Configuration ทั้ง Site URL และ Redirect URLs
6. จำกัด Geoapify key ให้รับคำขอจากโดเมน GitHub Pages ที่เผยแพร่เท่านั้น

Workflow จะสร้างไฟล์ตั้งค่าและ `robots.txt`/`sitemap.xml` ระหว่าง build โดยไม่ commit ค่าตั้งค่าเหล่านั้นลง repository ทั้งนี้ Supabase publishable key และ Geoapify key จำเป็นต้องอยู่ใน JavaScript ที่เบราว์เซอร์ดาวน์โหลดได้ จึงมองเห็นได้สาธารณะหลังเผยแพร่; ห้ามใช้ service-role/secret key และควรเปิด RLS กับจำกัด Geoapify key ตามโดเมน

Google อาจใช้เวลารวบรวมข้อมูล และไม่มีการรับประกันอันดับหรือการแสดงผลจาก metadata เพียงอย่างเดียว หลังเว็บไซต์ออนไลน์แล้ว ให้เพิ่ม URL ใน Google Search Console และส่ง `sitemap.xml` เพื่อเร่งการตรวจพบ

## ตั้งค่า Supabase

### 1. สร้างโปรเจกต์และตั้งค่าเว็บ

สร้างโปรเจกต์ Supabase แล้วใส่ Project URL และ **publishable key/anon key** ใน `supabase-config.js` (ไฟล์ local ถูก ignore จาก Git):

```js
window.CMB_SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_ID.supabase.co',
  anonKey: 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY',
};
```

คีย์ publishable/anon เป็นคีย์ฝั่งเว็บ ใช้ได้เมื่อเปิด RLS ตาม migration แล้วเท่านั้น **ห้ามใส่ service-role key หรือ secret key ในไฟล์เว็บ**

### 2. สร้าง schema และ RLS

เชื่อม Supabase CLI กับโปรเจกต์ แล้วใช้ migration:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

หรือเปิด SQL Editor ใน Supabase Dashboard แล้วรันเนื้อหาใน `supabase/migrations/20261125180000_initial_schema.sql`

ตารางที่สร้าง: `help_requests`, `flood_reports`, `emergency_shelters`, `relief_supplies`, `volunteer_teams`, `public_announcements` และ `admin_profiles` โดยมี RLS แยกสิทธิ์อ่าน/เพิ่ม/แก้ไข/ลบตามเมนู

การแนบรูปหรือวิดีโอใน Flood Monitor ต้องใช้ migration `supabase/migrations/20261125220000_flood_media_storage.sql` เพื่อสร้าง Storage bucket และ policies หากสร้างตารางเดิมไว้แล้ว ให้รัน migration ไฟล์นี้เพิ่มเติมผ่าน `npx supabase db push` หรือ SQL Editor ใน Supabase Dashboard ไฟล์แนบมีขนาดจำกัด รูปไม่เกิน 10 MB และวิดีโอไม่เกิน 50 MB; ลิงก์ตรงของไฟล์เข้าถึงได้โดยผู้ที่มีลิงก์ จึงไม่ควรแนบภาพข้อมูลส่วนบุคคลหรือข้อมูลอ่อนไหว

### 3. สร้างผู้ดูแลสูงสุดบัญชีแรก

เพิ่มผู้ใช้ใน **Authentication → Users** ก่อน จากนั้นรัน SQL นี้ใน SQL Editor โดยแก้อีเมลให้ตรงกับบัญชีที่สร้าง:

```sql
insert into public.admin_profiles (user_id, email, display_name, role, modules)
select
  id,
  email,
  'ผู้ดูแลสูงสุด',
  'superadmin',
  array['requests', 'flood-monitor', 'map', 'shelters', 'supplies', 'volunteers', 'announcements']
from auth.users
where lower(email) = lower('admin@example.com')
on conflict (user_id) do update
set role = excluded.role, modules = excluded.modules, is_active = true;
```

ผู้ดูแลสูงสุดจะเห็นเมนู **จัดการบัญชีผู้ดูแล** ในเว็บ ส่วนผู้ดูแลเมนูจะเห็นและแก้ไขเฉพาะเมนูที่ได้รับมอบหมาย การสร้างบัญชีจากหน้าเว็บจะส่งคำเชิญทางอีเมล; ตั้งค่า Site URL, redirect URL และ SMTP/email provider ใน Supabase Auth ก่อนใช้งานจริง

### 4. Deploy ฟังก์ชันจัดการบัญชี

หน้าจัดการบัญชีเรียก Supabase Edge Function ซึ่งตรวจ session และบทบาทผู้ดูแลสูงสุดทุกครั้ง:

หากหน้าแสดง `Failed to send a request to the Edge Function` หรือ `Requested function was not found` ให้ตรวจว่า deploy `admin-users` ไปยัง Supabase project เดียวกับ URL ที่เว็บไซต์ใช้แล้วหรือยัง

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
npx supabase functions deploy admin-users
```

เก็บ service-role key ไว้ใน Supabase Secrets เท่านั้น ห้ามนำไปใส่ใน JavaScript, HTML, Git หรือส่งผ่านหน้าเว็บ

## เมนูและสิทธิ์

- **คำร้องขอความช่วยเหลือ** — ค้นหา ปรับสถานะ แก้ไข และลบคำร้อง; ข้อมูลติดต่ออ่านได้เฉพาะเจ้าหน้าที่ที่มีสิทธิ์
- **Flood Monitor** — รับรายงานจากประชาชนโดยใช้ GPS, ค้นหาที่อยู่, กรอกพิกัด หรือแตะแผนที่; แนบรูป/วิดีโอผ่าน Supabase Storage; ตรวจสอบ/แก้ไข/ลบหมุด โดยรายงานรอตรวจสอบจะยังไม่เผยแพร่บนแผนที่สาธารณะ
- **ศูนย์พักพิง, คลังสิ่งของ, อาสาสมัคร, ข่าวประกาศ** — เพิ่ม แก้ไข และลบรายการ; ประชาชนเห็นเฉพาะศูนย์พักพิงที่เปิดและเผยแพร่แล้ว กับประกาศที่เผยแพร่
- **แผนที่และแดชบอร์ด** — สรุปข้อมูลที่ผู้ใช้มีสิทธิ์อ่าน
- **จัดการบัญชีผู้ดูแล** — เฉพาะ superadmin เชิญผู้ดูแลเมนู กำหนดเมนู ระงับ หรือถอนบัญชี; superadmin เพิ่ม/เปลี่ยนจาก Supabase Dashboard เท่านั้น

หากยังไม่กรอก Supabase config เว็บจะใช้ข้อมูลตัวอย่างใน localStorage และแสดงปุ่มดูตัวอย่างเจ้าหน้าที่ โดยไม่มีการยืนยันตัวตนจริง

## สื่อและข้อควรทราบ

รูปและวิดีโอที่แนบจะอัปโหลดไปยัง Supabase Storage เมื่อเชื่อมต่อ Supabase และติดตั้ง migration สำหรับสื่อแล้ว; URL สื่อที่กรอกจะเก็บในฐานข้อมูลโดยตรง ไฟล์ใน bucket เป็นสาธารณะสำหรับผู้ที่มีลิงก์ และจะแสดงพร้อมรายงานหลังเจ้าหน้าที่ตรวจสอบ

ก่อนเปิดใช้งานรับเหตุจริง ให้ตรวจสอบนโยบายข้อมูลส่วนบุคคลและระยะเวลาเก็บข้อมูล, ตั้งค่า SMTP, จำกัดการส่งคำร้องสาธารณะด้วย rate limit/CAPTCHA, สำรองฐานข้อมูล และทดสอบ RLS ด้วยบัญชีแต่ละบทบาท รายงานตัวอย่างและข้อมูลในโหมด preview ไม่ใช่ข้อมูลภาคสนามหรือช่องทางแจ้งเหตุฉุกเฉิน; เหตุเร่งด่วนโทร ปภ. 1784

## โครงสร้าง

- `scripts/app.js` — การนำทาง, login, session และเชื่อมหน้าต่าง ๆ
- `scripts/store.js` — อ่าน/เขียนข้อมูล Supabase หรือข้อมูลตัวอย่างใน localStorage
- `scripts/admin-crud.js` — ฟอร์ม CRUD ของเมนูเจ้าหน้าที่
- `scripts/supabase-client.js` — client configuration และโหลด Supabase JS
- `scripts/geoapify-map.js` — แผนที่ Geoapify, tile layer และหมุดสถานการณ์
- `scripts/pages/` — renderer แยกตามเมนู
- `supabase/migrations/` — schema และนโยบาย RLS
- `supabase/functions/admin-users/` — Edge Function สำหรับจัดการบัญชีแอดมิน
- `assets/cmb-halabala-logo.png` — โลโก้ CMB-HalaBala
- `styles.css`, `styles/dashboard.css`, `styles/flood-monitor.css` — รูปแบบร่วมและรูปแบบเฉพาะหน้า
