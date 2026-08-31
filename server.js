const express = require('express');
const cors = require('cors');
const path = require('path');
const { solveOptimization } = require('./optimizationEngine');

const appAuthority = express();
const appUser = express();

appAuthority.use(cors());
appAuthority.use(express.json());
appUser.use(cors());
appUser.use(express.json());

// Server-Sent Events subscribers
let clients = [];

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => client.res.write(payload));
}

// System State (Accurate Indian Railways Topology - Kharagpur / South Eastern Corridor)
let systemState = {
  appName: 'RailOpt AI',
  isOptimized: false,
  isRerouted: false,
  rerouteInfo: null,
  activeBlocksCount: 24,
  trainsOnRun: 186,
  affectedTrainsCount: 37,
  totalDelayMins: 2346,
  assetAvailability: 78,
  
  division: 'Kharagpur Division (SER)',
  zone: 'South Eastern Railway / Eastern Railway Corridor',

  currentPlan: {
    affectedTrains: 37,
    totalDelay: 2346,
    assetAvailability: 78
  },
  optimizedPlan: {
    affectedTrains: 18,
    totalDelay: 1182,
    assetAvailability: 90
  },

  blocks: [
    { id: 'B-127', section: 'MURI - BKSC (Muri - Bokaro Steel City)', type: 'TRW (Track Renewal Work - BCM 342)', timing: '14:20 - 15:10', status: 'ACTIVE', badgeClass: 'badge-danger', loco: 'WAG-9H #31120' },
    { id: 'B-128', section: 'DGR - ASN (Durgapur - Asansol Line 3)', type: 'OHE Overhead Wire Maintenance', timing: '15:40 - 16:25', status: 'UPCOMING', badgeClass: 'badge-warning', loco: 'Tower Wagon #102' },
    { id: 'B-129', section: 'KGP - MDN (Kharagpur - Midnapore Down)', type: 'S&T Electronic Interlocking Inspection', timing: '16:30 - 17:10', status: 'PLANNED', badgeClass: 'badge-info', loco: 'N/A' },
    { id: 'B-130', section: 'HWH Yard (Howrah South Cab Line 4)', type: 'Point & Crossing Machine Tamping', timing: '22:00 - 23:00', status: 'PLANNED', badgeClass: 'badge-info', loco: 'CSM Tamping #804' },
    { id: 'B-131', section: 'TATA - RNC (Tatanagar - Ranchi Section)', type: 'Bridge #42 Girder Testing', timing: '23:30 - 01:00', status: 'PLANNED', badgeClass: 'badge-info', loco: 'Crane Unit #09' }
  ],

  trains: [
    { number: '20898', name: 'Ranchi - Howrah Vande Bharat Exp', route: 'RNC - MURI - BKSC (Blocked) -> Diverted via TATA - KGP - HWH', delay: 52, impact: 'High', badgeClass: 'badge-high', loco: 'Vande Bharat Rake 8', speed: '130 km/h', currentStation: 'Muri Jn (MURI)', x: 160, y: 80, rerouteX: 200, rerouteY: 210, path: 'M 80,110 L 160,80 L 260,80 L 370,50 L 480,90 L 590,190', reroutePath: 'M 80,110 L 160,80 L 200,210 L 460,260 L 590,190' },
    { number: '12019', name: 'Howrah - Ranchi Shatabdi Exp', route: 'HWH - DGR - ASN - DHN - BKSC (Blocked) -> Rerouted via KGP - TATA', delay: 48, impact: 'High', badgeClass: 'badge-high', loco: 'WAP-7 #30219', speed: '130 km/h', currentStation: 'Asansol Jn (ASN)', x: 480, y: 90, rerouteX: 460, rerouteY: 260, path: 'M 590,190 L 560,70 L 480,90 L 370,50 L 260,80 L 160,80 L 80,110', reroutePath: 'M 590,190 L 460,260 L 200,210 L 160,80 L 80,110' },
    { number: '12810', name: 'Howrah - Mumbai CSMT Mail', route: 'HWH - KGP - TATA - ROU - BSP - NGP - CSMT', delay: 38, impact: 'High', badgeClass: 'badge-high', loco: 'WAP-7 #30245 (HWH Depot)', speed: '110 km/h', currentStation: 'Tatanagar Jn (TATA)', x: 200, y: 210, path: 'M 590,190 L 460,260 L 200,210 L 80,110' },
    { number: '12262', name: 'Howrah - Mumbai Duronto Exp', route: 'HWH - KGP - TATA - ROU - BSP - NGP - CSMT', delay: 31, impact: 'High', badgeClass: 'badge-high', loco: 'WAP-7 #30412', speed: '120 km/h', currentStation: 'Kharagpur Jn (KGP)', x: 460, y: 260, path: 'M 590,190 L 460,260 L 200,210 L 80,110' },
    { number: '12860', name: 'Gitanjali Express (HWH - CSMT)', route: 'HWH - KGP - TATA - ROU - NGP', delay: 25, impact: 'Medium', badgeClass: 'badge-medium', loco: 'WAP-7 #30331', speed: '110 km/h', currentStation: 'Midnapore (MDN)', x: 330, y: 240, path: 'M 590,190 L 460,260 L 330,240 L 200,210' },
    { number: '12839', name: 'Howrah - Chennai Mail', route: 'HWH - KGP - VSKP - MAS', delay: 18, impact: 'Medium', badgeClass: 'badge-medium', loco: 'WAP-7 #30501', speed: '110 km/h', currentStation: 'Kharagpur Outer', x: 490, y: 240, path: 'M 590,190 L 460,260' },
    { number: '12301', name: 'Howrah - New Delhi Rajdhani Exp', route: 'HWH - ASN - DHN - DDU - NDLS', delay: 12, impact: 'Low', badgeClass: 'badge-low', loco: 'WAP-7 #30201', speed: '130 km/h', currentStation: 'Dhanbad Jn (DHN)', x: 370, y: 50, path: 'M 590,190 L 560,70 L 480,90 L 370,50' }
  ],

  pnrDatabase: {
    '1234567890': {
      trainNumber: '20898',
      trainName: 'Ranchi - Howrah Vande Bharat Express',
      pnr: '1234567890',
      class: 'Executive Chair Car (EC)',
      coach: 'E1 - Seat 18 (Window)',
      passengerName: 'Jayashree',
      currentDelay: 38,
      expectedArrival: '12:15 PM Today',
      nextStop: 'Muri Jn (MURI)',
      nextStopArrival: '06:10 AM',
      nextStopDelay: 25,
      stopsAffected: 3,
      passengersAffected: '530+',
      activeBlock: {
        title: 'Track Renewal Work (TRW - BCM 342)',
        location: 'Muri Jn (MURI) - Bokaro Steel City (BKSC) Section',
        type: 'Deep Screening & Track Tamping',
        timing: '14:20 - 15:10',
        status: 'In Progress',
        explanation: 'Block B-127 has closed the Muri - Bokaro section. To prevent holding Vande Bharat Express for 2+ hours, RailOpt AI reroutes the train via Chandil -> Tatanagar (TATA) -> Kharagpur (KGP) -> Howrah (HWH), bypassing the blocked Bokaro track entirely!'
      },
      timeline: [
        { station: 'Ranchi Jn (RNC)', code: 'RNC', time: '05:15 AM', status: 'Departed On Time', state: 'completed' },
        { station: 'Muri Jn (MURI)', code: 'MURI', time: '06:10 AM', status: 'Held at Signal (25m delay)', state: 'current', isCurrent: true, detail: 'Reason: Block B-127 ahead on MURI-BKSC track. AI initiating reroute.' },
        { station: '🔀 AI Reroute: Chandil / Tatanagar (TATA)', code: 'TATA', time: '08:30 AM', status: 'AI Reroute Active', state: 'pending', detail: 'Bypassing blocked Muri-Bokaro section via Tatanagar & Kharagpur trunk line' },
        { station: 'Kharagpur Jn (KGP)', code: 'KGP', time: '10:15 AM', status: 'Expected Delay 20 mins', state: 'pending' },
        { station: 'Howrah Jn (HWH)', code: 'HWH', time: '12:15 PM', status: 'Expected Delay 25 mins (Saved 45 mins)', state: 'pending' }
      ]
    },
    '2089800001': {
      trainNumber: '20898',
      trainName: 'Ranchi - Howrah Vande Bharat Express',
      pnr: '2089800001',
      class: 'Executive Chair Car (EC)',
      coach: 'E1 - Seat 12 (Window)',
      passengerName: 'Rajesh Sharma',
      currentDelay: 25,
      expectedArrival: '12:15 PM Today',
      nextStop: 'Muri Jn (MURI)',
      nextStopArrival: '06:10 AM',
      nextStopDelay: 15,
      stopsAffected: 2,
      passengersAffected: '530+',
      activeBlock: {
        title: 'Track Renewal Work (TRW - BCM 342)',
        location: 'Muri Jn (MURI) - Bokaro Steel City (BKSC) Section',
        type: 'Track Tamping & Deep Screening',
        timing: '14:20 - 15:10',
        status: 'In Progress',
        explanation: 'AI rerouted service via Tatanagar & Kharagpur trunk line to bypass blocked Muri-Bokaro track.'
      },
      timeline: [
        { station: 'Ranchi Jn (RNC)', code: 'RNC', time: '05:15 AM', status: 'Departed On Time', state: 'completed' },
        { station: 'Muri Jn (MURI)', code: 'MURI', time: '06:10 AM', status: 'Delayed 15 mins', state: 'delayed', detail: 'Muri-Bokaro line blocked' },
        { station: 'Tatanagar Jn (TATA)', code: 'TATA', time: '08:30 AM', status: 'Rerouted via Loop', state: 'pending', detail: '🔀 AI Reroute: Bypassing Bokaro' },
        { station: 'Kharagpur Jn (KGP)', code: 'KGP', time: '10:15 AM', status: 'Expected Delay 20 mins', state: 'pending' },
        { station: 'Howrah Jn (HWH)', code: 'HWH', time: '12:15 PM', status: 'Expected Delay 25 mins', state: 'pending' }
      ]
    },
    '1226200045': {
      trainNumber: '12019',
      trainName: 'Howrah - Ranchi Shatabdi Express',
      pnr: '1226200045',
      class: 'AC Chair Car (CC)',
      coach: 'C2 - Seat 34 (Window)',
      passengerName: 'Amit Kumar',
      currentDelay: 20,
      expectedArrival: '01:10 PM Today',
      nextStop: 'Kharagpur Jn (KGP)',
      nextStopArrival: '08:10 AM',
      nextStopDelay: 10,
      stopsAffected: 2,
      passengersAffected: '680+',
      activeBlock: {
        title: 'AI Reroute Active',
        location: 'Kharagpur - Tatanagar Loop',
        type: 'Dynamic AI Traffic Management',
        timing: 'Continuous',
        status: 'Active Reroute',
        explanation: 'Shatabdi Express rerouted via Kharagpur & Tatanagar to avoid blocked Bokaro-Muri section.'
      },
      timeline: [
        { station: 'Howrah Jn (HWH)', code: 'HWH', time: '06:05 AM', status: 'Departed On Time', state: 'completed' },
        { station: 'Kharagpur Jn (KGP)', code: 'KGP', time: '08:10 AM', status: 'Rerouted via KGP-TATA Line', state: 'current', isCurrent: true, detail: '🔀 AI Reroute Active: Avoiding MURI-BKSC Track Block' },
        { station: 'Tatanagar Jn (TATA)', code: 'TATA', time: '10:00 AM', status: 'Expected On Time', state: 'pending' },
        { station: 'Muri Jn (MURI)', code: 'MURI', time: '11:45 AM', status: 'Expected Delay 15 mins', state: 'pending' },
        { station: 'Ranchi Jn (RNC)', code: 'RNC', time: '01:10 PM', status: 'Expected Delay 20 mins', state: 'pending' }
      ]
    }
  },

  userPov: {
    trainNumber: '20898',
    trainName: 'Ranchi - Howrah Vande Bharat Express',
    pnr: '1234567890',
    passengerName: 'Jayashree',
    coach: 'Executive Chair Car (E1 - Seat 18)',
    currentDelay: 38,
    expectedArrival: '12:15 PM Today',
    nextStop: 'Muri Jn (MURI)',
    nextStopArrival: '06:10 AM',
    nextStopDelay: 25,
    stopsAffected: 3,
    passengersAffected: '530+',
    activeBlock: {
      title: 'Track Renewal Work (TRW - BCM 342)',
      location: 'Muri Jn (MURI) - Bokaro Steel City (BKSC) Section',
      type: 'Deep Screening & Track Tamping',
      timing: '14:20 - 15:10',
      status: 'In Progress',
      explanation: 'Block B-127 has closed the Muri - Bokaro section. To prevent holding Vande Bharat Express for 2+ hours, RailOpt AI reroutes the train via Chandil -> Tatanagar (TATA) -> Kharagpur (KGP) -> Howrah (HWH), bypassing the blocked Bokaro track entirely!'
    },
    timeline: [
      { station: 'Ranchi Jn (RNC)', code: 'RNC', time: '05:15 AM', status: 'Departed On Time', state: 'completed' },
      { station: 'Muri Jn (MURI)', code: 'MURI', time: '06:10 AM', status: 'Held at Signal (25m delay)', state: 'current', isCurrent: true, detail: 'Reason: Block B-127 ahead on MURI-BKSC track. AI initiating reroute.' },
      { station: '🔀 AI Reroute: Chandil / Tatanagar (TATA)', code: 'TATA', time: '08:30 AM', status: 'AI Reroute Active', state: 'pending', detail: 'Bypassing blocked Muri-Bokaro section via Tatanagar & Kharagpur trunk line' },
      { station: 'Kharagpur Jn (KGP)', code: 'KGP', time: '10:15 AM', status: 'Expected Delay 20 mins', state: 'pending' },
      { station: 'Howrah Jn (HWH)', code: 'HWH', time: '12:15 PM', status: 'Expected Delay 25 mins (Saved 45 mins)', state: 'pending' }
    ]
  },

  xaiReasoning: {
    summary: 'Muri - Bokaro (MURI-BKSC) section is BLOCKED by Track Renewal Work (Block B-127). To avoid holding high-priority Vande Bharat (20898) & Shatabdi (12019) at Muri, RailOpt AI automatically diverts them via the Tatanagar (TATA) & Kharagpur (KGP) trunk corridor directly to Howrah!',
    featureAttribution: {
      trainPriorityWeight: 42,
      safetyHeadwayMargin: 28,
      maintenancePenalty: 18,
      assetUtilization: 12
    },
    tradeoffs: [
      { metric: 'Reroute Path', value: 'RNC -> MURI -> TATA -> KGP -> HWH', status: 'positive' },
      { metric: 'Bypassed Section', value: 'Blocked MURI - BKSC Track', status: 'positive' },
      { metric: 'Delay Saved', value: '45 mins saved for Vande Bharat', status: 'positive' }
    ]
  },

  alerts: [
    { id: 1, text: 'Block B-127 (Muri-Bokaro) started at 14:20 (TRW Ballast Cleaning Machine on Line 1)', time: '14:30', icon: 'alert-circle', type: 'danger' },
    { id: 2, text: '🔀 AI Reroute Triggered: Train 20898 (Vande Bharat) rerouted via Tatanagar & Kharagpur to bypass Muri-Bokaro block', time: '14:28', icon: 'route', type: 'success' },
    { id: 3, text: 'Signal interlock inspection planned at Durgapur Line 3', time: '14:18', icon: 'triangle-alert', type: 'warning' },
    { id: 4, text: 'Rescheduling requested for Block B-128 by Adra Control', time: '13:55', icon: 'info', type: 'info' },
    { id: 5, text: 'IMD Weather alert: Heavy rainfall expected in Kharagpur Division', time: '13:50', icon: 'cloud-rain', type: 'weather' }
  ]
};

