import { API, toSvgRoomId, svgRoomPrefixes } from './api.js';
import { State } from './state.js';
import { Schedule } from './schedule.js';
import { MOCK_TALKS } from './mockData.js';
import { initK8sBackground } from './k8sBackground.js';
import {
  generateGoogleCalendarUrl,
  generateIcsCalendar,
  downloadIcsFile,
  openGoogleCalendar
} from './calendarExport.js';

// DOM Views
const viewLanding = document.getElementById('view-landing');
const viewMap = document.getElementById('view-map');
const viewOffsite = document.getElementById('view-offsite');

// Navigation Buttons
const btnBrandHome = document.getElementById('btn-brand-home');
const navBtnHome = document.getElementById('nav-btn-home');
const navBtnMap = document.getElementById('nav-btn-map');
const navBtnOffsite = document.getElementById('nav-btn-offsite');
const navBtnSchedule = document.getElementById('nav-btn-schedule');
const navBtnInfo = document.getElementById('nav-btn-info');
const btnQuickSchedule = document.getElementById('btn-quick-schedule');

// Landing Venue Selection Cards
const cardSelectSaltPalace = document.getElementById('card-select-salt-palace');
const cardSelectOther = document.getElementById('card-select-other');

// Back Buttons
const btnBackToVenuesFromMap = document.getElementById('btn-back-to-venues-from-map');
const btnBackToVenuesFromOffsite = document.getElementById('btn-back-to-venues-from-offsite');

// Search Elements
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear');
const searchDropdown = document.getElementById('search-results-dropdown');
const dropdownResultsCount = document.getElementById('dropdown-results-count');
const dropdownTalksList = document.getElementById('dropdown-talks-list');

// Salt Palace Map Card Elements
const currentLevelTitle = document.getElementById('current-level-title');
const currentTalkCount = document.getElementById('current-talk-count');
const tabLevel1 = document.getElementById('tab-level-1');
const tabLevel2 = document.getElementById('tab-level-2');
const tabLevel3 = document.getElementById('tab-level-3');
const floorplanObject = document.getElementById('salt-palace-svg-object');
const activeTalkCard = document.getElementById('active-talk-card');
const cardTalkTitle = document.getElementById('card-talk-title');
const cardTalkLocation = document.getElementById('card-talk-location');
const cardTalkDescription = document.getElementById('card-talk-description');
const cardBtnSchedule = document.getElementById('card-btn-schedule');
const cardTime = document.getElementById('card-time');
const cardA11yChip = document.getElementById('card-a11y-chip');
const cardAudience = document.getElementById('card-audience');
const cardTopic = document.getElementById('card-topic');

// Off-site Talks Elements
const offsiteTalksContainer = document.getElementById('offsite-talks-container');
const offsiteFilterChips = document.getElementById('offsite-venue-filter-chips');

// Schedule Drawer Elements
const scheduleDrawer = document.getElementById('schedule-drawer');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const scheduleTalksList = document.getElementById('schedule-talks-list');
const scheduleSummaryText = document.getElementById('schedule-summary-text');
const topScheduleCount = document.getElementById('top-schedule-count');
const dockScheduleBadge = document.getElementById('dock-schedule-badge');
const btnCloseSchedule = document.getElementById('btn-close-schedule');
const btnDoneSchedule = document.getElementById('btn-done-schedule');
const btnClearSchedule = document.getElementById('btn-clear-schedule');
const scheduleExportBar = document.getElementById('schedule-export-bar');
const btnExportAppleAll = document.getElementById('btn-export-apple-all');
const btnExportGoogleAll = document.getElementById('btn-export-google-all');

// Google Calendar Export Modal Elements
const gcalExportModal = document.getElementById('gcal-export-modal');
const btnCloseGcalModal = document.getElementById('btn-close-gcal-modal');
const btnGcalDownloadIcs = document.getElementById('btn-gcal-download-ics');
const btnGcalOpenAll = document.getElementById('btn-gcal-open-all');
const gcalSessionsList = document.getElementById('gcal-sessions-list');

// Info Modal
const infoModal = document.getElementById('info-modal');
const btnCloseInfo = document.getElementById('btn-close-info');
const btnToggleContrast = document.getElementById('btn-toggle-contrast');
const btnToggleFont = document.getElementById('btn-toggle-font');
const a11yAnnouncements = document.getElementById('a11y-announcements');

let currentActiveTalk = null;
let searchDebounceTimeout = null;
let currentView = 'landing'; // 'landing' | 'map' | 'offsite'
let lastResult = null;        // most recent /search response (talks + counts)

function announce(msg) {
  if (a11yAnnouncements) a11yAnnouncements.textContent = msg;
}

// Current filter choices (controls are optional; missing ones mean "any")
function currentFilters() {
  return {
    day: document.getElementById('filter-day')?.value || '',
    wheelchair: document.getElementById('filter-wheelchair')?.checked ? 'true' : '',
  };
}

