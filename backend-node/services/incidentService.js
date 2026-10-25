const { pool } = require('../config/db');

// Service layer handling database queries and business logic
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
        const term = `%${filters.search}%`;
        params.push(term, term, term);
    }

    query += ' ORDER BY incident_date DESC';
    const [rows] = await pool.query(query, params);
    return rows;
};

const getStats = async () => {
    const [totalRows] = await pool.query('SELECT COUNT(*) AS total FROM incidents');
    const [sevRows] = await pool.query('SELECT severity, COUNT(*) AS count FROM incidents GROUP BY severity');
    const [statRows] = await pool.query('SELECT status, COUNT(*) AS count FROM incidents GROUP BY status');

    const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    sevRows.forEach(row => {
        bySeverity[row.severity] = row.count;
    });

    const byStatus = {
        REPORTED: 0,
        UNDER_INVESTIGATION: 0,
        IN_PROGRESS: 0,
        RESOLVED: 0,
        CLOSED: 0
    };
    statRows.forEach(row => {
        byStatus[row.status] = row.count;
    });

    return {
        total: totalRows[0]?.total || 0,
        bySeverity,
        byStatus
    };
};

const create = async (incident) => {
    const { title, incident_type, severity, description, affected_system, reported_by, incident_date } = incident;
    const countQuery = 'SELECT COUNT(*) AS count FROM incidents';
    const [rows] = await pool.query(countQuery);
    const code = `INC-2026-${String(rows[0].count + 1).padStart(3, '0')}`;

    const insertQuery = `
        INSERT INTO incidents (incident_code, title, incident_type, severity, description, affected_system, reported_by, incident_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(insertQuery, [
        code,
        title,
        incident_type,
        severity,
        description,
        affected_system,
        reported_by,
        incident_date || new Date()
    ]);

    return { id: result.insertId, incident_code: code, ...incident };
};

const updateStatus = async (id, newStatus, notes, changedBy = 'Analyst') => {
    const [existing] = await pool.query('SELECT status FROM incidents WHERE id = ?', [id]);
    if (existing.length === 0) {
        throw new Error('Incident not found');
    }
    const oldStatus = existing[0].status;

    await pool.query('UPDATE incidents SET status = ? WHERE id = ?', [newStatus, id]);
    await pool.query(
        'INSERT INTO incident_status_history (incident_id, old_status, new_status, changed_by, change_notes) VALUES (?, ?, ?, ?, ?)',
        [id, oldStatus, newStatus, changedBy, notes || `Status changed from ${oldStatus} to ${newStatus}`]
    );

    return { success: true, id, oldStatus, newStatus };
};

module.exports = {
    findAll,
    getStats,
    create,
    updateStatus
};
