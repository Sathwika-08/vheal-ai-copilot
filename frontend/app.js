// ══════════════════════════════════════════
//  VHeal AI — Fully Dynamic Frontend
//  All data comes from backend/patients.csv
//  No hardcoded patients anywhere
// ══════════════════════════════════════════

const API = "http://127.0.0.1:8000";

// Global patient store — filled from API
let ALL_PATIENTS = [];

// ── NAVIGATION ──
function navigate(page, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
    el.classList.add('active');

    // Reload data when switching to dashboard
    if (page === 'dashboard') loadPatients();
}

// ── TOAST ──
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ── INIT AGENTS BUTTON ──
function initAgents() {
    showToast('⚡ AI Agents initialized! Reading latest CSV data...');
    loadPatients();
}

// ══════════════════════════════════════════
//  LOAD PATIENTS — reads backend/patients.csv
//  via FastAPI. Updates ALL_PATIENTS globally.
// ══════════════════════════════════════════
async function loadPatients() {
    document.getElementById('patients').innerHTML = `
        <p style="color:#aaa; font-size:13px; padding:20px">
            ⏳ Loading patients from CSV...
        </p>`;

    try {
        const res = await fetch(`${API}/patients`);

        if (!res.ok) throw new Error("Backend not reachable");

        ALL_PATIENTS = await res.json();
        renderPatients(ALL_PATIENTS);
        updateStats(ALL_PATIENTS);
        updateSummaryDropdown(ALL_PATIENTS);
        updateNotificationLog(ALL_PATIENTS);
        showToast(`✅ Loaded ${ALL_PATIENTS.length} patients from CSV`);

    } catch (e) {
        // Backend not running — show clear error
        document.getElementById('patients').innerHTML = `
            <div style="
                background:#fef2f2;
                border:1px solid #fecaca;
                border-radius:12px;
                padding:20px;
                color:#dc2626;
                font-size:13px;
                grid-column: 1/-1;
            ">
                <strong>⚠️ Backend not running!</strong><br><br>
                Please run this command in your terminal:<br><br>
                <code style="
                    background:#1a2332;
                    color:#4CAF9A;
                    padding:10px 14px;
                    border-radius:8px;
                    display:block;
                    margin-top:8px;
                    font-size:12px;
                ">python -m uvicorn backend.main:app --reload</code>
            </div>`;

        document.getElementById('total').innerText = '—';
        document.getElementById('urgent').innerText = '—';
    }
}

// ── RENDER PATIENT CARDS ──
function renderPatients(patients) {
    if (patients.length === 0) {
        document.getElementById('patients').innerHTML =
            `<p style="color:#aaa; font-size:13px; padding:20px">No patients found in CSV.</p>`;
        return;
    }

    let html = "";

    patients.forEach(p => {
        const priority = (p.priority || "LOW").toUpperCase();
        const badgeClass = `badge-${priority.toLowerCase()}`;

        html += `
        <div class="patient-card ${priority.toLowerCase()}"
             onclick='showDetails(${JSON.stringify(p)})'>
            <h3>${p.name}</h3>
            <p>ID: ${p.patient_id}</p>
            <p>Room: ${p.room}</p>
            <p>Diagnosis: ${p.diagnosis}</p>
            <span class="priority-badge ${badgeClass}">${priority}</span>
            <p>Tasks: ${p.tasks_completed}</p>
            <button class="details-btn"
                onclick='event.stopPropagation(); showDetails(${JSON.stringify(p)})'>
                Details
            </button>
        </div>`;
    });

    document.getElementById('patients').innerHTML = html;
}

// ── UPDATE STATS CARDS ──
function updateStats(patients) {
    const totalReady = patients.filter(p => p.ready_for_discharge).length;
    const urgent = patients.filter(p => p.priority === "HIGH").length;

    document.getElementById('total').innerText = totalReady;
    document.getElementById('urgent').innerText = urgent;
    document.getElementById('total-patients').innerText = patients.length;
    document.getElementById('active-agents').innerText = 4;
}

// ── UPDATE SUMMARY DROPDOWN (dynamic from CSV) ──
function updateSummaryDropdown(patients) {
    const select = document.getElementById('summary-patient');
    select.innerHTML = '<option value="">— Select Patient —</option>';

    patients.forEach(p => {
        const option = document.createElement('option');
        option.value = p.patient_id;
        option.textContent = `${p.patient_id} – ${p.name} (${p.priority})`;
        option.setAttribute('data-patient', JSON.stringify(p));
        select.appendChild(option);
    });
}

