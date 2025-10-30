// server.js (Menggunakan Node.js & Express)

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000; 

// --- Database Sederhana (Antrian Donasi) ---
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
// 1. ENDPOINT WEBHOOK SAWERIA (POST)
// URL ini yang harus Anda daftarkan di Dashboard Saweria Anda.
// ------------------------------------------------------------------
app.post('/saweria', (req, res) => {
    const donation = req.body;
    
    // Periksa apakah data penting ada (asumsi format Saweria)
    if (donation && donation.donator_name && donation.amount) {
        
        const newDonation = {
            name: donation.donator_name,
            nominal: donation.amount,
            message: donation.message || "Tidak ada pesan",
            timestamp: Date.now()
        };

        // Tambahkan donasi ke antrian
        donationsQueue.push(newDonation);
        console.log(`[SAWERIA] Donasi masuk: ${newDonation.name} - Rp${newDonation.nominal}`);
        
        // Respons ke Saweria
        res.status(200).json({ success: true, message: "Donasi diterima." });
    } else {
        console.error('[SAWERIA] Webhook data tidak valid:', donation);
        res.status(400).json({ success: false, message: "Data tidak lengkap." });
    }
});

// ------------------------------------------------------------------
// 2. ENDPOINT UNTUK ROBLOX (GET)
// URL ini yang akan diakses berulang kali oleh HttpService Roblox.
// ------------------------------------------------------------------
app.get('/roblox/check', (req, res) => {
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


// Jalankan Server
app.listen(port, () => {
    console.log(`Server Bridge berjalan di http://localhost:${port}`);
    console.log('--- PERHATIAN: SERVER HARUS DIHOSTING PUBLIK (misal: Render, Vercel, atau Ngrok) ---');
});