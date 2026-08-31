let state = null;
let previousDelay = null;

async function fetchState() {
  try {
    const res = await fetch('/api/state');
    state = await res.json();
    renderUI();
  } catch (err) {
    console.error('Error fetching user POV state:', err);
  }
}

// Category Tab Switcher
function switchTab(tabName) {
  const pages = document.querySelectorAll('.page-content');
  pages.forEach(p => p.classList.add('hidden'));

  const targetPage = document.getElementById(`page-${tabName}`);
  if (targetPage) {
    targetPage.classList.remove('hidden');
  }

  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(t => {
    t.classList.remove('active-tab', 'text-white', 'bg-[#1e293b]');
    t.classList.add('text-slate-400');
  });

  const activeTopTab = document.getElementById(`tab-${tabName}`);
  if (activeTopTab) {
    activeTopTab.classList.add('active-tab', 'text-white');
    activeTopTab.classList.remove('text-slate-400');
  }

  const bottomNavs = document.querySelectorAll('.nav-bottom');
  bottomNavs.forEach(b => {
    b.classList.remove('text-blue-600', 'font-bold');
    b.classList.add('text-slate-500');
  });

  const activeBottomNav = document.getElementById(`bottom-${tabName}`);
  if (activeBottomNav) {
    activeBottomNav.classList.add('text-blue-600', 'font-bold');
    activeBottomNav.classList.remove('text-slate-500');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Live Station PA Voice Announcement System (Web Speech API)
function playPaAnnouncement(lang) {
  if (!('speechSynthesis' in window)) {
    alert('Speech Synthesis API is not supported on this browser. Please use Google Chrome or Microsoft Edge.');
    return;
  }

  window.speechSynthesis.cancel();

  const statusText = document.getElementById('paStatusText');
  if (statusText) statusText.innerText = `🔊 Playing Station PA Announcement (${lang === 'hi' ? 'Hindi' : 'English'})...`;

  let announcementText = '';
  const currentDelay = state && state.userPov ? state.userPov.currentDelay : 38;

  if (lang === 'hi') {
    announcementText = `यात्री कृपया ध्यान दें। गाड़ी संख्या 2 0 8 9 8, रांची से हावड़ा जाने वाली वंदे भारत एक्सप्रेस मुरी बोकारो सेक्शन पर ट्रैक मरम्मत कार्य के कारण टाटानागर और खड़गपुर होकर परिवर्तित मार्ग से चलाई जा रही है। असुविधा के लिए खेद है।`;
  } else {
    announcementText = `May I have your attention please. Train number 2 0 8 9 8, Ranchi to Howrah Vande Bharat Express is diverted via Tatanagar and Kharagpur due to active track renewal work on the Muri to Bokaro section. Inconvenience caused is deeply regretted.`;
  }

  const utterance = new SpeechSynthesisUtterance(announcementText);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';

  utterance.onend = () => {
    if (statusText) statusText.innerText = 'Click below to listen to live Indian Railways station audio announcement:';
  };

  window.speechSynthesis.speak(utterance);
}

async function searchPnr() {
  const pnrVal = document.getElementById('pnrInput').value.trim();
  if (!pnrVal) return;

  try {
    const res = await fetch(`/api/pnr?pnr=${pnrVal}`);
    const data = await res.json();
    if (data.success) {
      state.userPov = data.userPov;
      renderUI();
    } else {
      alert(data.message || 'PNR Not Found');
    }
  } catch (err) {
    console.error('Error searching PNR:', err);
  }
}

function loadSamplePnr(pnr) {
  document.getElementById('pnrInput').value = pnr;
  searchPnr();
}

function renderUI() {
  if (!state || !state.userPov) return;

  const pov = state.userPov;

  // Render Dynamic Reroute Alert Banner & Map Line
  const rerouteBanner = document.getElementById('rerouteBanner');
  const userRerouteSvg = document.getElementById('userReroutePathSvg');

  if (state.isRerouted) {
    if (rerouteBanner) rerouteBanner.classList.remove('hidden');
    if (userRerouteSvg) userRerouteSvg.classList.remove('hidden');
  } else {
    if (rerouteBanner) rerouteBanner.classList.add('hidden');
    if (userRerouteSvg) userRerouteSvg.classList.add('hidden');
  }

  // Update Passenger Route Map Header & Marker Position
  const mapTitle = document.getElementById('userMapTrainTitle');
  if (mapTitle) mapTitle.innerText = `Live Route Map — ${pov.trainName}`;

  const mapSub = document.getElementById('userMapTrainSubtitle');
  if (mapSub) mapSub.innerText = `Tracking PNR: ${pov.pnr} • Loco / Speed: 130 km/h • Next Stop: ${pov.nextStop}`;

  const marker = document.getElementById('userTrainLocationMarker');
  if (marker) {
    if (state.isRerouted) {
      marker.setAttribute('transform', 'translate(190, 150)'); // Positioned at Tatanagar Junction Bypass
    } else {
      marker.setAttribute('transform', 'translate(130, 90)'); // Positioned at Muri Junction Outer Signal
    }
  }

  // Toast animation if delay drops
  if (previousDelay !== null && pov.currentDelay < previousDelay) {
    showToast();
  }
  previousDelay = pov.currentDelay;

  // Passenger & PNR Header info
  if (pov.passengerName) {
    const pName = document.getElementById('userPassengerName');
    if (pName) pName.innerText = `Hi, ${pov.passengerName}`;
  }
  if (pov.coach) {
    const cSeat = document.getElementById('userCoachSeat');
    if (cSeat) cSeat.innerText = `${pov.coach}`;
  }

  // Render Train & PNR Card
  const tName = document.getElementById('userTrainName');
  if (tName) tName.innerText = pov.trainName;

  const pText = document.getElementById('userPnrText');
  if (pText) pText.innerText = `PNR: ${pov.pnr}`;

  const cDelay = document.getElementById('userCurrentDelay');
  if (cDelay) cDelay.innerText = `${pov.currentDelay} mins`;

  const eArrival = document.getElementById('userExpectedArrival');
  if (eArrival) eArrival.innerHTML = `${pov.expectedArrival}`;

  const nStop = document.getElementById('userNextStop');
  if (nStop) nStop.innerText = pov.nextStop;

  if (pov.nextStopArrival) {
    const nArr = document.getElementById('userNextStopArrival');
    if (nArr) nArr.innerText = `Scheduled Arrival: ${pov.nextStopArrival}`;
  }

  const nDelay = document.getElementById('userNextStopDelay');
  if (nDelay) nDelay.innerText = `• Delay: ${pov.nextStopDelay} mins`;

  // Active Block Card Details
  if (pov.activeBlock) {
    const bTitle = document.getElementById('blockTitle');
    if (bTitle) bTitle.innerText = pov.activeBlock.title;

    const bStatus = document.getElementById('blockStatus');
    if (bStatus) bStatus.innerText = pov.activeBlock.status;

    const bLoc = document.getElementById('blockLocation');
    if (bLoc) bLoc.innerText = pov.activeBlock.location;

    const bSec = document.getElementById('blockSectionText');
    if (bSec) bSec.innerText = pov.activeBlock.location;

    const bType = document.getElementById('blockTypeText');
    if (bType) bType.innerText = pov.activeBlock.type;

    const bTime = document.getElementById('blockTimingText');
    if (bTime) bTime.innerText = pov.activeBlock.timing;

    const bExp = document.getElementById('blockExplanation');
    if (bExp) bExp.innerText = pov.activeBlock.explanation;
  }

  // Render Estimated Arrival Card
  const estArrTime = document.getElementById('estArrivalTime');
  if (estArrTime) estArrTime.innerHTML = `${pov.expectedArrival}`;

  const estArrDelay = document.getElementById('estArrivalDelay');
  if (estArrDelay) estArrDelay.innerText = `Delayed by ${pov.currentDelay} mins`;

  // Render Impact Card
  const impDelay = document.getElementById('impactTotalDelay');
  if (impDelay) impDelay.innerText = `${pov.currentDelay} mins`;

  if (pov.stopsAffected) {
    const impStops = document.getElementById('impactStops');
    if (impStops) impStops.innerText = pov.stopsAffected;
  }

  if (pov.passengersAffected) {
    const impPass = document.getElementById('impactPassengers');
    if (impPass) impPass.innerText = pov.passengersAffected;
  }

  // Render Journey Timeline
  const userTimeline = document.getElementById('userTimeline');
  if (userTimeline) {
    userTimeline.innerHTML = pov.timeline.map((step) => {
      let dotColor = 'bg-slate-300';
      let textClass = 'text-slate-700';
      let badge = '';

      if (step.state === 'completed') {
        dotColor = 'bg-emerald-500 text-white';
        badge = '<i class="fa-solid fa-check text-[10px] text-white"></i>';
      } else if (step.state === 'delayed' || step.state === 'current') {
        dotColor = 'bg-red-500 text-white animate-pulse';
        badge = '<i class="fa-solid fa-train text-[10px] text-white"></i>';
        textClass = 'text-red-600 font-bold';
      }

      return `
        <div class="relative pl-3">
          <div class="absolute -left-[27px] top-0.5 w-5 h-5 rounded-full ${dotColor} flex items-center justify-center border-2 border-white shadow-sm">
            ${badge}
          </div>

          <div class="flex justify-between items-start">
            <div>
              <h5 class="font-bold text-slate-900 ${step.isCurrent ? 'text-red-600 font-extrabold' : ''}">
                ${step.station} ${step.code ? `<span class="text-xs text-blue-600 font-mono font-bold">(${step.code})</span>` : ''}
              </h5>
              <p class="text-[11px] text-slate-500">${step.time}</p>
            </div>
            <span class="text-[11px] font-bold ${textClass}">${step.status}</span>
          </div>

          ${step.detail ? `
            <div class="mt-1 p-2.5 rounded-lg ${step.isCurrent ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-50 text-slate-600'} text-[11px]">
              <p class="font-semibold">${step.detail}</p>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }
}

function showToast() {
  const toast = document.getElementById('optimizationToast');
  if (toast) toast.classList.remove('hidden');
}

function dismissToast() {
  const toast = document.getElementById('optimizationToast');
  if (toast) toast.classList.add('hidden');
}

// SSE Real-time Listener
const eventSource = new EventSource('/api/events');
eventSource.addEventListener('state_updated', (e) => {
  const data = JSON.parse(e.data);
  state = data;
  renderUI();
});

// Initial load
fetchState();
