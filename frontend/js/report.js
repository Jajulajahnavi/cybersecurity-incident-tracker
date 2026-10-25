/**
 * Incident Reporting Form Logic: Validates user input and sends POST request to backend.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Set default incident date to current local datetime
    const dateInput = document.getElementById('incidentDate');
    if (dateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.value = now.toISOString().slice(0, 16);
    }

    const form = document.getElementById('incidentForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});

async function handleFormSubmit(e) {
    e.preventDefault();
    const alertBox = document.getElementById('alertBox');
    const submitBtn = document.getElementById('submitBtn');

    // Collect and sanitize form fields
    const title = document.getElementById('title').value.trim();
    const incidentType = document.getElementById('incidentType').value;
    const severity = document.getElementById('severity').value;
    const affectedSystem = document.getElementById('affectedSystem').value.trim();
    const reportedBy = document.getElementById('reportedBy').value.trim();
    const incidentDate = document.getElementById('incidentDate').value;
    const description = document.getElementById('description').value.trim();

    // Client-side validation checks
    if (!title || !incidentType || !severity || !affectedSystem || !reportedBy || !description) {
        showAlert('Please fill in all required fields.', 'error');
        return;
    }

    const payload = {
        title,
        incident_type: incidentType,
        severity,
        affected_system: affectedSystem,
        reported_by: reportedBy,
        incident_date: incidentDate,
        description
    };

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting Incident...';

        const result = await IncidentAPI.createIncident(payload);

        showAlert(`✅ Incident registered successfully! Tracking Code: <strong>${result.incident_code || 'Assigned'}</strong>`, 'success');
        document.getElementById('incidentForm').reset();
        
        // Reset date field
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('incidentDate').value = now.toISOString().slice(0, 16);

        // Redirect to logs after 2 seconds
        setTimeout(() => {
            window.location.href = 'incidents.html';
        }, 5000);
    } catch (err) {
        showAlert(`❌ Submission Error: ${err.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Incident Report';
    }
}

function showAlert(message, type) {
    const alertBox = document.getElementById('alertBox');
    alertBox.style.display = 'block';
    if (type === 'success') {
        alertBox.style.background = 'rgba(16, 185, 129, 0.2)';
        alertBox.style.color = '#34d399';
        alertBox.style.border = '1px solid #059669';
    } else {
        alertBox.style.background = 'rgba(239, 68, 68, 0.2)';
        alertBox.style.color = '#f87171';
        alertBox.style.border = '1px solid #dc2626';
    }
    alertBox.innerHTML = message;
}
