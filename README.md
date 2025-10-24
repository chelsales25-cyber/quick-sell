# QuickSell

ระบบจัดการขายสินค้า (Point of Sale) สำหรับร้านค้าขนาดเล็ก-กลาง พัฒนาโดยใช้ Next.js, Firebase, Google Sheets และ Genkit AI

## ฟีเจอร์หลัก

- **ระบบจัดการข้อมูลผ่าน Google Sheets:** อ่านและเขียนข้อมูลหลัก (สินค้า, ลูกค้า, พนักงานขาย ฯลฯ) จาก Google Sheets โดยตรง
- **AI-Powered Flows:** ใช้ Genkit AI ในการจัดการ Logic การดึงและบันทึกข้อมูล
- **Authentication:** ระบบล็อกอินสำหรับพนักงานขายผ่าน Firebase Authentication
- **Dashboard:** ภาพรวมยอดขาย, รายการธุรกรรมล่าสุด, และข้อมูลสำคัญอื่นๆ
- **Point of Sale (POS):** หน้าจอสำหรับทำการขาย, เลือกสินค้า, คำนวณราคา, และบันทึกธุรกรรม
- **Responsive Design:** รองรับการใช้งานบน Desktop และ Mobile

## โครงสร้างโปรเจค

- `src/app/`: หน้าเว็บต่างๆ ของ Next.js (Dashboard, POS, Reports)
- `src/components/`: UI Components ที่ใช้ซ้ำได้ เช่น ตาราง, ปุ่ม, ฟอร์ม
- `src/ai/flows/`: Genkit Flows สำหรับจัดการ Logic การสื่อสารกับ Google Sheets (หัวใจหลักของ Backend)
- `src/lib/`: โค้ดส่วนกลางที่ใช้ร่วมกัน
  - `firebase-admin.ts`: ตั้งค่า Firebase Admin SDK
  - `google-auth.ts`: จัดการการยืนยันตัวตนกับ Google APIs
  - `types.ts`: TypeScript types สำหรับข้อมูลต่างๆ ในโปรเจกต์
- `src/store/`: Redux Toolkit store สำหรับจัดการ State ของหน้าขาย (Cart)

## เทคโนโลยีที่ใช้

- **Frontend:** Next.js, React, Redux Toolkit, Tailwind CSS, Shadcn/ui
- **Backend & AI:** Genkit AI, Google AI (Gemini)
- **Database:** Google Sheets
- **Authentication:** Firebase Authentication
- **Deployment:** Vercel (แนะนำ)

## วิธีติดตั้งและรันโปรเจค

โปรเจคนี้ต้องใช้ 2 Terminal ในการรัน: หนึ่งสำหรับ Next.js (Frontend) และอีกหนึ่งสำหรับ Genkit (Backend)

### 1. การตั้งค่าเบื้องต้น

1.  **ติดตั้ง Dependencies:**
    ```bash
    npm install
    ```
2.  **เตรียม Service Account Key:**
    - ไปที่ Firebase Console > Project settings > Service accounts
    - สร้าง Service Account ใหม่และดาวน์โหลดไฟล์ `serviceAccountKey.json`
3.  **ตั้งค่า Environment Variables:**

    - สร้างไฟล์ `.env.local` ที่ root ของโปรเจกต์
    - แปลงไฟล์ `serviceAccountKey.json` ทั้งหมดเป็น Base64 (สามารถใช้เครื่องมือออนไลน์ หรือ command line)
    - เพิ่มค่าตัวแปรลงในไฟล์ `.env.local` ดังนี้:

    ```env
    # Base64 encoded content of your serviceAccountKey.json
    FIREBASE_SERVICE_ACCOUNT_KEY_JSON="<PASTE_YOUR_BASE64_STRING_HERE>"

    # Your Google Sheet ID
    NEXT_PUBLIC_SHEET_ID="<YOUR_GOOGLE_SHEET_ID>"
    ```

### 2. การรันโปรเจค

1.  **Terminal 1: รัน Genkit (Backend):**

    ```bash
    npm run genkit:dev
    ```

    > Genkit จะเริ่มทำงานที่ http://localhost:4000

2.  **Terminal 2: รัน Next.js (Frontend):**
    ```bash
    npm run dev
    ```
    > เว็บแอปพลิเคชันจะพร้อมใช้งานที่ http://localhost:9002

## License

ซอฟต์แวร์นี้เป็นกรรมสิทธิ์ของเจ้าของโปรเจกต์ ไม่อนุญาตให้นำไปพัฒนาต่อ ดัดแปลง หรือใช้งานในเชิงพาณิชย์โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร
