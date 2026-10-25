const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create a connection pool to MySQL 8.0
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'incident_tracker_db',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper function to test database connectivity
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Successfully connected to MySQL database: ' + (process.env.DB_NAME || 'incident_tracker_db'));
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Failed to connect to MySQL database:', error.message);
        return false;
    }
}

module.exports = {
    pool,
    testConnection
};