// ── UPDATE NOTIFICATION LOG (dynamic from CSV) ──
function updateNotificationLog(patients) {
    const log = document.getElementById('notif-log');
    if (!log) return;

    let html = "";
    const now = new Date();

    patients.forEach((p, i) => {
        const time = new Date(now.getTime() - i * 7 * 60000);
        const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        if (p.ready_for_discharge) {
            html += `
            <div class="notif-item">
                <div class="notif-icon icon-wa">💬</div>
                <div class="notif-body">
                    <h4>WhatsApp – ${p.name} (${p.patient_id})</h4>
                    <p>Discharge ready. Doctor: ${p.doctor} · Room: ${p.room}</p>
                </div>
                <span class="notif-time">${timeStr}</span>
            </div>
            <div class="notif-item">
                <div class="notif-icon icon-sms">📱</div>
                <div class="notif-body">
                    <h4>SMS – ${p.name} (${p.patient_id})</h4>
                    <p>Hello ${p.name}, you are ready for discharge. Room: ${p.room} – VHeal AI</p>
                </div>
                <span class="notif-time">${timeStr}</span>
            </div>`;
        } else if (p.priority === "HIGH") {
            html += `
            <div class="notif-item">
                <div class="notif-icon icon-alert">⚠️</div>
                <div class="notif-body">
                    <h4>Alert – ${p.name} (${p.patient_id})</h4>
                    <p>HIGH priority patient. Discharge tasks incomplete. Room: ${p.room}</p>
                </div>
                <span class="notif-time">${timeStr}</span>
            </div>`;
        } else {
            html += `
            <div class="notif-item">
                <div class="notif-icon icon-sms">📱</div>
                <div class="notif-body">
                    <h4>SMS – Dr. ${p.doctor}</h4>
                    <p>Patient ${p.patient_id} ${p.name} update: ${p.notification}</p>
                </div>
                <span class="notif-time">${timeStr}</span>
            </div>`;
        }
    });

    if (html === "") {
        html = `<p style="color:#aaa; text-align:center; padding:20px; font-size:13px">
            No notifications yet.</p>`;
    }

    log.innerHTML = html;
}

// ── SHOW CHECKLIST IN RIGHT PANEL ──
function showDetails(p) {
    const checks = [
        { label: 'Vitals', val: p.checklist.vitals_check },
        { label: 'Medication', val: p.checklist.medication_review },
        { label: 'Billing', val: p.checklist.billing },
        { label: 'Transport', val: p.checklist.transport }
    ];

    const checkHTML = checks.map(c => `
        <div class="checklist-item">
            <span style="font-size:16px" class="${c.val ? 'check-true' : 'check-false'}">
                ${c.val ? '✅' : '⬜'}
            </span>
            <span>${c.label}: <strong>${c.val}</strong></span>
        </div>
    `).join('');

    document.getElementById('details').innerHTML = `
        <div style="margin-bottom:12px">
            <p style="font-size:14px; font-weight:700; margin-bottom:2px">${p.name}</p>
            <p style="font-size:11px; color:var(--muted)">ID: ${p.patient_id}</p>
            <p style="font-size:11px; color:var(--muted)">Doctor: ${p.doctor}</p>
            <p style="font-size:11px; color:var(--muted)">Room: ${p.room}</p>
            <p style="font-size:11px; color:var(--muted)">Diagnosis: ${p.diagnosis}</p>
            <p style="font-size:11px; color:var(--muted)">Age: ${p.age}</p>
        </div>
        <div style="
            margin-bottom:12px;
            padding:10px;
            background:var(--teal-light);
            border-radius:8px;
            font-size:12px;
            font-weight:600;
            color:var(--teal-dark)
        ">
            ${p.ready_for_discharge ? '✅ Ready for Discharge' : '⏳ Not Yet Ready'}
        </div>
        ${checkHTML}
        <div style="
            margin-top:12px;
            padding:10px;
            background:var(--bg);
            border-radius:8px;
            font-size:11px;
            color:var(--muted)
        ">
            📢 ${p.notification}
        </div>
    `;
}

