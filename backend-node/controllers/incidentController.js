const incidentService = require('../services/incidentService');

// Incident controller handlers
const getAllIncidents = async (req, res) => {
    try {
        const filters = {
            severity: req.query.severity,
            status: req.query.status,
            search: req.query.search
        };
        const incidents = await incidentService.findAll(filters);
        res.status(200).json(incidents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const stats = await incidentService.getStats();
        res.status(200).json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createIncident = async (req, res) => {
    try {
        const newIncident = await incidentService.create(req.body);
        res.status(201).json(newIncident);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updateIncidentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, change_notes, changed_by } = req.body;
        const result = await incidentService.updateStatus(id, status, change_notes, changed_by);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getAllIncidents,
    getDashboardStats,
    createIncident,
    updateIncidentStatus
};
