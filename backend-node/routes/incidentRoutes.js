const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');

// Define incident routes
router.get('/', incidentController.getAllIncidents);
router.get('/stats', incidentController.getDashboardStats);
router.post('/', incidentController.createIncident);
router.patch('/:id/status', incidentController.updateIncidentStatus);

module.exports = router;