// Color each Salt Palace room by how many matching talks it has (the heatmap)
function paintHeatmap(roomCounts = {}) {
  const svgDoc = floorplanObject?.contentDocument;
  if (!svgDoc) return;
  const maxCount = Math.max(0, ...Object.values(roomCounts));
  svgDoc.querySelectorAll('.map-room[data-room]').forEach(room => {
    const id = room.getAttribute('data-room');
    if (id.startsWith('260')) return; // quiet rooms keep their own style
    const n = roomCounts[id] || 0;
    // Color relative to the busiest room, so the map still shows contrast when every room is busy
    const share = maxCount > 0 ? n / maxCount : 0;
    const fill = n === 0 ? '#334155' : share >= 0.66 ? '#c2410c' : share >= 0.33 ? '#f97316' : '#fdba74';
    // Some rooms have several shapes (Hall DE is drawn as Hall E + Hall D)
    room.querySelectorAll('.room-top').forEach(top => { top.style.fill = fill; });
    // Show the number too, not color alone
    const zone = room.getAttribute('data-zone');
    room.setAttribute('aria-label',
      `Room ${id}${zone ? ', ' + zone : ''}, Level ${room.getAttribute('data-level')}, ${n} ${n === 1 ? 'talk' : 'talks'}`);
  });
}

function updateLevelCount() {
  const lvl = document.querySelector('.level-tab-btn.active')?.getAttribute('data-level') || 'Level 2';
  const n = lastResult?.aggregations?.levels?.[lvl] ?? 0;
  currentTalkCount.textContent = `${n} ${n === 1 ? 'TALK' : 'TALKS'}`;
}

// Re-run the search for the map and repaint the heatmap + level count
async function refreshMap() {
  lastResult = await API.search({ q: searchInput.value.trim(), ...currentFilters() });
  paintHeatmap(lastResult.aggregations.rooms);
  updateLevelCount();
}

function formatTime(startStr, endStr) {
  if (!startStr || !endStr) return '';
  const s = new Date(startStr);
  const e = new Date(endStr);
  const opts = { hour: 'numeric', minute: '2-digit', hour12: true };
  return `${s.toLocaleTimeString([], opts)} – ${e.toLocaleTimeString([], opts)} MT`;
}

// Switch between views
function switchView(viewName) {
  currentView = viewName;

  // Hide all views
  [viewLanding, viewMap, viewOffsite].forEach(v => {
    if (v) {
      v.style.display = 'none';
      v.classList.remove('active-view');
    }
  });

  // Update dock active buttons
  [navBtnHome, navBtnMap, navBtnOffsite].forEach(b => b?.classList.remove('active'));

  if (viewName === 'landing') {
    viewLanding.style.display = 'flex';
    viewLanding.classList.add('active-view');
    navBtnHome?.classList.add('active');
    announce('Navigated to Venue Selection');
  } else if (viewName === 'map') {
    viewMap.style.display = 'flex';
    viewMap.classList.add('active-view');
    navBtnMap?.classList.add('active');
    const activeTab = document.querySelector('.level-tab-btn.active');
    setFloorplanLevel(activeTab?.getAttribute('data-level') || 'Level 2');
    attachSvgRoomClickListeners();
    refreshMap();
    announce('Navigated to Salt Palace 3D Map View');
  } else if (viewName === 'offsite') {
    viewOffsite.style.display = 'flex';
    viewOffsite.classList.add('active-view');
    navBtnOffsite?.classList.add('active');
    renderOffsiteTalks('');
    announce('Navigated to Off-Site Talks View');
  }
}

// Initialize Application
async function init() {
  initK8sBackground('k8s-topology-canvas');
  setupEventListeners();
  setupFloorplanSync();
  updateScheduleBadges();

  // Load initial active talk for Salt Palace (Security Slam in 255 BC)
  const defaultTalk = MOCK_TALKS.find(t => t.id === '1379082') || MOCK_TALKS[0];
  if (defaultTalk) {
    displayActiveTalk(defaultTalk);
  }

  // Pre-load data
  await performSearch('');
}

// Floor-plan level and room interaction functions
function setFloorplanLevel(level) {
  const levelNumber = String(level).replace('Level ', '').trim();
  const svgWindow = floorplanObject?.contentWindow;
  const svgDocument = floorplanObject?.contentDocument;

  if (svgWindow?.setSaltPalaceLevel) {
    svgWindow.setSaltPalaceLevel(levelNumber);
  } else if (svgDocument) {
    // Fallback for browsers that expose the SVG document directly
    svgDocument.querySelectorAll('.level-group').forEach(group => {
      group.classList.toggle('is-active', group.getAttribute('data-level') === levelNumber);
    });
    svgDocument.documentElement.setAttribute('data-active-level', levelNumber);
  }
}

function attachSvgRoomClickListeners() {
  const svgDoc = floorplanObject?.contentDocument;
  if (!svgDoc) return;

  const roomEls = svgDoc.querySelectorAll('.map-room');
  roomEls.forEach(el => {
    if (el.dataset.listenerBound) return;
    el.dataset.listenerBound = 'true';

    const handleRoomSelect = () => {
      const roomId = el.getAttribute('data-room');
      const zone = el.getAttribute('data-zone') || 'Salt Palace';
      const lvl = el.getAttribute('data-level') || '2';
      handleSvgRoomClick(roomId, lvl, zone);
    };

    el.addEventListener('click', handleRoomSelect);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleRoomSelect();
      }
    });
  });
}

