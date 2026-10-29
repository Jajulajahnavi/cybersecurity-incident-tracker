const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const isCloud = Boolean(process.env.DB_HOST);

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'incident_tracker_db',
    port: Number(process.env.DB_PORT || 3306),

    ssl: isCloud
        ? {
            ca: fs.readFileSync(
                path.join(__dirname, 'ca.pem'),
                'utf8'
            ),
            rejectUnauthorized: true
        }
        : undefined,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    let connection;

    try {
        connection = await pool.getConnection();
        console.log('Successfully connected to MySQL');
        return true;
    } catch (error) {
        console.error('MySQL connection failed:', error);
        return false;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

module.exports = {
    pool,
    testConnection
};