/**
 * Centralized API service for communicating with the Node.js Express backend.
 */
const API_BASE_URL = '/api';

const IncidentAPI = {
    // Health check
    async checkHealth() {
        const res = await fetch(`${API_BASE_URL}/health`);
        return res.json();
    },

    // Fetch dashboard statistics
    async getDashboardStats() {
        const res = await fetch(`${API_BASE_URL}/incidents/stats`);
        if (!res.ok) throw new Error('Failed to load dashboard statistics.');
        return res.json();
    },

    // Fetch all incidents with optional query filters
    async getIncidents(filters = {}) {
        const params = new URLSearchParams();
        if (filters.severity) params.append('severity', filters.severity);
        if (filters.status) params.append('status', filters.status);
        if (filters.search) params.append('search', filters.search);

        const url = `${API_BASE_URL}/incidents?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch incidents.');
        return res.json();
    },

    // Submit a new incident
    async createIncident(incidentData) {
        const res = await fetch(`${API_BASE_URL}/incidents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(incidentData)
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || 'Failed to submit incident.');
        }
        return data;
    },

    // Update incident status
    async updateStatus(id, newStatus, notes = '') {
        const res = await fetch(`${API_BASE_URL}/incidents/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus, notes })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || 'Failed to update status.');
        }
        return data;
    }
};