// "HALL-BC" → "Hall BC", "BALLROOM" → "Grand Ballroom", "255" → "Room 255"
function roomDisplayName(roomId) {
  if (roomId.startsWith('HALL-')) return `Hall ${roomId.slice(5)}`;
  if (roomId === 'BALLROOM') return 'Grand Ballroom';
  return `Room ${roomId}`;
}

async function handleSvgRoomClick(roomId, level, zone) {
  if (!roomId) return;

  // 1. Special Sensory Sanctuary Retreat (260A/B)
  if (roomId === '260A/B' || roomId === '260') {
    displaySensoryRoomInfo(roomId, level, zone);
    announce(`Selected Quiet Sensory Room ${roomId}`);
    return;
  }

  // 2. Ask the backend for talks in this room (respects the day/wheelchair filters).
  // No search text here: semantic search always returns its 10 nearest talks *within* the
  // filter, so "room + question" would claim 10 matches even in rooms that barely match.
  const res = await API.search({
    venue: 'Salt Palace',
    room: svgRoomPrefixes(roomId), // e.g. Hall 1 → ["Solutions Showcase | Hall 1", "Halls A-C"]
    ...currentFilters(),
  });
  const matchingTalk = res.talks[0];

  if (matchingTalk) {
    displayActiveTalk(matchingTalk);
    announce(`${roomDisplayName(roomId)}: ${res.total} ${res.total === 1 ? 'talk' : 'talks'}. Showing ${matchingTalk.title}`);
  } else {
    displayRoomPlaceholder(roomId, level, zone);
    announce(`Selected Room ${roomId}, Level ${level}`);
  }
}

function displaySensoryRoomInfo(roomId, level, zone) {
  currentActiveTalk = null;
  cardTalkTitle.textContent = '🌿 Quiet & Sensory Retreat (Room 260A/B)';
  cardTalkLocation.querySelector('span').textContent = `Salt Palace · Level ${level} · ${zone}`;
  cardTalkDescription.textContent = 'Designated quiet sanctuary with reduced lighting and low sensory stimulation. Available all day for attendees needing a peaceful space to recharge or take a break from the crowd.';
  cardTime.textContent = '08:00 – 18:00 MT';

  cardA11yChip.innerHTML = '<span class="chip-icon">♿</span><span>Verified Accessible & Quiet</span>';
  cardA11yChip.className = 'chip-item a11y-verified';

  cardAudience.textContent = 'Sensory Friendly';
  cardTopic.textContent = 'Sanctuary Space';

  updateCardScheduleButtonState(false);
}

function displayRoomPlaceholder(roomId, level, zone) {
  currentActiveTalk = null;
  cardTalkTitle.textContent = `Room ${roomId} Breakout Sessions`;
  cardTalkLocation.querySelector('span').textContent = `Salt Palace · Level ${level} · ${zone}`;
  cardTalkDescription.textContent = `Interactive technical sessions and maintainer office hours hosted in Room ${roomId}. Explore scheduled talks in the search bar above.`;
  cardTime.textContent = '10:00 – 17:00 MT';

  cardA11yChip.innerHTML = '<span class="chip-icon">♿</span><span>Verified Accessible</span>';
  cardA11yChip.className = 'chip-item a11y-verified';

  cardAudience.textContent = 'All Attendees';
  cardTopic.textContent = 'Breakout Room';

  updateCardScheduleButtonState(false);
}

function setupFloorplanSync() {
  if (!floorplanObject) return;

  const syncActiveLevel = () => {
    const activeTab = document.querySelector('.level-tab-btn.active');
    const lvl = activeTab?.getAttribute('data-level') || 'Level 2';
    setFloorplanLevel(lvl);
    attachSvgRoomClickListeners();
  };

  floorplanObject.addEventListener('load', syncActiveLevel);
  floorplanObject.addEventListener('load', refreshMap); // paint heatmap once the SVG exists
  window.addEventListener('load', syncActiveLevel, { once: true });

  if (floorplanObject.contentDocument?.querySelector('.level-group')) {
    syncActiveLevel();
  }
}

