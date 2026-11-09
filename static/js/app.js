import { API } from './api.js';
import { State } from './state.js';
import { Schedule } from './schedule.js';
import { MOCK_TALKS } from './mockData.js';
import { initK8sBackground } from './k8sBackground.js';

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

// Info Modal
const infoModal = document.getElementById('info-modal');
const btnCloseInfo = document.getElementById('btn-close-info');
const btnToggleContrast = document.getElementById('btn-toggle-contrast');
const btnToggleFont = document.getElementById('btn-toggle-font');
const a11yAnnouncements = document.getElementById('a11y-announcements');

let currentActiveTalk = null;
let searchDebounceTimeout = null;
let currentView = 'landing'; // 'landing' | 'map' | 'offsite'

function announce(msg) {
  if (a11yAnnouncements) a11yAnnouncements.textContent = msg;
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

function handleSvgRoomClick(roomId, level, zone) {
  if (!roomId) return;

  // 1. Special Sensory Sanctuary Retreat (260A/B)
  if (roomId === '260A/B' || roomId === '260') {
    displaySensoryRoomInfo(roomId, level, zone);
    announce(`Selected Quiet Sensory Room ${roomId}`);
    return;
  }

  // 2. Find matching talks in this room
  const matchingTalk = MOCK_TALKS.find(t => {
    const talkRoom = (t.location?.room || '').toLowerCase();
    const targetRoom = roomId.toLowerCase();
    return talkRoom.includes(targetRoom) || targetRoom.includes(talkRoom);
  });

  if (matchingTalk) {
    displayActiveTalk(matchingTalk);
    announce(`Selected Room ${roomId}: ${matchingTalk.title}`);
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
  window.addEventListener('load', syncActiveLevel, { once: true });

  if (floorplanObject.contentDocument?.querySelector('.level-group')) {
    syncActiveLevel();
  }
}

function setupEventListeners() {
  // 1. View Navigation
  cardSelectSaltPalace.addEventListener('click', () => switchView('map'));
  cardSelectOther.addEventListener('click', () => switchView('offsite'));

  btnBrandHome.addEventListener('click', () => switchView('landing'));
  navBtnHome.addEventListener('click', () => switchView('landing'));
  navBtnMap.addEventListener('click', () => switchView('map'));
  navBtnOffsite.addEventListener('click', () => switchView('offsite'));

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

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    searchDropdown.style.display = 'none';
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
      
      const counts = { 'Level 1': '299 TALKS', 'Level 2': '141 TALKS', 'Level 3': '24 TALKS' };
      currentTalkCount.textContent = counts[lvl] || '141 TALKS';
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
  navBtnSchedule.addEventListener('click', openScheduleDrawer);
  btnCloseSchedule.addEventListener('click', closeScheduleDrawer);
  btnDoneSchedule.addEventListener('click', closeScheduleDrawer);
  drawerBackdrop.addEventListener('click', closeScheduleDrawer);

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

  // 7. Info Modal
  navBtnInfo.addEventListener('click', () => {
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
  cardTalkDescription.textContent = talk.abstract || 'Join this session to connect with project maintainers and explore cutting-edge cloud native practices.';
  cardTime.textContent = formatTime(talk.start, talk.end);

  const isVerified = talk.accessibility?.wheelchair_accessible === true;
  cardA11yChip.innerHTML = `<span class="chip-icon">♿</span><span>${isVerified ? 'Verified Accessible' : 'Accessibility Unverified'}</span>`;
  cardA11yChip.className = `chip-item ${isVerified ? 'a11y-verified' : ''}`;

  cardAudience.textContent = talk.audience_level || 'All Levels';
  cardTopic.textContent = (talk.topics && talk.topics[0]) || (talk.topics_inferred && talk.topics_inferred[0]) || 'General Track';

  const isSaved = Schedule.hasTalk(talk.id);
  updateCardScheduleButtonState(isSaved);
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
  const res = await API.search({ q: queryText });
  const talks = res.talks || [];

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
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      const talk = talks.find(t => String(t.id) === String(id));
      if (talk) {
        if (talk.location?.venue === 'Salt Palace') {
          switchView('map');
          displayActiveTalk(talk);
        } else {
          switchView('offsite');
        }
        searchDropdown.style.display = 'none';
        announce(`Selected ${talk.title}`);
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
    scheduleTalksList.innerHTML = `
      <div style="padding: 3rem 1rem; text-align: center; color: #94a3b8;">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">📅 Your schedule is empty</p>
        <p style="font-size: 0.85rem;">Search talks above and click "+ ↗" to add sessions.</p>
      </div>
    `;
    return;
  }

  const savedTalks = savedIds.map(id => MOCK_TALKS.find(t => String(t.id) === String(id))).filter(Boolean);
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
        </div>
      `;
    }).join('')}
  `;
}

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