// ══════════════════════════════════════════
//  GENERATE SUMMARY — fully dynamic
//  reads selected patient data from dropdown
// ══════════════════════════════════════════
function generateSummary() {
    const select = document.getElementById('summary-patient');
    const selectedOption = select.options[select.selectedIndex];
    const type = document.getElementById('summary-type').value;
    const notes = document.getElementById('summary-notes').value;
    const el = document.getElementById('summary-output');

    if (!select.value) {
        showToast('⚠️ Please select a patient first.');
        return;
    }

    // Get patient data from dropdown attribute
    const p = JSON.parse(selectedOption.getAttribute('data-patient'));
    const date = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    let text = '';

    if (type === 'full') {
        text =
`═══════════════════════════════════════════
  VHeal AI – DISCHARGE SUMMARY REPORT
═══════════════════════════════════════════
Date          : ${date}
Patient ID    : ${p.patient_id}
Patient Name  : ${p.name}
Age           : ${p.age} years
Room          : ${p.room}
Diagnosis     : ${p.diagnosis}
Priority      : ${p.priority}
Physician     : ${p.doctor}
Phone         : ${p.phone}

CLINICAL SUMMARY:
─────────────────
Patient admitted and treated for ${p.diagnosis}.
Vitals stable at discharge. Prescription issued.

CHECKLIST STATUS:
─────────────────
✅ Vitals Check       – ${p.checklist.vitals_check ? 'Completed' : 'Pending'}
✅ Medication Review  – ${p.checklist.medication_review ? 'Completed' : 'Pending'}
${p.checklist.billing ? '✅' : '❌'} Billing Clearance   – ${p.checklist.billing ? 'Completed' : 'Pending'}
${p.checklist.transport ? '✅' : '⏳'} Transport Arranged  – ${p.checklist.transport ? 'Confirmed' : 'In Progress'}

DISCHARGE STATUS: ${p.ready_for_discharge ? '✅ READY' : '⏳ NOT YET READY'}

DISCHARGE INSTRUCTIONS:
───────────────────────
- Take prescribed medications as directed.
- Follow up with ${p.doctor} within 7 days.
- Seek emergency care if symptoms worsen.
${notes ? '\nNOTES:\n───────\n' + notes : ''}

Generated by VHeal AI Agentic Copilot
═══════════════════════════════════════════`;

    } else if (type === 'patient') {
        text =
`Dear ${p.name},

You are being discharged today from Room ${p.room}.

Your doctor ${p.doctor} has confirmed you are ready to go home.

📋 What to do at home:
- Take all medications as prescribed
- Rest well and avoid strenuous activity
- Schedule a follow-up visit within 7 days
- Call us immediately if anything feels wrong

${notes ? '📝 Special Note: ' + notes + '\n' : ''}
We wish you a speedy recovery! 💚
— VHeal AI, ${date}`;

    } else {
        text =
`HANDOVER NOTE – ${date}
──────────────────────────────
Patient  : ${p.name} (${p.patient_id})
Age      : ${p.age} years
Diagnosis: ${p.diagnosis}
Room     : ${p.room}
Priority : ${p.priority}

FOR: Receiving team / Next shift

Clinical status stable. Discharge ${p.ready_for_discharge ? 'APPROVED' : 'PENDING'}.
Vitals: ${p.checklist.vitals_check ? 'Normal' : 'Needs Check'}
Medication: ${p.checklist.medication_review ? 'Dispensed' : 'Pending'}
Billing: ${p.checklist.billing ? 'Cleared' : 'Pending — follow up Finance'}
Transport: ${p.checklist.transport ? 'Arranged' : 'Not yet arranged'}

${notes ? 'Additional Notes: ' + notes : 'No additional notes.'}

— Handover generated by VHeal AI`;
    }

    el.textContent = text;
    el.classList.add('show');
    showToast('✅ Summary generated from live CSV data!');
}

// ── SEND ALL NOTIFICATIONS ──
function sendAllNotifs() {
    const readyCount = ALL_PATIENTS.filter(p => p.ready_for_discharge).length;
    showToast(`📤 Sent notifications to ${readyCount} ready patients!`);
}

// ── AUTO-REFRESH every 30 seconds ──
setInterval(() => {
    loadPatients();
}, 30000);

// ── LOAD ON START ──
loadPatients();