function setupEventListeners() {
  // 1. View Navigation
  cardSelectSaltPalace.addEventListener('click', () => switchView('map'));
  cardSelectOther.addEventListener('click', () => switchView('offsite'));

  // Brand badge and left sidebar were removed from the UI; keep these null-safe
  btnBrandHome?.addEventListener('click', () => switchView('landing'));
  navBtnHome?.addEventListener('click', () => switchView('landing'));
  navBtnMap?.addEventListener('click', () => switchView('map'));
  navBtnOffsite?.addEventListener('click', () => switchView('offsite'));

  btnBackToVenuesFromMap.addEventListener('click', () => switchView('landing'));
  btnBackToVenuesFromOffsite.addEventListener('click', () => switchView('landing'));

  // 2. Search Input with Debounce & Dropdown
  searchInput.addEventListener('input', e => {
    const val = e.target.value.trim();
    searchClearBtn.style.display = val ? 'block' : 'none';

    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(async () => {
      if (val.length > 0) {
        await performSearch(val);
        searchDropdown.style.display = 'flex';
      } else {
        searchDropdown.style.display = 'none';
      }
    }, 200);
  });

  // Talk card → full details dialog
  document.getElementById('card-btn-details')?.addEventListener('click', () => {
    if (currentActiveTalk) openTalkDetails(currentActiveTalk);
  });
  cardTalkTitle.style.cursor = 'pointer';
  cardTalkTitle.addEventListener('click', () => {
    if (currentActiveTalk) openTalkDetails(currentActiveTalk);
  });

  // Details dialog buttons (Escape also closes it: built into <dialog>)
  const detailsDialog = document.getElementById('talk-details-dialog');
  document.getElementById('details-close')?.addEventListener('click', () => detailsDialog.close());
  detailsDialog?.addEventListener('click', e => { if (e.target === detailsDialog) detailsDialog.close(); }); // click backdrop
  document.getElementById('details-btn-schedule')?.addEventListener('click', () => {
    if (!detailsTalk) return;
    const added = Schedule.toggleTalk(detailsTalk);
    updateDetailsScheduleButton();
    updateScheduleBadges();
    if (currentActiveTalk && String(currentActiveTalk.id) === String(detailsTalk.id)) {
      updateCardScheduleButtonState(added);
    }
    announce(added ? `Saved ${detailsTalk.title} to My Schedule` : `Removed ${detailsTalk.title} from schedule`);
  });
  document.getElementById('details-btn-map')?.addEventListener('click', () => {
    if (!detailsTalk) return;
    detailsDialog.close();
    showTalkOnMap(detailsTalk);
  });

  // Filters: re-run the current search and repaint the heatmap
  ['filter-day', 'filter-wheelchair'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', async () => {
      const val = searchInput.value.trim();
      if (val) {
        await performSearch(val);
      } else {
        await refreshMap();
      }
      announce(`Filters updated: ${lastResult?.total ?? 0} talks match`);
    });
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    searchDropdown.style.display = 'none';
    refreshMap(); // back to the full heatmap (filters still apply)
    searchInput.focus();
  });

  document.addEventListener('click', e => {
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
      searchDropdown.style.display = 'none';
    }
  });

  // 3. Salt Palace Card Add to Schedule
  cardBtnSchedule.addEventListener('click', () => {
    if (currentActiveTalk) {
      const added = Schedule.toggleTalk(currentActiveTalk);
      updateCardScheduleButtonState(added);
      announce(added ? `Saved ${currentActiveTalk.title} to My Schedule` : `Removed ${currentActiveTalk.title} from schedule`);
    }
  });

  // 4. Level Tabs
  [tabLevel1, tabLevel2, tabLevel3].forEach(tab => {
    if (!tab) return;
    tab.addEventListener('click', () => {
      [tabLevel1, tabLevel2, tabLevel3].forEach(t => {
        t?.classList.remove('active');
        t?.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const lvl = tab.getAttribute('data-level');
      currentLevelTitle.textContent = `Salt Palace ${lvl}`;
      
      updateLevelCount(); // real count from the last search
      setFloorplanLevel(lvl);
      attachSvgRoomClickListeners();
      announce(`Switched view to ${lvl}. Showing the Salt Palace ${lvl} floor plan.`);
    });
  });

  // 5. Offsite Subvenue Filter Chips
  if (offsiteFilterChips) {
    offsiteFilterChips.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        offsiteFilterChips.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filterVal = btn.getAttribute('data-subvenue');
        renderOffsiteTalks(filterVal);
      });
    });
  }

  // 6. Schedule Drawer Open/Close
  btnQuickSchedule.addEventListener('click', openScheduleDrawer);
  navBtnSchedule?.addEventListener('click', openScheduleDrawer);
  btnCloseSchedule.addEventListener('click', closeScheduleDrawer);
  btnDoneSchedule.addEventListener('click', closeScheduleDrawer);
  drawerBackdrop.addEventListener('click', () => {
    closeScheduleDrawer();
    closeGcalModal();
  });

  btnClearSchedule.addEventListener('click', () => {
    if (confirm('Clear your entire schedule?')) {
      Schedule.clear();
      updateScheduleBadges();
      renderScheduleDrawer();
      if (currentActiveTalk) updateCardScheduleButtonState(false);
      renderOffsiteTalks();
      announce('Schedule cleared');
    }
  });

  // Calendar Export Event Listeners
  btnExportAppleAll?.addEventListener('click', () => {
    const savedIds = Schedule.getSavedIds();
    const savedTalks = Schedule.getSavedTalks(MOCK_TALKS); // includes talks from live search
    if (savedTalks.length === 0) return;
    downloadIcsFile(savedTalks, 'kubecon-2026-schedule.ics');
    announce(`Downloaded ${savedTalks.length} ${savedTalks.length === 1 ? 'session' : 'sessions'} for Apple Calendar`);
  });

  btnExportGoogleAll?.addEventListener('click', () => {
    const savedIds = Schedule.getSavedIds();
    const savedTalks = Schedule.getSavedTalks(MOCK_TALKS);
    if (savedTalks.length === 0) return;
    if (savedTalks.length === 1) {
      openGoogleCalendar(savedTalks[0]);
      announce(`Opening "${savedTalks[0].title}" in Google Calendar`);
    } else {
      openGcalModal(savedTalks);
    }
  });

  btnCloseGcalModal?.addEventListener('click', closeGcalModal);
  btnGcalDownloadIcs?.addEventListener('click', () => {
    const savedIds = Schedule.getSavedIds();
    const savedTalks = Schedule.getSavedTalks(MOCK_TALKS);
    if (savedTalks.length > 0) {
      downloadIcsFile(savedTalks, 'kubecon-schedule-google-import.ics');
      announce('Downloaded calendar file for Google Calendar import');
    }
  });
  btnGcalOpenAll?.addEventListener('click', () => {
    const savedIds = Schedule.getSavedIds();
    const savedTalks = Schedule.getSavedTalks(MOCK_TALKS);
    savedTalks.forEach(talk => openGoogleCalendar(talk));
    announce(`Opened ${savedTalks.length} Google Calendar tabs`);
  });

  // 7. Info Modal
  navBtnInfo?.addEventListener('click', () => {
    infoModal.style.display = 'flex';
  });

  btnCloseInfo.addEventListener('click', () => {
    infoModal.style.display = 'none';
  });

  infoModal.addEventListener('click', e => {
    if (e.target === infoModal) infoModal.style.display = 'none';
  });

  // 8. Accessibility Controls
  btnToggleContrast.addEventListener('click', () => {
    const isHigh = document.body.classList.toggle('high-contrast');
    announce(`High contrast mode ${isHigh ? 'on' : 'off'}`);
  });

  let fontSizes = ['normal', 'large', 'xl'];
  let currentFontIdx = 0;
  btnToggleFont.addEventListener('click', () => {
    document.body.classList.remove('font-large', 'font-xl');
    currentFontIdx = (currentFontIdx + 1) % fontSizes.length;
    if (fontSizes[currentFontIdx] === 'large') document.body.classList.add('font-large');
    if (fontSizes[currentFontIdx] === 'xl') document.body.classList.add('font-xl');
    announce(`Font size ${fontSizes[currentFontIdx]}`);
  });

  Schedule.onChange(() => {
    updateScheduleBadges();
  });
}

