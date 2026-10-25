const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { testConnection } = require('./config/db');

// Load environment configuration
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

const incidentRoutes = require('./routes/incidentRoutes');

// API Routes
app.use('/api/incidents', incidentRoutes);

// Health Check API Route
app.get('/api/health', async (req, res) => {
    res.json({
        status: 'UP',
        service: 'Cybersecurity Incident Tracker API',
        timestamp: new Date().toISOString()
    });
});

// Start Server
app.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`🚀 Incident Tracker API running on http://localhost:${PORT}`);
    console.log(`🌐 Serving frontend at http://localhost:${PORT}`);
    console.log(`====================================================`);
    // Verify database connection on startup
    await testConnection();
});
