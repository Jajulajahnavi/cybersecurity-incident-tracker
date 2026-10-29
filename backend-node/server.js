const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/db');
const incidentRoutes = require('./routes/incidentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/incidents', incidentRoutes);

// Serve the frontend
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'UP', message: 'Incident Tracker API is running' });
});

// Start server
app.listen(PORT, async () => {
    console.log(`Incident Tracker API running on port ${PORT}`);
    console.log('Serving frontend');

    await testConnection();
});