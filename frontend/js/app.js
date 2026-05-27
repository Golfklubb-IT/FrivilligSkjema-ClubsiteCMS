// Henter data fra vårt nye Classic ASP API
const DATA_URL = '../../api/get_activities.asp';
const SAVE_URL = '../../api/save_registration.asp';

// Global lagring for aktiviteter for å lettere manipulere modals
let currentActivities = [];

// ==========================================
// DESKTOP: FullCalendar Initialisering
// ==========================================
async function initWebCalendar() {
    const calendarEl = document.getElementById('calendar');
    try {
        const response = await fetch(DATA_URL);
        const activities = await response.json();
        currentActivities = activities;

        // Mapper JSON data over til objektet FullCalendar forventer
        const events = activities.map(act => ({
            id: act.id,
            title: act.title,
            start: act.date,
            color: act.type === 'Felles' ? '#e53935' : '#1e88e5',
            extendedProps: {
                location: act.location,
                description: act.description,
                shifts: act.shifts
            }
        }));

        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'nb',
            firstDay: 1, // Mandag
            events: events,
            eventClick: function(info) {
                openSignupModal(info.event.id);
            }
        });

        calendar.render();
    } catch (err) {
        console.error("Kunne ikke laste kalender-data:", err);
        calendarEl.innerHTML = "<p>Kunne ikke koble til serveren for å hente kalender.</p>";
    }
}

// ==========================================
// MOBIL: App Liste Initialisering
// ==========================================
async function initMobileApp() {
    const listEl = document.getElementById('mobileActivitiesList');
    try {
        const response = await fetch(DATA_URL);
        const activities = await response.json();
        currentActivities = activities;

        listEl.innerHTML = ''; // Fjern "Laster..."

        activities.forEach(act => {
            const shiftsText = act.shifts.map(s => `${s.timeStart}-${s.timeEnd}`).join(', ');
            const card = document.createElement('div');
            card.className = 'activity-card';
            card.innerHTML = `
                <h3>${act.title}</h3>
                <p><strong>Dato:</strong> ${act.date}</p>
                <p><strong>Sted:</strong> ${act.location}</p>
                <p><strong>Vakter:</strong> ${shiftsText}</p>
                <button class="btn-book" onclick="openSignupModal('${act.id}')">Meld deg på</button>
            `;
            listEl.appendChild(card);
        });

        // Dummy-sjekk for push-varsler, nå byttet til OneSignal sin funksjon
        const enablePushBtn = document.getElementById('enablePushBtn');
        if (enablePushBtn && 'Notification' in window) {
            enablePushBtn.classList.remove('hidden');
            enablePushBtn.addEventListener('click', () => {
                // Ber bruker om tillatelse via OneSignal
                window.OneSignalDeferred.push(async function(OneSignal) {
                    await OneSignal.Slidedown.promptPush();
                    enablePushBtn.innerText = "Varsler aktivert!";
                    enablePushBtn.disabled = true;
                    enablePushBtn.style.backgroundColor = "#ccc";
                });
            });
        }

    } catch (err) {
        console.error("Kunne ikke laste app-data:", err);
        listEl.innerHTML = "<p>Kunne ikke laste inn dugnader.</p>";
    }
}

// ==========================================
// FELLES: Skjema og Modals
// ==========================================
function openSignupModal(activityId) {
    const act = currentActivities.find(a => a.id === activityId);
    if (!act) return;

    document.getElementById('activityId').value = act.id;
    document.getElementById('modalActivityTitle').innerText = act.title;
    
    // Web har denne fylt ut, mobil kanskje ikke
    const descEl = document.getElementById('modalActivityDesc');
    if (descEl) descEl.innerText = `${act.date} - ${act.location}`;

    // Fyll dropdown med tilgjengelige vakter
    const shiftSelect = document.getElementById('shiftSelect');
    shiftSelect.innerHTML = '';
    act.shifts.forEach(shift => {
        const option = document.createElement('option');
        option.value = shift.shiftId;
        option.text = `${shift.timeStart} - ${shift.timeEnd} (Trenger ${shift.neededVolunteers} stk)`;
        shiftSelect.appendChild(option);
    });

    document.getElementById('signupModal').style.display = 'block';
}

// Lukk modal
document.querySelectorAll('.close').forEach(btn => {
    btn.onclick = function() {
        document.getElementById('signupModal').style.display = 'none';
    }
});
window.onclick = function(event) {
    const modal = document.getElementById('signupModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Håndter Innsending (Prototyper)
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Samle inn form data
        const formData = new URLSearchParams();
        formData.append('activityId', document.getElementById('activityId').value);
        formData.append('shiftId', document.getElementById('shiftSelect').value);
        formData.append('name', document.getElementById('name').value);
        
        // Hent de valgfrie epost/telefon hvis de finnes
        const emailEl = document.getElementById('email');
        if (emailEl) formData.append('email', emailEl.value);
        
        const phoneEl = document.getElementById('phone');
        if (phoneEl) formData.append('phone', phoneEl.value);
        
        const memberEl = document.getElementById('memberNum');
        if (memberEl) formData.append('memberNum', memberEl.value);

        try {
            // Send data til ASP APIet!
            const response = await fetch(SAVE_URL, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            if (result.status === "success") {
                alert(result.message);
                document.getElementById('signupModal').style.display = 'none';
                signupForm.reset();
            } else {
                alert("Det skjedde en feil under påmeldingen.");
            }
        } catch(error) {
            console.error("Lagringsfeil:", error);
            alert("Kunne ikke snakke med serveren.");
        }
    });
}