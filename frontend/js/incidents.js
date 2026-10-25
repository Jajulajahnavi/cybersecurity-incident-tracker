/**
 * Incident Logs Management
 * Fetches incidents, filters the table, and updates incident status.
 */

let allIncidents = [];

document.addEventListener('DOMContentLoaded', async () => {
    setupFilterListeners();
    await fetchAndRenderIncidents();
});

function setupFilterListeners() {
    const searchInput = document.getElementById('searchInput');
    const filterSeverity = document.getElementById('filterSeverity');
    const filterStatus = document.getElementById('filterStatus');
    const resetBtn = document.getElementById('resetFiltersBtn');

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    if (filterSeverity) {
        filterSeverity.addEventListener('change', applyFilters);
    }

    if (filterStatus) {
        filterStatus.addEventListener('change', applyFilters);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (filterSeverity) filterSeverity.value = '';
            if (filterStatus) filterStatus.value = '';
            applyFilters();
        });
    }
}

async function fetchAndRenderIncidents() {
    const tbody = document.getElementById('incidentsTableBody');

    if (!tbody) {
        console.error('Incident table body not found in incidents.html');
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="9" style="text-align:center;padding:2rem;">
                Loading incidents from database...
            </td>
        </tr>
    `;

    try {
        if (typeof IncidentAPI === 'undefined') {
            throw new Error(
                'IncidentAPI is unavailable. Check that api.js loads before incidents.js.'
            );
        }

        const data = await IncidentAPI.getIncidents();

        if (!Array.isArray(data)) {
            throw new Error('The incidents API did not return a list.');
        }

        allIncidents = data;
        applyFilters();
    } catch (error) {
        console.error('Failed to load incidents:', error);

        tbody.innerHTML = `
            <tr>
                <td colspan="9"
                    style="text-align:center;color:#f87171;padding:2rem;">
                    Could not load incidents. Please check the API connection.
                    <br>
                    <button type="button" id="retryIncidentsBtn"
                        style="margin-top:12px;padding:8px 14px;cursor:pointer;">
                        Retry
                    </button>
                </td>
            </tr>
        `;

        const retryBtn = document.getElementById('retryIncidentsBtn');

        if (retryBtn) {
            retryBtn.addEventListener('click', fetchAndRenderIncidents);
        }
    }
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const filterSeverity = document.getElementById('filterSeverity');
    const filterStatus = document.getElementById('filterStatus');

    const search = (searchInput?.value || '').toLowerCase().trim();
    const severity = filterSeverity?.value || '';
    const status = filterStatus?.value || '';

    const filtered = allIncidents.filter(incident => {
        const matchesSearch = !search || [
            incident.incident_code,
            incident.title,
            incident.affected_system,
            incident.reported_by,
            incident.incident_type
        ].some(value =>
            String(value || '').toLowerCase().includes(search)
        );

        const matchesSeverity =
            !severity ||
            String(incident.severity || '').toUpperCase() ===
                severity.toUpperCase();

        const matchesStatus =
            !status ||
            String(incident.status || '').toUpperCase() ===
                status.toUpperCase();

        return matchesSearch && matchesSeverity && matchesStatus;
    });

    renderTable(filtered);
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function renderTable(incidents) {
    const tbody = document.getElementById('incidentsTableBody');

    if (!tbody) return;

    tbody.innerHTML = '';

    if (!incidents.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9"
                    style="text-align:center;padding:2.5rem;">
                    No matching incidents found.
                </td>
            </tr>
        `;
        return;
    }

    const statusOptions = [
        { value: 'REPORTED', label: 'Reported' },
        { value: 'UNDER_INVESTIGATION', label: 'Under Investigation' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'RESOLVED', label: 'Resolved' },
        { value: 'CLOSED', label: 'Closed' }
    ];

    incidents.forEach(incident => {
        const tr = document.createElement('tr');

        const currentStatus = String(
            incident.status || 'REPORTED'
        ).toUpperCase();

        const optionsHtml = statusOptions.map(option => `
            <option value="${option.value}"
                ${currentStatus === option.value ? 'selected' : ''}>
                ${option.label}
            </option>
        `).join('');

        const description = String(incident.description || '');
        const shortDescription = description.length > 90
            ? description.slice(0, 90) + '...'
            : description;

        const severity = String(
            incident.severity || 'UNKNOWN'
        ).toUpperCase();

        const dateValue = incident.incident_date || incident.created_at;
        const date = dateValue
            ? new Date(dateValue).toLocaleDateString()
            : '—';

        tr.innerHTML = `
            <td>
                <strong style="color:var(--accent-cyan);">
                    ${escapeHtml(incident.incident_code || '—')}
                </strong>
            </td>
            <td>
                <strong>${escapeHtml(incident.title || 'Untitled incident')}</strong>
                <p style="color:var(--text-secondary);font-size:.8rem;margin-top:.25rem;">
                    ${escapeHtml(shortDescription)}
                </p>
            </td>
            <td>${escapeHtml(incident.incident_type || '—')}</td>
            <td>
                <span class="badge badge-${escapeHtml(severity.toLowerCase())}">
                    ${escapeHtml(severity)}
                </span>
            </td>
            <td><code>${escapeHtml(incident.affected_system || '—')}</code></td>
            <td>${escapeHtml(incident.reported_by || '—')}</td>
            <td style="white-space:nowrap;">${escapeHtml(date)}</td>
            <td>
                <span class="badge badge-low">
                    ${escapeHtml(currentStatus.replace(/_/g, ' '))}
                </span>
            </td>
            <td>
                <select class="status-select"
                    aria-label="Update status for ${escapeHtml(incident.incident_code || incident.id)}"
                    data-incident-id="${Number(incident.id)}">
                    ${optionsHtml}
                </select>
            </td>
        `;

        const statusSelect = tr.querySelector('.status-select');

        statusSelect.addEventListener('change', async () => {
            await handleStatusChange(
                Number(incident.id),
                statusSelect.value,
                statusSelect
            );
        });

        tbody.appendChild(tr);
    });
}

async function handleStatusChange(incidentId, newStatus, selectElement) {
    const alertBox = document.getElementById('tableAlert');

    if (selectElement) selectElement.disabled = true;

    try {
        if (typeof IncidentAPI === 'undefined') {
            throw new Error('IncidentAPI is unavailable.');
        }

        await IncidentAPI.updateStatus(incidentId, newStatus);

        if (alertBox) {
            alertBox.textContent = 'Incident status updated successfully.';
            alertBox.style.color = '#22c55e';
            alertBox.style.display = 'block';
        }

        await fetchAndRenderIncidents();
    } catch (error) {
        console.error('Status update error:', error);

        if (alertBox) {
            alertBox.textContent =
                error.message || 'Unable to update incident status.';
            alertBox.style.color = '#ef4444';
        }

        if (selectElement) {
            selectElement.value = allIncidents.find(
                incident => Number(incident.id) === incidentId
            )?.status || 'REPORTED';
        }
    } finally {
        if (selectElement) selectElement.disabled = false;
    }
}