/**
 * Dashboard Logic: Populates KPI counters, renders interactive Chart.js graphs,
 * and loads the recent incidents telemetry preview.
 */

let severityChartInstance = null;
let velocityChartInstance = null;
let attackVectorChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    initChartThemeDefaults();
    await loadDashboardData();
});

/**
 * Configure global Chart.js dark-mode styling
 */
function initChartThemeDefaults() {
    if (typeof Chart === 'undefined') return;

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'JetBrains Mono', -apple-system, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyleWidth = 8;
    Chart.defaults.plugins.legend.labels.boxHeight = 6;
    Chart.defaults.plugins.legend.labels.padding = 12;

    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(7, 11, 20, 0.95)';
    Chart.defaults.plugins.tooltip.titleColor = '#38bdf8';
    Chart.defaults.plugins.tooltip.bodyColor = '#f8fafc';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(6, 182, 212, 0.35)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
}

async function loadDashboardData() {
    try {
        const stats = await IncidentAPI.getDashboardStats();
        
        // Update Total
        document.getElementById('totalIncidents').textContent = stats.total || 0;

        // Update Severities
        const criticalCount = stats.bySeverity?.CRITICAL || 0;
        const highCount = stats.bySeverity?.HIGH || 0;
        const mediumCount = stats.bySeverity?.MEDIUM || 0;
        const lowCount = stats.bySeverity?.LOW || 0;

        document.getElementById('criticalIncidents').textContent = criticalCount;
        document.getElementById('highIncidents').textContent = highCount;
        document.getElementById('mediumIncidents').textContent = mediumCount;
        document.getElementById('lowIncidents').textContent = lowCount;

        // Render Severity Donut Chart
        renderSeverityChart(criticalCount, highCount, mediumCount, lowCount);

        // Fetch recent incidents to populate timeline and attack vectors
        const incidents = await IncidentAPI.getIncidents();
        
        // Render 7-Day Velocity & Attack Vectors charts
        renderVelocityChart(incidents || []);
        renderAttackVectorChart(incidents || []);

        // Load recent incidents into table
        renderRecentIncidentsTable(incidents || []);
    } catch (err) {
        console.warn('Dashboard waiting for backend API connection:', err.message);
        
        // Render fallback preview data for charts so the UI remains visually stunning even before backend launch
        renderSeverityChart(2, 5, 8, 12);
        renderVelocityChart([]);
        renderAttackVectorChart([]);

        const tbody = document.getElementById('recentIncidentsBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--sev-medium); padding: 2rem; font-family: 'JetBrains Mono', monospace;">
                        ⚠️ Backend server is starting or disconnected. Please ensure the Node.js API is running.
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Chart 1: Threat Severity Donut Matrix
 */
function renderSeverityChart(critical, high, medium, low) {
    const ctx = document.getElementById('severityChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (severityChartInstance) {
        severityChartInstance.destroy();
    }

    const total = critical + high + medium + low;
    const dataValues = total === 0 ? [1, 2, 3, 4] : [critical, high, medium, low];

    severityChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Critical', 'High', 'Medium', 'Low'],
            datasets: [{
                data: dataValues,
                backgroundColor: [
                    '#ef4444', // Critical
                    '#f97316', // High
                    '#f59e0b', // Medium
                    '#10b981'  // Low
                ],
                borderColor: '#070b14',
                borderWidth: 3,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

/**
 * Chart 2: 7-Day Incident Velocity Area Curve
 */
function renderVelocityChart(incidents) {
    const ctx = document.getElementById('velocityChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (velocityChartInstance) {
        velocityChartInstance.destroy();
    }

    // Build last 7 days labels
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const labels = [];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        labels.push(days[d.getDay()]);
    }

    // Tally actual incidents by date
    if (incidents && incidents.length > 0) {
        incidents.forEach(inc => {
            const incDate = new Date(inc.incident_date || inc.created_at);
            const diffDays = Math.floor((today - incDate) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays < 7) {
                const targetIdx = 6 - diffDays;
                counts[targetIdx] += 1;
            }
        });
    } else {
        // Sample illustrative curve for initial preview
        counts.splice(0, 7, 2, 5, 3, 8, 4, 9, 6);
    }

    // Create gradient fill
    const canvasContext = ctx.getContext('2d');
    const gradient = canvasContext.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

    velocityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Threat Detections',
                data: counts,
                borderColor: '#06b6d4',
                borderWidth: 2.5,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#06b6d4',
                pointBorderColor: '#070b14',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)'
                    },
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Chart 3: Top Attack Vectors Horizontal Bars
 */
function renderAttackVectorChart(incidents) {
    const ctx = document.getElementById('attackVectorChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (attackVectorChartInstance) {
        attackVectorChartInstance.destroy();
    }

    const typeCounts = {};
    if (incidents && incidents.length > 0) {
        incidents.forEach(inc => {
            let t = String(inc.incident_type || 'Other').trim();
            if (t.toLowerCase() === 'ddos') {
                t = 'DDoS';
            } else if (t.length > 0) {
                // Capitalize first letter of each word (e.g., 'unauthorized access' -> 'Unauthorized Access')
                t = t.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            }
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
    }

    // Sort categories
    let sortedCategories = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]);
    
    // Fallback categories if empty database
    if (sortedCategories.length === 0) {
        sortedCategories = ['Phishing', 'Malware', 'Unauthorized Access', 'DDoS', 'Data Leak'];
        typeCounts['Phishing'] = 14;
        typeCounts['Malware'] = 9;
        typeCounts['Unauthorized Access'] = 7;
        typeCounts['DDoS'] = 4;
        typeCounts['Data Leak'] = 3;
    }

    const topCategories = sortedCategories.slice(0, 5);
    const topCounts = topCategories.map(cat => typeCounts[cat]);

    attackVectorChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topCategories,
            datasets: [{
                label: 'Reported Incidents',
                data: topCounts,
                backgroundColor: [
                    'rgba(6, 182, 212, 0.85)',
                    'rgba(59, 130, 246, 0.85)',
                    'rgba(168, 85, 247, 0.85)',
                    'rgba(245, 158, 11, 0.85)',
                    'rgba(239, 68, 68, 0.85)'
                ],
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)'
                    },
                    ticks: {
                        stepSize: 2
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Populate Recent Incidents Table
 */
function renderRecentIncidentsTable(incidents) {
    const tbody = document.getElementById('recentIncidentsBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!incidents || incidents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2.5rem; font-family: 'JetBrains Mono', monospace;">
                    No operational incidents recorded in the database yet.
                </td>
            </tr>
        `;
        return;
    }

    // Show up to 5 most recent incidents
    incidents.slice(0, 5).forEach(inc => {
        const tr = document.createElement('tr');
        const formattedDate = inc.incident_date 
            ? new Date(inc.incident_date).toLocaleDateString() + ' ' + new Date(inc.incident_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '—';

        tr.innerHTML = `
            <td class="incident-code-cell">${escapeHtml(inc.incident_code)}</td>
            <td><strong>${escapeHtml(inc.title)}</strong></td>
            <td>${escapeHtml(inc.incident_type)}</td>
            <td><span class="badge badge-${escapeHtml(inc.severity.toLowerCase())}">${escapeHtml(inc.severity)}</span></td>
            <td><span style="color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; font-size: 0.82rem;">${escapeHtml(inc.status.replace(/_/g, ' '))}</span></td>
            <td><code>${escapeHtml(inc.affected_system)}</code></td>
            <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(formattedDate)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[m]);
}