// API Endpoints
const handleGetState = (req, res) => res.json(systemState);

const handleSearchPnr = (req, res) => {
  const { pnr } = req.query;
  if (systemState.pnrDatabase[pnr]) {
    systemState.userPov = systemState.pnrDatabase[pnr];
    broadcast('state_updated', systemState);
    return res.json({ success: true, userPov: systemState.userPov });
  }
  return res.status(404).json({ success: false, message: 'PNR not found in RailOpt AI database.' });
};

// Toggle Dynamic Route Rerouting Visualizer
const handleToggleReroute = (req, res) => {
  systemState.isRerouted = !systemState.isRerouted;

  if (systemState.isRerouted) {
    systemState.rerouteInfo = {
      trainNumber: '20898',
      trainName: 'Ranchi - Howrah Vande Bharat Express',
      originalPath: 'RNC -> MURI -> BKSC (Blocked) -> DHN -> HWH',
      reroutedPath: 'RNC -> MURI -> TATA (Tatanagar) -> KGP (Kharagpur) -> HWH',
      distanceDiff: '+18 km',
      delaySaved: '45 mins delay saved',
      status: 'Active Reroute'
    };

    systemState.userPov.currentDelay = 18;
    systemState.userPov.expectedArrival = '11:55 AM Today';
    if (systemState.userPov.timeline && systemState.userPov.timeline[2]) {
      systemState.userPov.timeline[2].status = 'Rerouted via TATA/KGP Bypass';
      systemState.userPov.timeline[2].detail = '🔀 AI Reroute Active: Bypassing MURI-BKSC Track Renewal Work via Tatanagar & Kharagpur';
    }

    systemState.alerts.unshift({
      id: Date.now(),
      text: '🔀 Dynamic Reroute Active: Train 20898 rerouted via Tatanagar & Kharagpur bypass (Saves 45 mins delay)',
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      icon: 'route',
      type: 'success'
    });
  } else {
    systemState.rerouteInfo = null;
    systemState.userPov.currentDelay = 38;
    systemState.userPov.expectedArrival = '12:15 PM Today';
    if (systemState.userPov.timeline && systemState.userPov.timeline[1]) {
      systemState.userPov.timeline[1].status = 'Held at Signal (25m delay)';
      systemState.userPov.timeline[1].detail = 'Reason: Block B-127 ahead on MURI-BKSC track.';
    }
  }

  broadcast('state_updated', systemState);
  res.json({ success: true, isRerouted: systemState.isRerouted, state: systemState });
};