// Display Talk in Bottom Frosted Card on Map View
function displayActiveTalk(talk) {
  currentActiveTalk = talk;
  cardTalkTitle.textContent = talk.title;
  cardTalkLocation.querySelector('span').textContent = talk.location?.room_full || `${talk.location?.venue || 'Salt Palace'} · ${talk.location?.room || 'Room'}`;
  cardTalkDescription.textContent = (talk.abstract || '').replace(/""/g, '"') || 'Join this session to connect with project maintainers and explore cutting-edge cloud native practices.';
  cardTime.textContent = formatTime(talk.start, talk.end);

  const isVerified = talk.accessibility?.wheelchair_accessible === true;
  cardA11yChip.innerHTML = `<span class="chip-icon">♿</span><span>${isVerified ? 'Verified Accessible' : 'Accessibility Unverified'}</span>`;
  cardA11yChip.className = `chip-item ${isVerified ? 'a11y-verified' : ''}`;

  cardAudience.textContent = talk.audience_level || 'All Levels';
  cardTopic.textContent = (talk.topics && talk.topics[0]) || (talk.topics_inferred && talk.topics_inferred[0]) || 'General Track';

  const speakersEl = document.getElementById('card-talk-speakers');
  if (speakersEl) speakersEl.textContent = speakerLine(talk);

  const isSaved = Schedule.hasTalk(talk.id);
  updateCardScheduleButtonState(isSaved);
}

// "Ada Lovelace (Acme), Grace Hopper" or ''
function speakerLine(talk) {
  const names = (talk.speakers || [])
    .map(s => (typeof s === 'string' ? s : s.company ? `${s.name} (${s.company})` : s.name))
    .filter(Boolean);
  return names.length ? `By ${names.join(', ')}` : '';
}

// Wait until the floor plan SVG has loaded its script (needed the first time the map opens)
function whenFloorplanReady(fn, tries = 20) {
  if (floorplanObject?.contentWindow?.selectSaltPalaceRoom) return fn();
  if (tries > 0) setTimeout(() => whenFloorplanReady(fn, tries - 1), 150);
}

