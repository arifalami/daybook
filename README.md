# Daybook — Personal Planner MVP

Aplikasi web personal bergaya Notion: Overview, kalender bulanan, tugas, catatan, jadwal berulang (metadata), dan pengingat browser.

## Isi paket
- `index.html` — frontend responsif.
- `worker.js` — API Cloudflare Worker + autentikasi password dan token sesi 7 hari.
- `schema.sql` — skema Cloudflare D1.
- `README.md` — panduan deploy.

## Arsitektur
Frontend statis (misalnya GitHub Pages) → Cloudflare Worker API → Cloudflare D1.
Buat Worker baru bernama misalnya `daybook-api`. Jangan gabungkan dengan Worker aplikasi lain yang sudah berjalan.

## 1. Buat database D1
Cloudflare Dashboard → Workers & Pages → D1 SQL Database → Create database.
Nama contoh: `daybook-db`.
Buka database → Console → jalankan seluruh isi `schema.sql`.

## 2. Buat Worker
Cloudflare Dashboard → Workers & Pages → Create → Worker → nama `daybook-api`.
Buka Edit code, ganti kode bawaan dengan isi `worker.js`, lalu Deploy.

Di Worker → Settings → Bindings → Add → D1 database:
- Variable name: `DB`
- Database: `daybook-db`

## 3. Tambahkan Variables dan Secrets
Worker → Settings → Variables and Secrets:
- `APP_PASSWORD` (Secret): password untuk masuk aplikasi.
- `SESSION_SECRET` (Secret): string acak panjang minimal 32 karakter.
- `ALLOWED_ORIGIN` (Variable): origin frontend, contoh `https://username.github.io`.
Jangan sertakan slash/path di akhir origin.

Deploy ulang setelah menambahkan binding/secrets.

## 4. Hubungkan frontend
Pada `index.html`, cari:
`const API_BASE = "PASTE_WORKER_URL_HERE";`
Ganti dengan URL Worker, contoh:
`const API_BASE = "https://daybook-api.username.workers.dev";`

Upload `index.html` ke repository GitHub Pages (atau hosting statis lain).
Jika memakai GitHub Pages pada path repository, nilai `ALLOWED_ORIGIN` tetap origin saja, misalnya `https://username.github.io`.

## 5. Batasan MVP yang perlu diketahui
- Login menggunakan satu password aplikasi; bukan multi-user.
- Pengingat memakai Notification API browser dan hanya berjalan ketika aplikasi terbuka/aktif. Browser dapat membatasi notifikasi jika tab ditutup atau perangkat tidur.
- Pilihan berulang saat ini disimpan sebagai aturan pada item; belum membuat rangkaian kejadian terpisah otomatis.
- Kalender saat ini tampilan bulanan. Tampilan mingguan/harian, drag-and-drop, push notification terjadwal via Cron + Web Push, dan pengulangan otomatis adalah tahap berikutnya.
- Gunakan HTTPS agar notifikasi browser dapat berfungsi.
- Password dan SESSION_SECRET harus disimpan sebagai Secrets di Cloudflare, jangan di dalam HTML/JavaScript.

## Endpoint API
- `POST /api/login` — `{ "password": "..." }`
- `GET /api/items`
- `POST /api/items`
- `PUT /api/items/:id`
- `DELETE /api/items/:id`

## Catatan keamanan
MVP ini memakai satu password bersama. Pilih password kuat dan batasi `ALLOWED_ORIGIN` ke domain frontend Anda. Untuk penggunaan lebih serius, tambahkan rate limiting, rotasi sesi, dan Cloudflare Access.