const handleRescheduleBlock = (req, res) => {
  const { blockId, newTiming, reason } = req.body;
  const targetBlock = systemState.blocks.find(b => b.id === blockId);
  if (targetBlock) {
    targetBlock.timing = newTiming || '16:00 - 16:50';
    targetBlock.status = 'RESCHEDULED';
    targetBlock.badgeClass = 'badge-warning';

    systemState.alerts.unshift({
      id: Date.now(),
      text: `⚡ Block ${blockId} (${targetBlock.section}) rescheduled to ${newTiming}. Reason: ${reason || 'Operational Optimization'}`,
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      icon: 'clock',
      type: 'warning'
    });

    broadcast('state_updated', systemState);
    return res.json({ success: true, message: `Block ${blockId} successfully rescheduled!`, block: targetBlock, state: systemState });
  }
  res.status(404).json({ success: false, message: 'Block ID not found.' });
};

// Dynamic AI Optimization Endpoint (Uses optimizationEngine.js)
const handleApplyOptimization = (req, res) => {
  systemState = solveOptimization(systemState);
  broadcast('state_updated', systemState);
  res.json({ success: true, message: 'RailOpt AI Optimization Applied Successfully!', state: systemState });
};

const handleResetOptimization = (req, res) => {
  systemState.isOptimized = false;
  systemState.isRerouted = false;
  systemState.affectedTrainsCount = systemState.currentPlan.affectedTrains;
  systemState.totalDelayMins = systemState.currentPlan.totalDelay;
  systemState.assetAvailability = systemState.currentPlan.assetAvailability;

  systemState.trains = [
    { number: '20898', name: 'Ranchi - Howrah Vande Bharat Exp', route: 'RNC - MURI - BKSC (Blocked) -> Diverted via TATA - KGP - HWH', delay: 52, impact: 'High', badgeClass: 'badge-high', loco: 'Vande Bharat Rake 8', speed: '130 km/h' },
    { number: '12019', name: 'Howrah - Ranchi Shatabdi Exp', route: 'HWH - DGR - ASN - DHN - BKSC (Blocked) -> Rerouted via KGP - TATA', delay: 48, impact: 'High', badgeClass: 'badge-high', loco: 'WAP-7 #30219', speed: '130 km/h' },
    { number: '12810', name: 'Howrah - Mumbai CSMT Mail', route: 'HWH - KGP - TATA - ROU - BSP - NGP - CSMT', delay: 38, impact: 'High', badgeClass: 'badge-high', loco: 'WAP-7 #30245', speed: '110 km/h' },
    { number: '12262', name: 'Howrah - Mumbai Duronto Exp', route: 'HWH - KGP - TATA - ROU - BSP - NGP - CSMT', delay: 31, impact: 'High', badgeClass: 'badge-high', loco: 'WAP-7 #30412', speed: '120 km/h' },
    { number: '12860', name: 'Gitanjali Express (HWH - CSMT)', route: 'HWH - KGP - TATA - ROU - NGP', delay: 25, impact: 'Medium', badgeClass: 'badge-medium', loco: 'WAP-7 #30331', speed: '110 km/h' },
    { number: '12839', name: 'Howrah - Chennai Mail', route: 'HWH - KGP - VSKP - MAS', delay: 18, impact: 'Medium', badgeClass: 'badge-medium', loco: 'WAP-7 #30501', speed: '110 km/h' },
    { number: '12301', name: 'Howrah - New Delhi Rajdhani Exp', route: 'HWH - ASN - DHN - DDU - NDLS', delay: 12, impact: 'Low', badgeClass: 'badge-low', loco: 'WAP-7 #30201', speed: '130 km/h' }
  ];

  systemState.userPov.currentDelay = 38;
  systemState.userPov.expectedArrival = '12:15 PM Today';
  systemState.userPov.nextStopDelay = 25;

  broadcast('state_updated', systemState);
  res.json({ success: true, message: 'Plan Reset to Baseline', state: systemState });
};