// Jump to where a talk happens: right venue view, right level, room highlighted, card filled in
function showTalkOnMap(talk) {
  if (talk.location?.venue !== 'Salt Palace') {
    // Hyatt / off-site: no floor plan, so go to the list view and open the full details
    switchView('offsite');
    openTalkDetails(talk);
    return;
  }

  switchView('map');

  const level = talk.location?.level;
  const tab = level && document.querySelector(`.level-tab-btn[data-level="${level}"]`);
  if (tab && !tab.classList.contains('active')) tab.click(); // switches floor + updates count

  displayActiveTalk(talk);

  const roomId = toSvgRoomId(talk.location?.room);
  whenFloorplanReady(() => {
    if (roomId) floorplanObject.contentWindow.selectSaltPalaceRoom(roomId);
  });

  announce(`${talk.title}. ${talk.location?.room_full || ''}. ${formatTime(talk.start, talk.end)}`);
}

// Full talk details: title, speakers, time, place, registration, accessibility, abstract
let detailsTalk = null;

function openTalkDetails(talk) {
  const dialog = document.getElementById('talk-details-dialog');
  if (!dialog || !talk) return;
  detailsTalk = talk;

  document.getElementById('details-title').textContent = talk.title;
  document.getElementById('details-speakers').textContent = speakerLine(talk) || 'Speakers not listed';
  // Source data sometimes escapes quotes as "" (e.g. ""it depends"")
  document.getElementById('details-abstract').textContent =
    (talk.abstract || 'No abstract provided.').replace(/""/g, '"');

  const loc = talk.location || {};
  const meta = [
    ['🕒', `${formatTime(talk.start, talk.end)} · ${talk.day || ''}`],
    ['📍', loc.room_full || [loc.venue, loc.level, loc.room].filter(Boolean).join(' · ')],
    loc.address ? ['🗺️', loc.address] : null,
    ['🎟️', talk.registration?.label + (talk.registration?.sold_out ? ' · SOLD OUT' : '')],
    ['♿', talk.accessibility?.wheelchair_accessible === true
      ? 'Verified accessible venue'
      : 'Accessibility unverified: contact the event host'],
    talk.audience_level ? ['🎓', talk.audience_level] : null,
    ['🏷️', [...(talk.topics || []), ...(talk.topics_inferred || [])].slice(0, 3).join(', ') || 'General'],
  ].filter(Boolean);

  const list = document.getElementById('details-meta');
  list.innerHTML = '';
  meta.forEach(([icon, text]) => {
    const li = document.createElement('li');
    li.textContent = `${icon} ${text}`;
    list.appendChild(li);
  });

  const link = document.getElementById('details-link');
  if (talk.url) { link.href = talk.url; link.style.display = ''; } else { link.style.display = 'none'; }

  document.getElementById('details-btn-map').style.display =
    loc.venue === 'Salt Palace' ? '' : 'none';
  updateDetailsScheduleButton();

  if (!dialog.open) dialog.showModal();
}

function updateDetailsScheduleButton() {
  const btn = document.getElementById('details-btn-schedule');
  if (btn && detailsTalk) {
    btn.textContent = Schedule.hasTalk(detailsTalk.id) ? '✓ In My Schedule (remove)' : '+ Add to My Schedule';
  }
}

function updateCardScheduleButtonState(isSaved) {
  if (isSaved) {
    cardBtnSchedule.classList.add('saved');
    cardBtnSchedule.innerHTML = '<span style="font-size: 1.1rem; font-weight: bold;">✓</span>';
    cardBtnSchedule.setAttribute('aria-label', 'Remove from My Schedule');
  } else {
    cardBtnSchedule.classList.remove('saved');
    cardBtnSchedule.innerHTML = '<span class="plus-icon">+</span><span class="arrow-icon">↗</span>';
    cardBtnSchedule.setAttribute('aria-label', 'Add to My Schedule');
  }
}

