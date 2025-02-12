const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware untuk memparsing data JSON
app.use(express.json());

// Path ke folder database
const databaseFolder = path.join(__dirname, 'database');

// Fungsi untuk mendapatkan path file JSON pengguna
const getUserFilePath = (username) => path.join(databaseFolder, `${username}.json`);

// Fungsi untuk membaca data pengguna
const readUserData = (username) => {
    const filePath = getUserFilePath(username);
    if (!fs.existsSync(filePath)) {
        return null; // Jika file tidak ada
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
};

// Fungsi untuk menulis data pengguna
const writeUserData = (username, data) => {
    const filePath = getUserFilePath(username);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Middleware untuk mencatat log ke konsol
app.use((req, res, next) => {
    const now = new Date();
    const timeWIB = new Date(now.getTime() + 7 * 60 * 60 * 1000) // Tambah 7 jam untuk WIB
        .toISOString()
        .replace('T', ' ')
        .split('.')[0];
    
    // Mendapatkan IP asli dari client
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;

    const logEntry = {
        Time: timeWIB,
        "IP Address": ip,
        Username: req.params.username || "N/A",
        Type: req.method,
        Request: `${req.method} ${req.originalUrl}`
    };

    console.table([logEntry]); // Log dalam bentuk tabel
    next();
});

// Endpoint: Tambah IP untuk pengguna tertentu
app.post('/api/:username/ip', (req, res) => {
    const { username } = req.params;
    const { ip_address } = req.body;

    if (!ip_address) {
        return res.status(400).json({ error: 'IP address is required' });
    }

    const userData = readUserData(username) || [];
    const newEntry = { id: userData.length + 1, ip_address, created_at: new Date().toISOString() };
    userData.push(newEntry);
    writeUserData(username, userData);

    res.status(201).json({ message: `IP address added for ${username}`, data: newEntry });
});

// Endpoint: Dapatkan semua data IP untuk pengguna tertentu
app.get('/api/:username/ip', (req, res) => {
    const { username } = req.params;

    const userData = readUserData(username);
    if (!userData) {
        return res.status(404).json({ error: `No data found for user ${username}` });
    }

    res.status(200).json(userData);
});

// Endpoint: Hapus IP berdasarkan ID untuk pengguna tertentu
app.delete('/api/:username/ip/:id', (req, res) => {
    const { username, id } = req.params;

    const userData = readUserData(username);
    if (!userData) {
        return res.status(404).json({ error: `No data found for user ${username}` });
    }

    const index = userData.findIndex((item) => item.id === parseInt(id));
    if (index === -1) {
        return res.status(404).json({ error: 'IP address not found' });
    }

    const deleted = userData.splice(index, 1);
    writeUserData(username, userData);

    res.status(200).json({ message: `IP address deleted for ${username}`, data: deleted[0] });
});

// Mulai server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
