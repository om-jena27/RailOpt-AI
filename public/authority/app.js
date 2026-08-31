let state = null;
let selectedTrainNumber = null;

// Clock ticker
function updateClock() {
  const now = new Date();
  const dateStr = '15 May 2025';
  const timeStr = now.toLocaleTimeString('en-GB');
  document.getElementById('liveDate').innerText = dateStr;
  document.getElementById('liveTime').innerText = timeStr;
}
setInterval(updateClock, 1000);
updateClock();

// Fetch state from server
async function fetchState() {
  try {
    const res = await fetch('/api/state');
    state = await res.json();
    renderUI();
  } catch (err) {
    console.error('Error fetching state:', err);
  }
}

// Render dynamic train markers on the SVG map
function renderDynamicMap() {
  if (!state || !state.trains) return;
  const trainsGroup = document.getElementById('svgDynamicTrainsGroup');
  if (!trainsGroup) return;

  trainsGroup.innerHTML = state.trains.map(t => {
    const isRerouted = state.isRerouted && (t.number === '20898' || t.number === '12019');
    const posX = isRerouted && t.rerouteX ? t.rerouteX : (t.x || 200);
    const posY = isRerouted && t.rerouteY ? t.rerouteY : (t.y || 150);
    const color = isRerouted ? '#06b6d4' : (t.delay > 30 ? '#ef4444' : '#f59e0b');
    const isSelected = selectedTrainNumber === t.number;

    return `
      <g onclick="selectTrainOnMap('${t.number}')" class="cursor-pointer group">
        <circle cx="${posX}" cy="${posY}" r="${isSelected ? 10 : 7}" fill="${color}" opacity="0.4" class="animate-ping" />
        <circle cx="${posX}" cy="${posY}" r="${isSelected ? 7 : 5}" fill="${color}" stroke="#ffffff" stroke-width="2" />
        <rect x="${posX - 20}" y="${posY - 20}" width="40" height="14" rx="3" fill="#0f172a" stroke="${color}" stroke-width="${isSelected ? 2 : 1}" />
        <text x="${posX}" y="${posY - 10}" text-anchor="middle" fill="#ffffff" font-size="8" font-weight="bold">${t.number}</text>
      </g>
    `;
  }).join('');
}

// Select train to highlight its route line on the network map
function selectTrainOnMap(trainNumber) {
  selectedTrainNumber = trainNumber;
  if (!state || !state.trains) return;

  const targetTrain = state.trains.find(t => t.number === trainNumber);
  const routePathElem = document.getElementById('svgSelectedTrainRoute');

  if (targetTrain && routePathElem) {
    const isRerouted = state.isRerouted && targetTrain.reroutePath;
    const pathToUse = isRerouted ? targetTrain.reroutePath : (targetTrain.path || '');
    routePathElem.setAttribute('d', pathToUse);
    routePathElem.classList.remove('hidden');

    renderDynamicMap();

    alert(`🚆 LIVE TRAIN TRACKER — ${targetTrain.number}\n\nName: ${targetTrain.name}\nLocation: ${targetTrain.currentStation}\nLoco: ${targetTrain.loco} | Speed: ${targetTrain.speed}\nLive Delay: ${targetTrain.delay} mins (${targetTrain.impact} Impact)\nRoute: ${targetTrain.route}`);
  }
}

