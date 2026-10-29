/**
 * Centralized API service for the Node.js Express backend.
 */
const API_BASE_URL = 'http://localhost:3000/api';

const IncidentAPI = {
    async checkHealth() {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (!res.ok) throw new Error('Backend health check failed.');
        return res.json();
    },

    async getDashboardStats() {
        const res = await fetch(`${API_BASE_URL}/incidents/stats`);
        if (!res.ok) throw new Error('Failed to load dashboard statistics.');
        return res.json();
    },

    async getIncidents(filters = {}) {
        const params = new URLSearchParams();

        if (filters.severity) params.append('severity', filters.severity);
        if (filters.status) params.append('status', filters.status);
        if (filters.search) params.append('search', filters.search);

        const query = params.toString();
        const url = `${API_BASE_URL}/incidents${query ? `?${query}` : ''}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch incidents.');
        return res.json();
    },

    async createIncident(incidentData) {
        const res = await fetch(`${API_BASE_URL}/incidents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(incidentData)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Failed to submit incident.');
        }

        return data;
    },

    async updateStatus(id, newStatus, notes = '') {
        const res = await fetch(`${API_BASE_URL}/incidents/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, notes })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Failed to update status.');
        }

        return data;
    }
};