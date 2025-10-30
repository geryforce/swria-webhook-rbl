// server.js (Menggunakan Node.js & Express)
// Ini adalah server bridge yang menerima webhook dari Saweria
// dan menyediakan endpoint polling untuk Roblox HttpService.

const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// 🔑 KEAMANAN - GANTI KUNCI INI DENGAN NILAI YANG SULIT DITEBAK!
// Kunci ini harus sama persis dengan yang Anda gunakan di skrip Roblox.
// PENTING: Gunakan Environment Variable di Vercel/Render untuk nilai ini.
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY || "PANJANG_DAN_ACAK_7b9d5c4e8f1a0b3c6d2e9f4a1b0c3d5e7f8a9b2c1d4e5f6a7b8c9d0e1f2a3b4c";

// --- Database Sederhana (Antrian Donasi) ---
// Catatan: Dalam produksi skala besar, ini harus diganti dengan Database (misal: Firestore)
const donationsQueue = [];

// --- Konfigurasi Server ---
// Middleware untuk memproses body JSON
app.use(bodyParser.json());

// Mengaktifkan CORS (Penting agar Roblox bisa mengakses server Anda)
app.use((req, res, next) => {
    // Izinkan akses dari semua domain (*)
    res.header('Access-Control-Allow-Origin', '*'); 
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// ------------------------------------------------------------------
// 0. ENDPOINT UTAMA (HEALTH CHECK / STATUS SERVER)
// Digunakan untuk mengecek di browser (misal: Vercel)
// ------------------------------------------------------------------
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Saweria Roblox Bridge Server berjalan. Gunakan /roblox/check?key=... untuk polling.' 
    });
});


// ------------------------------------------------------------------
// 1. ENDPOINT WEBHOOK SAWERIA (POST)
// URL ini yang harus Anda daftarkan di Dashboard Saweria Anda.
// ------------------------------------------------------------------
app.post('/saweria', (req, res) => {
    const donation = req.body;
    
    // Tentukan nominal donasi: gunakan amount_raw (format modern) atau amount (fallback)
    const nominal = donation.amount_raw || donation.amount;
    
    // Periksa apakah data penting ada: donator_name dan nominal
    if (donation && donation.donator_name && nominal) {
        
        const newDonation = {
            name: donation.donator_name,
            nominal: nominal, // Menggunakan nominal yang sudah terdeteksi
            message: donation.message || "Tidak ada pesan",
            timestamp: Date.now()
        };

        // Tambahkan donasi ke antrian
        donationsQueue.push(newDonation);
        console.log(`[SAWERIA] Donasi masuk: ${newDonation.name} - Rp${newDonation.nominal}`);
        
        // Respons 200 ke Saweria menunjukkan data diterima
        res.status(200).json({ success: true, message: "Donasi diterima dan dimasukkan ke antrian." });
    } else {
        // Log yang lebih jelas menunjukkan properti mana yang hilang
        console.error(`[SAWERIA] Webhook data tidak valid/tidak lengkap. Donator: ${donation.donator_name}, Nominal: ${nominal}`, donation);
        // Respons 400 jika data tidak valid
        res.status(400).json({ success: false, message: "Data tidak lengkap (Missing donator_name atau amount/amount_raw)." });
    }
});


// ------------------------------------------------------------------
// 2. ENDPOINT UNTUK ROBLOX (GET) - DILINDUNGI API KEY
// URL ini diakses berulang kali oleh HttpService Roblox.
// ------------------------------------------------------------------
app.get('/roblox/check', (req, res) => {
    
    // 🔒 KEAMANAN: Verifikasi Kunci API (Mencegah Spoofing/Akses Liar)
    const providedKey = req.query.key;

    if (providedKey !== ROBLOX_API_KEY) {
        console.warn('[ROBLOX] Percobaan akses tidak sah dengan kunci: ' + providedKey);
        // Tolak akses jika kunci tidak cocok
        return res.status(403).json({ status: "Unauthorized", message: "Invalid API Key" }); 
    }

    // Cek apakah ada donasi di antrian
    if (donationsQueue.length > 0) {
        // Ambil donasi pertama (FIFO)
        const latestDonation = donationsQueue.shift(); 
        
        // Mengirim data donasi ke Roblox
        res.status(200).json({
            status: "donation_found",
            data: latestDonation
        });
        
        console.log(`[ROBLOX] Donasi dikirim: ${latestDonation.name}`);
    } else {
        // Jika tidak ada donasi, kirim status kosong
        res.status(200).json({ status: "no_new_donation" });
    }
});


// ------------------------------------------------------------------
// Jalankan Server
// ------------------------------------------------------------------
// Wajib: Gunakan PORT dari Environment Variable (disediakan oleh Render/Vercel)
const port = process.env.PORT || 3000; 

app.listen(port, () => {
    console.log(`Server Bridge berjalan di port ${port}`);
    console.log(`API Key yang digunakan: ${ROBLOX_API_KEY}`);
});