// Render UI elements according to state
function renderUI() {
  if (!state) return;

  // KPIs
  document.getElementById('kpiActiveBlocks').innerText = state.blocks.length;
  document.getElementById('kpiTrainsOnRun').innerText = state.trainsOnRun;
  document.getElementById('kpiAffectedTrains').innerText = state.affectedTrainsCount;
  document.getElementById('kpiTotalDelay').innerText = state.totalDelayMins.toLocaleString();
  document.getElementById('kpiAssetAvailability').innerText = `${state.assetAvailability}%`;

  if (state.isOptimized) {
    document.getElementById('kpiAffectedTag').innerText = 'Low Network Disruption';
    document.getElementById('kpiAffectedTag').className = 'text-xs text-emerald-400 font-medium mt-1';
    document.getElementById('kpiAssetTag').innerText = '↑ 12% Reoptimized Target';
    
    document.getElementById('applyOptBtnText').innerText = 'Reset to Baseline';
    document.getElementById('applyOptBtn').className = 'flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-2';
  } else {
    document.getElementById('kpiAffectedTag').innerText = 'High Impact';
    document.getElementById('kpiAffectedTag').className = 'text-xs text-amber-400 font-medium mt-1';
    document.getElementById('kpiAssetTag').innerText = '↑ 12% vs Current Plan';
    
    document.getElementById('applyOptBtnText').innerText = 'Apply Optimized Plan';
    document.getElementById('applyOptBtn').className = 'flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2';
  }

  // Handle Dynamic Reroute Map Visualization
  const reroutePath = document.getElementById('svgReroutePath');
  const rerouteCard = document.getElementById('svgRerouteCard');
  const rerouteBtnText = document.getElementById('rerouteBtnText');

  if (state.isRerouted) {
    if (reroutePath) reroutePath.classList.remove('hidden');
    if (rerouteCard) rerouteCard.classList.remove('hidden');
    if (rerouteBtnText) rerouteBtnText.innerText = '✅ Dynamic AI Reroute ACTIVE (Click to Clear)';
  } else {
    if (reroutePath) reroutePath.classList.add('hidden');
    if (rerouteCard) rerouteCard.classList.add('hidden');
    if (rerouteBtnText) rerouteBtnText.innerText = '🔀 Simulate Dynamic AI Rerouting (via TATA Bypass)';
  }

  // Render Dynamic Train Markers on Map
  renderDynamicMap();

  // Render Blocks List
  const blocksContainer = document.getElementById('blocksContainer');
  blocksContainer.innerHTML = state.blocks.map(b => `
    <div class="bg-[#091124] p-3 rounded-lg border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
      <div>
        <div class="flex items-center space-x-2">
          <span class="font-bold text-xs text-white">${b.id}</span>
          <span class="text-slate-300 font-medium text-xs">${b.section}</span>
        </div>
        <p class="text-[11px] text-slate-400 mt-0.5">${b.type}</p>
        <p class="text-[10px] text-slate-500 font-mono">${b.timing}</p>
      </div>
      <div>
        <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${b.badgeClass}">${b.status}</span>
      </div>
    </div>
  `).join('');

  // Render Top Affected Trains Table with Click-to-Track
  const topTrainsTable = document.getElementById('topTrainsTable');
  topTrainsTable.innerHTML = state.trains.map(t => `
    <tr onclick="selectTrainOnMap('${t.number}')" class="hover:bg-slate-800/60 transition cursor-pointer ${selectedTrainNumber === t.number ? 'bg-blue-900/40 border-l-4 border-blue-500' : ''}">
      <td class="py-2.5 font-mono font-bold text-blue-400 flex items-center space-x-1">
        <i class="fa-solid fa-location-crosshairs text-[10px] text-amber-400"></i>
        <span>${t.number}</span>
      </td>
      <td class="py-2.5 text-slate-200 font-medium">${t.name}</td>
      <td class="py-2.5 text-right font-bold font-mono ${t.delay > 30 ? 'text-red-400' : 'text-amber-400'}">${t.delay}</td>
      <td class="py-2.5 text-right">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${t.badgeClass}">${t.impact}</span>
      </td>
    </tr>
  `).join('');

  // Render AI Optimization Widget values
  document.getElementById('optCurrentTrains').innerText = state.currentPlan.affectedTrains;
  document.getElementById('optCurrentDelay').innerText = state.currentPlan.totalDelay.toLocaleString();
  document.getElementById('optCurrentAsset').innerText = `${state.currentPlan.assetAvailability}%`;

  document.getElementById('optNewTrains').innerText = state.optimizedPlan.affectedTrains;
  document.getElementById('optNewDelay').innerText = state.optimizedPlan.totalDelay.toLocaleString();
  document.getElementById('optNewAsset').innerText = `${state.optimizedPlan.assetAvailability}%`;

  // Render XAI Summary
  if (state.xaiReasoning && state.xaiReasoning.summary) {
    const xaiElem = document.getElementById('xaiSummaryText');
    if (xaiElem) xaiElem.innerText = state.xaiReasoning.summary;
  }

  // Render Alerts
  const alertsContainer = document.getElementById('alertsContainer');
  alertsContainer.innerHTML = state.alerts.map(a => {
    let iconClass = 'fa-solid fa-circle-exclamation text-amber-400';
    if (a.type === 'danger') iconClass = 'fa-solid fa-triangle-exclamation text-red-500';
    if (a.type === 'success') iconClass = 'fa-solid fa-circle-check text-emerald-400';
    if (a.type === 'info') iconClass = 'fa-solid fa-circle-info text-blue-400';
    if (a.type === 'warning') iconClass = 'fa-solid fa-clock-rotate-left text-amber-400';
    if (a.type === 'weather') iconClass = 'fa-solid fa-cloud-rain text-cyan-400';

    return `
      <div class="bg-[#091124] p-2.5 rounded-lg border border-slate-800/80 flex items-start space-x-2.5 hover:bg-slate-800/30 transition text-xs">
        <i class="${iconClass} mt-0.5 text-sm"></i>
        <div class="flex-1 min-w-0">
          <p class="text-slate-200 font-medium leading-tight">${a.text}</p>
          <span class="text-[10px] text-slate-500 font-mono mt-0.5 block">${a.time}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Toggle Dynamic Route Rerouting Visualizer
async function toggleRerouting() {
  try {
    const res = await fetch('/api/reroute/toggle', { method: 'POST' });
    const data = await res.json();
    state = data.state;
    renderUI();
  } catch (err) {
    console.error('Error toggling dynamic rerouting:', err);
  }
}

// Toggle Optimization Plan
async function toggleOptimization() {
  const endpoint = state && state.isOptimized ? '/api/optimize/reset' : '/api/optimize/apply';
  try {
    const res = await fetch(endpoint, { method: 'POST' });
    const data = await res.json();
    state = data.state;
    renderUI();
  } catch (err) {
    console.error('Error toggling optimization:', err);
  }
}

// Create New Block Form Submission
document.getElementById('createBlockForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const section = document.getElementById('blockSection').value;
  const type = document.getElementById('blockType').value;
  const start = document.getElementById('blockStart').value;
  const end = document.getElementById('blockEnd').value;
  
  try {
    const res = await fetch('/api/blocks/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, type, timing: `${start} - ${end}` })
    });
    const data = await res.json();
    state = data.state;
    renderUI();
    closeModal('createBlockModal');
  } catch (err) {
    console.error('Error creating block:', err);
  }
});

// Reschedule Block Form Submission
const rescheduleForm = document.getElementById('rescheduleBlockForm');
if (rescheduleForm) {
  rescheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const blockId = document.getElementById('rescheduleSelect').value;
    const start = document.getElementById('rescheduleStart').value;
    const end = document.getElementById('rescheduleEnd').value;
    const reason = document.getElementById('rescheduleReason').value;

    try {
      const res = await fetch('/api/blocks/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId, newTiming: `${start} - ${end}`, reason })
      });
      const data = await res.json();
      state = data.state;
      renderUI();
      closeModal('rescheduleBlockModal');
      alert(`⚡ ${data.message}`);
    } catch (err) {
      console.error('Error rescheduling block:', err);
    }
  });
}

// Digital Twin Interactive Simulation
async function runSimulation() {
  const weather = document.getElementById('simWeather') ? document.getElementById('simWeather').value : 'normal';
  const breakdown = document.getElementById('simBreakdown') ? (document.getElementById('simBreakdown').value !== 'none') : false;
  const freightSurge = document.getElementById('simFreightSurge') ? document.getElementById('simFreightSurge').checked : false;

  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weather, breakdown, freightSurge })
    });
    const data = await res.json();
    
    if (data.success) {
      document.getElementById('simBaseDelay').innerText = '2,346m';
      document.getElementById('simSimDelay').innerText = `${data.simulatedMetrics.totalDelay}m`;
      const diff = Math.round((1 - data.simulatedMetrics.totalDelay / 2346) * 100);
      document.getElementById('simSavedDelay').innerText = `↓ ${diff}%`;

      alert(`🧪 Digital Twin Solver Simulation Complete!\n\nScenario: ${data.scenarioName}\nSimulated Delay: ${data.simulatedMetrics.totalDelay} mins (Saved ${diff}%)\n\nRecommendation: ${data.xaiReasoning.summary}`);
      
      // Update state with simulated result if accepted
      state = data.simulatedState;
      renderUI();
      closeModal('simulationModal');
    }
  } catch (err) {
    console.error('Error running Digital Twin simulation:', err);
  }
}

// Modal helper functions
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// Listen for Real-Time Server-Sent Events (SSE)
const eventSource = new EventSource('/api/events');
eventSource.onmessage = (e) => {
  const data = JSON.parse(e.data);
  state = data;
  renderUI();
};
eventSource.addEventListener('state_updated', (e) => {
  const data = JSON.parse(e.data);
  state = data;
  renderUI();
});

// Initial load
fetchState();