// Render Off-Site Talks List View
function renderOffsiteTalks(filterSubvenue = '') {
  if (!offsiteTalksContainer) return;

  // Filter talks where venue != Salt Palace
  let talks = MOCK_TALKS.filter(t => t.location?.venue !== 'Salt Palace');

  if (filterSubvenue === 'Hyatt Regency') {
    talks = talks.filter(t => (t.location?.venue || '').includes('Hyatt'));
  } else if (filterSubvenue === 'Kimpton Monaco') {
    talks = talks.filter(t => (t.location?.venue || '').includes('Kimpton'));
  } else if (filterSubvenue === 'Le Méridien') {
    talks = talks.filter(t => (t.location?.venue || '').includes('Méridien'));
  } else if (filterSubvenue === 'Other') {
    talks = talks.filter(t => !['Hyatt', 'Kimpton', 'Méridien'].some(v => (t.location?.venue || '').includes(v)));
  }

  if (talks.length === 0) {
    offsiteTalksContainer.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: #94a3b8;">
        No off-site talks found for this selection.
      </div>
    `;
    return;
  }

  const savedIds = Schedule.getSavedIds();

  offsiteTalksContainer.innerHTML = talks.map(talk => {
    const isSaved = savedIds.includes(String(talk.id));
    const time = formatTime(talk.start, talk.end);
    const venueName = talk.location?.venue || 'Downtown Location';
    const roomName = talk.location?.room ? `· ${talk.location.room}` : '';
    const address = talk.location?.address || 'Salt Lake City, UT';

    return `
      <article class="offsite-card" data-id="${talk.id}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem;">
          <h3 class="offsite-card-title">${talk.title}</h3>
          <button
            class="circular-add-btn ${isSaved ? 'saved' : ''}"
            style="width: 36px; height: 36px; font-size: 0.85rem;"
            onclick="window.toggleOffsiteSchedule('${talk.id}')"
            aria-label="${isSaved ? 'Remove from schedule' : 'Add to schedule'}"
          >
            ${isSaved ? '✓' : '+ ↗'}
          </button>
        </div>

        <div class="offsite-card-location">
          <span>📍 <strong>${venueName}</strong> ${roomName}</span>
        </div>
        <div style="font-size: 0.75rem; color: #94a3b8;">${address}</div>

        <p class="offsite-card-desc">
          ${talk.abstract || 'Community session and workshop held at a downtown Salt Lake City partner venue.'}
        </p>

        <div class="offsite-card-meta">
          <span style="font-size: 0.78rem; font-weight: 600; color: #334155;">🕒 ${time}</span>
          <span class="chip-item" style="background: #fef3c7; color: #92400e; font-size: 0.7rem;">
            ⚠️ Unverified ADA
          </span>
        </div>
      </article>
    `;
  }).join('');
}

window.toggleOffsiteSchedule = function(talkId) {
  const talk = MOCK_TALKS.find(t => String(t.id) === String(talkId));
  if (talk) {
    const added = Schedule.toggleTalk(talk);
    renderOffsiteTalks();
    updateScheduleBadges();
    announce(added ? `Added ${talk.title} to schedule` : `Removed ${talk.title} from schedule`);
  }
};

// Perform Semantic Search and Update Dropdown
async function performSearch(queryText) {
  const res = await API.search({ q: queryText, ...currentFilters() });
  const talks = res.talks || [];

  // Same response drives the heatmap and level count
  lastResult = res;
  paintHeatmap(res.aggregations.rooms);
  updateLevelCount();

  dropdownResultsCount.textContent = `${talks.length} ${talks.length === 1 ? 'talk' : 'talks'}`;

  if (talks.length === 0) {
    dropdownTalksList.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: #94a3b8; font-size: 0.85rem;">
        No talks found matching "${queryText}"
      </div>
    `;
    return;
  }

  dropdownTalksList.innerHTML = talks.slice(0, 8).map(talk => {
    const time = formatTime(talk.start, talk.end);
    const venue = talk.location?.venue || 'Salt Palace';
    const room = talk.location?.room || '';
    const isSaved = Schedule.hasTalk(talk.id);

    return `
      <div class="dropdown-item" data-id="${talk.id}" role="button" tabindex="0">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
          <div class="dropdown-item-title">${talk.title}</div>
          ${isSaved ? '<span style="color: #ea580c; font-size: 0.75rem; font-weight: bold;">Saved</span>' : ''}
        </div>
        <div class="dropdown-item-meta">
          <span>🕒 ${time}</span>
          <span>📍 ${venue} ${room}</span>
          <span>🏷️ ${(talk.topics || [])[0] || 'KubeCon'}</span>
        </div>
      </div>
    `;
  }).join('');

  dropdownTalksList.querySelectorAll('.dropdown-item').forEach(item => {
    const select = () => {
      const id = item.getAttribute('data-id');
      const talk = talks.find(t => String(t.id) === String(id));
      if (talk) {
        searchDropdown.style.display = 'none';
        showTalkOnMap(talk); // go to its venue/level, highlight the room, fill the card
      }
    };
    item.addEventListener('click', select);
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select();
      }
    });
  });
}

// Schedule Drawer with Conflict Engine
function openScheduleDrawer() {
  scheduleDrawer.classList.add('open');
  drawerBackdrop.classList.add('open');
  scheduleDrawer.setAttribute('aria-hidden', 'false');
  renderScheduleDrawer();
}

function closeScheduleDrawer() {
  scheduleDrawer.classList.remove('open');
  drawerBackdrop.classList.remove('open');
  scheduleDrawer.setAttribute('aria-hidden', 'true');
}

function updateScheduleBadges() {
  const ids = Schedule.getSavedIds();
  topScheduleCount.textContent = ids.length;
  if (!dockScheduleBadge) return; // sidebar badge removed from the UI
  if (ids.length > 0) {
    dockScheduleBadge.textContent = ids.length;
    dockScheduleBadge.style.display = 'block';
  } else {
    dockScheduleBadge.style.display = 'none';
  }
}

