const { pool } = require('../config/db');

const findAll = async (filters = {}) => {
    let query = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];

    if (filters.severity) {
        query += ' AND severity = ?';
        params.push(filters.severity);
    }

    if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
    }

    if (filters.search) {
        query += ' AND (title LIKE ? OR description LIKE ? OR affected_system LIKE ?)';
        const search = `%${filters.search}%`;
        params.push(search, search, search);
    }

    query += ' ORDER BY incident_date DESC';
    const [rows] = await pool.query(query, params);
    return rows;
};

const getStats = async () => {
    const [totalRows] = await pool.query(
        'SELECT COUNT(*) AS total FROM incidents'
    );

    const [severityRows] = await pool.query(
        'SELECT severity, COUNT(*) AS count FROM incidents GROUP BY severity'
    );

    const [statusRows] = await pool.query(
        'SELECT status, COUNT(*) AS count FROM incidents GROUP BY status'
    );

    const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    severityRows.forEach(row => {
        bySeverity[row.severity] = Number(row.count);
    });

    const byStatus = {
        REPORTED: 0,
        UNDER_INVESTIGATION: 0,
        IN_PROGRESS: 0,
        RESOLVED: 0,
        CLOSED: 0
    };

    statusRows.forEach(row => {
        byStatus[row.status] = Number(row.count);
    });

    return {
        total: Number(totalRows[0].total),
        bySeverity,
        byStatus
    };
};

const create = async (incident) => {
    const {
        title, incident_type, severity, description,
        affected_system, reported_by, incident_date
    } = incident;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [countRows] = await connection.query(
            'SELECT COUNT(*) AS count FROM incidents'
        );

        const code = `INC-${new Date().getFullYear()}-${String(Number(countRows[0].count) + 1).padStart(3, '0')}`;

        const [result] = await connection.query(
            `INSERT INTO incidents
            (incident_code, title, incident_type, severity, description,
             affected_system, reported_by, incident_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                code, title, incident_type, severity, description,
                affected_system, reported_by, incident_date || new Date()
            ]
        );

        await connection.commit();

        const [rows] = await connection.query(
            'SELECT * FROM incidents WHERE id = ?',
            [result.insertId]
        );

        return rows[0];
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const updateStatus = async (id, newStatus, notes, changedBy = 'Analyst') => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [existing] = await connection.query(
            'SELECT status FROM incidents WHERE id = ? FOR UPDATE',
            [id]
        );

        if (existing.length === 0) {
            throw new Error('Incident not found');
        }

        const oldStatus = existing[0].status;

        await connection.query(
            'UPDATE incidents SET status = ? WHERE id = ?',
            [newStatus, id]
        );

        await connection.query(
            `INSERT INTO incident_status_history
            (incident_id, old_status, new_status, changed_by, change_notes)
            VALUES (?, ?, ?, ?, ?)`,
            [
                id, oldStatus, newStatus, changedBy,
                notes || `Status changed from ${oldStatus} to ${newStatus}`
            ]
        );

        await connection.commit();
        return { success: true, id, oldStatus, newStatus };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = { findAll, getStats, create, updateStatus };