// Digital Twin Sandbox Simulation Endpoint
const handleSimulateDigitalTwin = (req, res) => {
  const { weather, breakdown, freightSurge } = req.body || {};
  const simulatedState = solveOptimization(systemState, { weather, breakdown, freightSurge });
  res.json({
    success: true,
    scenarioName: weather === 'heavy_rain' ? 'Heavy Rain Disruption' : 'Standard Digital Twin Run',
    simulatedMetrics: {
      totalDelay: simulatedState.totalDelayMins,
      affectedTrains: simulatedState.affectedTrainsCount,
      assetAvailability: simulatedState.assetAvailability,
      conflictsDetected: breakdown ? 4 : 2
    },
    xaiReasoning: simulatedState.xaiReasoning,
    simulatedState
  });
};

const handleCreateBlock = (req, res) => {
  const { section, type, timing } = req.body;
  const newId = `B-${132 + systemState.blocks.length - 5}`;
  const newBlock = {
    id: newId,
    section: section || 'ASN - DGR (Asansol - Durgapur Line 2)',
    type: type || 'Track Inspection & BCM Tamping',
    timing: timing || '18:00 - 19:30',
    status: 'PLANNED',
    badgeClass: 'badge-info',
    loco: 'WAG-9 #31420'
  };

  systemState.blocks.push(newBlock);
  systemState.activeBlocksCount += 1;
  systemState.alerts.unshift({
    id: Date.now(),
    text: `New Block ${newId} created for ${newBlock.section} by Controller`,
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    icon: 'plus-circle',
    type: 'info'
  });

  broadcast('state_updated', systemState);
  res.json({ success: true, block: newBlock, state: systemState });
};

