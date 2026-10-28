const { pool } = require('../config/DB');

const findAll = async (filters = {}) => {
    let query = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];

    if (filters.severity) {
        params.push(filters.severity);
        query += ` AND severity = $${params.length}`;
    }

    if (filters.status) {
        params.push(filters.status);
        query += ` AND status = $${params.length}`;
    }

    if (filters.search) {
        params.push(`%${filters.search}%`);
        const p = `$${params.length}`;
        query += ` AND (title ILIKE ${p} OR description ILIKE ${p} OR affected_system ILIKE ${p})`;
    }

    query += ' ORDER BY incident_date DESC';
    const result = await pool.query(query, params);
    return result.rows;
};

const getStats = async () => {
    const totalResult = await pool.query(
        'SELECT COUNT(*)::int AS total FROM incidents'
    );
    const severityResult = await pool.query(
        'SELECT severity, COUNT(*)::int AS count FROM incidents GROUP BY severity'
    );
    const statusResult = await pool.query(
        'SELECT status, COUNT(*)::int AS count FROM incidents GROUP BY status'
    );

    const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    severityResult.rows.forEach(row => {
        bySeverity[row.severity] = row.count;
    });

    const byStatus = {
        REPORTED: 0,
        UNDER_INVESTIGATION: 0,
        IN_PROGRESS: 0,
        RESOLVED: 0,
        CLOSED: 0
    };
    statusResult.rows.forEach(row => {
        byStatus[row.status] = row.count;
    });

    return {
        total: totalResult.rows[0]?.total || 0,
        bySeverity,
        byStatus
    };
};

const create = async (incident) => {
    const {
        title, incident_type, severity, description,
        affected_system, reported_by, incident_date
    } = incident;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const countResult = await client.query(
            'SELECT COUNT(*)::int AS count FROM incidents'
        );
        const count = countResult.rows[0].count;
        const code = `INC-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

        const result = await client.query(
            `INSERT INTO incidents
             (incident_code, title, incident_type, severity, description,
              affected_system, reported_by, incident_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, incident_code, title, incident_type, severity,
                       description, affected_system, reported_by, incident_date, status`,
            [
                code, title, incident_type, severity, description,
                affected_system, reported_by, incident_date || new Date()
            ]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const updateStatus = async (id, newStatus, notes, changedBy = 'Analyst') => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT status FROM incidents WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (existing.rows.length === 0) {
            throw new Error('Incident not found');
        }

        const oldStatus = existing.rows[0].status;

        await client.query(
            'UPDATE incidents SET status = $1 WHERE id = $2',
            [newStatus, id]
        );

        await client.query(
            `INSERT INTO incident_status_history
             (incident_id, old_status, new_status, changed_by, change_notes)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                id, oldStatus, newStatus, changedBy,
                notes || `Status changed from ${oldStatus} to ${newStatus}`
            ]
        );

        await client.query('COMMIT');
        return { success: true, id, oldStatus, newStatus };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { findAll, getStats, create, updateStatus };