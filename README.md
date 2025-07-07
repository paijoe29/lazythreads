# LazyThreads - Auto-Reply for Threads

LazyThreads adalah sebuah aplikasi yang dirancang untuk mengotomatiskan balasan komentar di platform Threads, serta menyediakan fitur untuk mengirim postingan terjadwal (nanti wkwk). Aplikasi ini menggunakan kecerdasan buatan untuk memberikan balasan yang relevan dan kontekstual, serta terintegrasi dengan Supabase untuk otentikasi dan penyimpanan data.

## Fitur Utama

- **Balasan Otomatis**: Memanfaatkan AI untuk menganalisis dan membalas komentar secara otomatis.
- **Manajemen Token**: Antarmuka untuk memverifikasi dan mengelola token akses Threads.
- **Riwayat Balasan**: Menyimpan dan menampilkan riwayat balasan yang telah dikirim.
- **Pengaturan Fleksibel**: Konfigurasi yang mudah untuk menyesuaikan perilaku balasan otomatis.
- **Otentikasi Aman**: Menggunakan Supabase untuk mengamankan akses ke dasbor aplikasi.

## Prasyarat

Sebelum memulai, pastikan Anda telah menginstal perangkat lunak berikut:

- [Node.js](https://nodejs.org/) (versi 18 atau lebih tinggi)
- [pnpm](https://pnpm.io/installation) (manajer paket yang direkomendasikan)

## Instalasi

Ikuti langkah-langkah berikut untuk menjalankan aplikasi ini di lingkungan lokal Anda:

1.  **Clone Repositori**

    ```bash
    git clone https://github.com/username/lazythreads.git
    cd lazythreads
    ```

2.  **Instal Dependensi**

    Gunakan `pnpm` untuk menginstal semua dependensi yang diperlukan:

    ```bash
    pnpm install
    ```

3.  **Pengaturan Variabel Lingkungan**

    Buat file `.env` di direktori utama proyek dan salin konten dari `.env.example` (jika ada) atau tambahkan variabel yang diperlukan.

## Pengaturan Supabase

Aplikasi ini menggunakan Supabase untuk otentikasi pengguna dan sebagai lapisan basis data.

1.  **Buat Proyek di Supabase**
    - Kunjungi [supabase.com](https://supabase.com) dan buat akun jika belum punya.
    - Buat proyek baru.

2.  **Dapatkan Kunci API**
    - Setelah proyek dibuat, navigasikan ke **Project Settings** > **API**.
    - Salin **Project URL** dan **anon (public) key**.

3.  **Konfigurasi di `.env`**
    - Buka file `.env` yang telah Anda buat.
    - Tambahkan kunci yang telah Anda salin:

    ```env
    SUPABASE_URL=your_supabase_project_url_here
    SUPABASE_ANON_KEY=your_supabase_anon_key_here
    ```


## Mendapatkan Token Akses Threads

Untuk berinteraksi dengan API Threads, Anda memerlukan token akses. Aplikasi ini menyediakan panduan untuk mendapatkannya.

1.  Jalankan aplikasi terlebih dahulu (lihat langkah di bawah).
2.  Buka browser dan akses `http://localhost:3000/token-guide.html`.
3.  Ikuti petunjuk yang ada di halaman tersebut untuk mendapatkan token Anda.

## Menjalankan Aplikasi

Setelah semua konfigurasi selesai, jalankan server dengan perintah berikut:

```bash
pnpm start
```

Aplikasi akan berjalan di `http://localhost:3000`.

## Struktur Proyek

```
/
├── data/                 # File data (riwayat, pengaturan)
├── public/               # Aset frontend (HTML, CSS, JS)
├── src/
│   ├── config/           # Konfigurasi (Supabase, pengaturan aplikasi)
│   ├── middleware/       # Middleware Express (misalnya, otentikasi)
│   ├── routes/           # Definisi rute API
│   ├── services/         # Logika bisnis (layanan Threads, AI)
│   └── utils/            # Utilitas (helper, persistensi)
├── package.json          # Dependensi dan skrip proyek
├── server.js             # Titik masuk utama aplikasi
└── README.md             # Dokumentasi ini
```