// SSE Handler
const handleEvents = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
  });
};

// Register routes on both apps
[appAuthority, appUser].forEach(app => {
  app.get('/api/state', handleGetState);
  app.get('/api/pnr', handleSearchPnr);
  app.post('/api/reroute/toggle', handleToggleReroute);
  app.post('/api/optimize/apply', handleApplyOptimization);
  app.post('/api/optimize/reset', handleResetOptimization);
  app.post('/api/simulate', handleSimulateDigitalTwin);
  app.post('/api/blocks/create', handleCreateBlock);
  app.post('/api/blocks/reschedule', handleRescheduleBlock);
  app.get('/api/events', handleEvents);
});

// Serve Static Assets
appAuthority.use(express.static(path.join(__dirname, 'public', 'authority')));
appUser.use(express.static(path.join(__dirname, 'public', 'user')));

// Authority fallback
appAuthority.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'authority', 'index.html'));
});

// User POV fallback
appUser.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user', 'index.html'));
});

// Start Servers
const PORT_AUTHORITY = 3000;
const PORT_USER = 3001;

appAuthority.listen(PORT_AUTHORITY, () => {
  console.log(`=======================================================`);
  console.log(`🚆 RailOpt AI Authority Dashboard: http://localhost:${PORT_AUTHORITY}`);
  console.log(`=======================================================`);
});

appUser.listen(PORT_USER, () => {
  console.log(`=======================================================`);
  console.log(`📱 RailOpt AI Passenger App (User POV): http://localhost:${PORT_USER}`);
  console.log(`=======================================================`);
});
