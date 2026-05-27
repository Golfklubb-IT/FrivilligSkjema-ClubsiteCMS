// Konfigurasjon - Bruker nå Classic ASP endepunktene
const DATA_ACTIVITIES_URL = '../../api/get_activities.asp';
const DATA_REGISTRATIONS_URL = '../../api/get_registrations.asp';

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    loadRegistrations();
    
    // Håndter skjema for ny dugnad
    document.getElementById('createActivityForm').addEventListener('submit', (e) => {
        e.preventDefault();
        alert("Lagre-funksjonen aktiveres når ASP APIet (Trinn 4) er koblet til!");
    });

    // Håndter skjema for Push-varsel
    document.getElementById('pushForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.querySelector('#pushForm .btn-submit');
        btn.innerText = "Sender...";
        btn.disabled = true;

        const formData = new URLSearchParams();
        formData.append('title', document.getElementById('pushTitle').value);
        formData.append('message', document.getElementById('pushMessage').value);

        try {
            const response = await fetch('../../api/send_push.asp', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            alert(result.message);
            if(result.status === "success") {
                document.getElementById('pushForm').reset();
            }
        } catch(err) {
            console.error("Feil ved sending: ", err);
            alert("Det skjedde en kritisk feil. Sjekk console.");
        } finally {
            btn.innerText = "Send Varsel Nå";
            btn.disabled = false;
        }
    });
});

// Navigasjon
function showSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

// Last inn dugnader i Dashboard
async function loadDashboard() {
    const listEl = document.getElementById('adminActivitiesList');
    try {
        const response = await fetch(DATA_ACTIVITIES_URL);
        const activities = await response.json();
        
        listEl.innerHTML = '';
        activities.forEach(act => {
            const card = document.createElement('div');
            card.style.border = "1px solid #ccc";
            card.style.padding = "10px";
            card.style.margin = "10px 0";
            card.style.borderRadius = "5px";
            
            card.innerHTML = `
                <h3>${act.title} <small>(${act.date})</small></h3>
                <p>Type: ${act.type} | Antall vakter: ${act.shifts.length}</p>
                <button class="btn-small" onclick="alert('Redigering kommer på plass med ASP API.')">Rediger</button>
            `;
            listEl.appendChild(card);
        });
    } catch (err) {
        listEl.innerHTML = "<p>Kunne ikke laste aktiviteter.</p>";
    }
}

// Last inn påmeldinger
async function loadRegistrations() {
    const tbody = document.getElementById('registrationsTableBody');
    try {
        const response = await fetch(DATA_REGISTRATIONS_URL);
        const registrations = await response.json();
        const actResponse = await fetch(DATA_ACTIVITIES_URL);
        const activities = await actResponse.json();

        tbody.innerHTML = '';
        registrations.forEach(reg => {
            // Finn navnet på aktiviteten
            const act = activities.find(a => a.id === reg.activityId);
            const actTitle = act ? act.title : reg.activityId;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${reg.name}</td>
                <td>${actTitle}</td>
                <td>${reg.shiftId}</td>
                <td>${reg.memberNumber}</td>
                <td>${new Date(reg.registeredAt).toLocaleString('nb-NO')}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = "<tr><td colspan='5'>Fant ingen påmeldinger.</td></tr>";
    }
}