function renderScheduleDrawer() {
  const savedIds = Schedule.getSavedIds();
  scheduleSummaryText.textContent = `${savedIds.length} ${savedIds.length === 1 ? 'session' : 'sessions'} saved`;

  if (savedIds.length === 0) {
    if (scheduleExportBar) scheduleExportBar.style.display = 'none';
    scheduleTalksList.innerHTML = `
      <div style="padding: 3rem 1rem; text-align: center; color: #94a3b8;">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">📅 Your schedule is empty</p>
        <p style="font-size: 0.85rem;">Search talks above and click "+ ↗" to add sessions.</p>
      </div>
    `;
    return;
  }

  if (scheduleExportBar) 
    scheduleExportBar.style.display = 'flex';
  const savedTalks = Schedule.getSavedTalks(MOCK_TALKS);
  const conflicts = Schedule.findConflicts(savedTalks);
  const conflictCount = Object.keys(conflicts).length;

  scheduleTalksList.innerHTML = `
    ${conflictCount > 0 ? `
      <div class="conflict-alert-box" style="margin-bottom: 0.75rem;">
        ⚠️ <strong>${conflictCount} Time Conflicts Detected!</strong> Overlapping sessions are highlighted in red below.
      </div>
    ` : ''}

    ${savedTalks.map(talk => {
      const hasConflict = Boolean(conflicts[talk.id]);
      const conflictingWith = conflicts[talk.id] || [];
      const time = formatTime(talk.start, talk.end);
      const gcalUrl = generateGoogleCalendarUrl(talk);

      return `
        <div class="dropdown-item" style="background: rgba(255, 255, 255, 0.05); border: 1px solid ${hasConflict ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}; padding: 1rem;">
          ${hasConflict ? `
            <div style="color: #fca5a5; font-size: 0.78rem; font-weight: bold; margin-bottom: 0.4rem;">
              ⚠️ Time Conflict: Overlaps with "${conflictingWith.map(c => c.title).join(', ')}"
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
            <strong style="color: #f8fafc; font-size: 0.95rem;">${talk.title}</strong>
            <button
              style="background: none; border: 1px solid #ef4444; color: #ef4444; border-radius: 6px; padding: 2px 7px; font-size: 0.72rem; cursor: pointer;"
              onclick="window.removeTalkFromDrawer('${talk.id}')"
            >
              Remove
            </button>
          </div>
          <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.4rem;">
            <span>🕒 ${time}</span> · <span>📍 ${talk.location?.venue || 'Salt Palace'} ${talk.location?.room || ''}</span>
          </div>
          <div class="schedule-card-actions">
            <span class="card-export-label">Export:</span>
            <a href="${gcalUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-cal btn-card-gcal" title="Add to Google Calendar">
              <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>+ Google Cal</span>
            </a>
            <button
              type="button"
              class="btn-card-cal btn-card-ical"
              onclick="window.exportTalkToIcs('${talk.id}')"
              title="Download Apple / iCal (.ics) for this session"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 1.01-2.85-.9.04-2.02.6-2.67 1.34-.56.64-1.06 1.7-1.01 2.74 1 .08 2.05-.48 2.67-1.23z"/>
              </svg>
              <span>+ Apple / iCal</span>
            </button>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function openGcalModal(talks) {
  if (!gcalExportModal || !gcalSessionsList) return;
  gcalSessionsList.innerHTML = talks.map(talk => {
    const time = formatTime(talk.start, talk.end);
    const gUrl = generateGoogleCalendarUrl(talk);
    return `
      <div class="gcal-session-row">
        <div style="flex: 1; min-width: 0;">
          <div style="color: #f8fafc; font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${talk.title}
          </div>
          <div style="color: #94a3b8; font-size: 0.73rem; margin-top: 2px;">
            🕒 ${time} · 📍 ${talk.location?.room_full || talk.location?.venue || 'Salt Palace'}
          </div>
        </div>
        <a href="${gUrl}" target="_blank" rel="noopener noreferrer" class="btn-cal-export btn-export-google" style="padding: 3px 9px; font-size: 0.72rem; flex: 0 0 auto; text-decoration: none;">
          Add ↗
        </a>
      </div>
    `;
  }).join('');
  gcalExportModal.style.display = 'flex';
  announce('Opened Google Calendar export dialog');
}

function closeGcalModal() {
  if (gcalExportModal) gcalExportModal.style.display = 'none';
}

window.exportTalkToIcs = function(talkId) {
  const talk = MOCK_TALKS.find(t => String(t.id) === String(talkId));
  if (talk) {
    downloadIcsFile([talk], `kubecon-session-${talk.id}.ics`);
    announce(`Downloaded calendar file for ${talk.title}`);
  }
};

window.exportTalkToGoogle = function(talkId) {
  const talk = MOCK_TALKS.find(t => String(t.id) === String(talkId));
  if (talk) {
    openGoogleCalendar(talk);
    announce(`Opening "${talk.title}" in Google Calendar`);
  }
};

window.removeTalkFromDrawer = function(talkId) {
  Schedule.removeTalk(talkId);
  updateScheduleBadges();
  renderScheduleDrawer();
  if (currentActiveTalk && String(currentActiveTalk.id) === String(talkId)) {
    updateCardScheduleButtonState(false);
  }
  if (currentView === 'offsite') {
    renderOffsiteTalks();
  }
};

document.addEventListener('DOMContentLoaded', init);
