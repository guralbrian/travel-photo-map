/* ═══════════════════════════════════════════════════════════════
   Region Navigation — Trip leg selector with itinerary panel
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ── Module state ── */
    var _map = null;
    var _allPhotos = null;
    var _tripSegments = null;
    var _sections = [];          // built RegionSection objects
    var _activeIndex = -1;       // currently selected region (-1 = none)

    // DOM refs
    var _gridEl = null;
    var _itineraryEl = null;
    var _feedEntries = null;
    var _toggleBtn = null;
    var _gridVisible = false;

    // External callbacks (set during init)
    var _rebuildPhotoLayer = null;
    var _buildSmartRoutes = null;
    var _photoWall = null;
    var _travelRouteLayerRef = { layer: null };
    var _filteredPhotosRef = null;      // { photos: [] } — shared reference
    var _savedMapBounds = null;

    /* ── Helpers ── */

    function formatDateLong(dateStr) {
        var d = new Date(dateStr + 'T12:00:00');
        var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();
    }

    function formatDateRange(startDate, endDate) {
        var s = new Date(startDate + 'T12:00:00');
        var e = new Date(endDate + 'T12:00:00');
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
            return months[s.getMonth()] + ' ' + s.getDate() + '\u2013' + e.getDate() + ', ' + s.getFullYear();
        }
        return months[s.getMonth()] + ' ' + s.getDate() + ' \u2013 ' +
               months[e.getMonth()] + ' ' + e.getDate() + ', ' + e.getFullYear();
    }

    /* ── Render the 2x4 region grid ── */

    function renderRegionGrid(container, sections) {
        container.innerHTML = '';
        var grid = document.createElement('div');
        grid.className = 'region-grid-inner';

        sections.forEach(function (section, idx) {
            var panel = document.createElement('button');
            panel.className = 'region-panel';
            panel.dataset.regionIndex = idx;
            panel.appendChild(domHelpers.el('span', {className: 'region-panel-label'}, section.label));
            panel.appendChild(domHelpers.el('span', {className: 'region-panel-dates'},
                domHelpers.formatDateShort(section.startDate) + '\u2013' + domHelpers.formatDateShort(section.endDate)));
            panel.addEventListener('click', function () {
                selectRegion(idx);
            });
            grid.appendChild(panel);
        });

        container.appendChild(grid);
    }

    /* ── T009: Grid toggle ── */

    function toggleGrid() {
        if (_activeIndex >= 0) {
            // If viewing itinerary, go back to grid
            deselectRegion();
            return;
        }
        _gridVisible = !_gridVisible;
        _gridEl.classList.toggle('hidden', !_gridVisible);
        _feedEntries.classList.toggle('hidden', _gridVisible);

        // On mobile, move grid to body for proper fixed positioning
        // (transform on feed sidebar breaks position:fixed)
        if (window.innerWidth <= 768) {
            if (_gridVisible) {
                document.body.appendChild(_gridEl);
                _gridEl.classList.add('region-grid--overlay');
                // Dismiss on backdrop tap (click outside region cards)
                _gridEl.addEventListener('click', _onOverlayBackdropClick);
            } else {
                _gridEl.classList.remove('region-grid--overlay');
                _gridEl.removeEventListener('click', _onOverlayBackdropClick);
                _feedEntries.parentNode.insertBefore(_gridEl, _feedEntries);
            }
        }
    }

    /* ── T010 + T011 + T012: Select a region ── */

    function selectRegion(index) {
        var section = _sections[index];
        if (!section) return;

        _activeIndex = index;
        if (window.appState) window.appState.set('activeRegionId', section.id);

        // Save current map bounds for restore
        _savedMapBounds = _map.getBounds();

        // Zoom map to region
        var zoomLevel = section.jsonRegions.length > 1 ? 7 : 10;
        _map.flyTo([section.center.lat, section.center.lng], zoomLevel, { duration: 0.8 });

        // Hide grid, show itinerary
        _gridEl.classList.add('hidden');
        _gridEl.classList.remove('region-grid--overlay');
        // Move grid back to sidebar if it was in body (mobile overlay)
        if (_gridEl.parentNode === document.body) {
            _feedEntries.parentNode.insertBefore(_gridEl, _feedEntries);
        }
        _itineraryEl.classList.remove('hidden');
        _feedEntries.classList.add('hidden');

        // Render itinerary panel content
        renderItineraryPanel(_itineraryEl, section);

        // Filter photos by date range
        var filtered = _allPhotos.filter(function (p) {
            return p.date >= section.startDate && p.date <= section.endDate;
        });
        _filteredPhotosRef.length = 0;
        filtered.forEach(function (p) { _filteredPhotosRef.push(p); });
        _rebuildPhotoLayer();

        // Update photo wall
        if (_photoWall && _photoWall.setPhotos) {
            _photoWall.setPhotos(filtered);
        }

        // Filter route lines
        var filteredSegs = _tripSegments.filter(function (seg) {
            return seg.start < section.endDate + 'T23:59:59' &&
                   seg.end > section.startDate + 'T00:00:00';
        });
        if (_travelRouteLayerRef.layer) {
            _map.removeLayer(_travelRouteLayerRef.layer);
        }
        var newRoutes = _buildSmartRoutes(filtered, filteredSegs, _map);
        if (newRoutes) {
            newRoutes.addTo(_map);
            _travelRouteLayerRef.layer = newRoutes;
        }

        // On mobile, switch to Trip Feed panel for itinerary viewing
        if (window.innerWidth <= 768) {
            document.dispatchEvent(new CustomEvent('panel:activate', {
                detail: { panel: 'trip-feed' }
            }));
        } else {
            // Desktop: just ensure feed sidebar is visible
            var feedSidebar = document.getElementById('feed-sidebar');
            if (feedSidebar) feedSidebar.classList.remove('hidden');
        }
    }

    /* ── T014 + T016: Render itinerary panel content ── */

    function renderItineraryPanel(container, section) {
        var _el = domHelpers.el;

        // Back button (SVG set via innerHTML — static markup, no user content)
        var backBtn = _el('button', {className: 'itinerary-back'});
        backBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>';
        backBtn.appendChild(document.createTextNode(' All Regions'));
        backBtn.addEventListener('click', function () { deselectRegion(); });

        // Days list
        var daysContainer = _el('div', {className: 'itinerary-days'});
        section.days.forEach(function (day) {
            var hasNotes = day.notes && day.notes.trim().length > 0;
            daysContainer.appendChild(_el('div', {className: 'itinerary-day'},
                _el('div', {className: 'itinerary-day-date'}, formatDateLong(day.date)),
                hasNotes
                    ? _el('div', {className: 'itinerary-day-notes'}, day.notes)
                    : _el('div', {className: 'itinerary-day-notes itinerary-day-notes--empty'}, 'No notes recorded')
            ));
        });

        container.textContent = '';
        container.appendChild(_el('div', {className: 'itinerary-header'},
            backBtn,
            _el('h3', {className: 'itinerary-title'}, section.label),
            _el('span', {className: 'itinerary-dates'}, formatDateRange(section.startDate, section.endDate))
        ));
        container.appendChild(daysContainer);
    }

    /* ── T017 + T018: Deselect region — restore overview ── */

    function deselectRegion() {
        _activeIndex = -1;
        if (window.appState) window.appState.set('activeRegionId', null);

        // Hide itinerary, show grid
        _itineraryEl.classList.add('hidden');
        _gridEl.classList.remove('hidden');
        _feedEntries.classList.add('hidden');
        _gridVisible = true;

        // Restore map bounds
        if (_savedMapBounds) {
            _map.flyToBounds(_savedMapBounds, { duration: 0.8 });
        }

        // Restore all photos
        _filteredPhotosRef.length = 0;
        _allPhotos.forEach(function (p) { _filteredPhotosRef.push(p); });
        _rebuildPhotoLayer();

        if (_photoWall && _photoWall.setPhotos) {
            _photoWall.setPhotos(_allPhotos);
        }

        // Restore all routes
        if (_travelRouteLayerRef.layer) {
            _map.removeLayer(_travelRouteLayerRef.layer);
        }
        var fullRoutes = _buildSmartRoutes(_allPhotos, _tripSegments, _map);
        if (fullRoutes) {
            fullRoutes.addTo(_map);
            _travelRouteLayerRef.layer = fullRoutes;
        }

        // On mobile, switch back to Photo Wall (default panel)
        if (window.innerWidth <= 768) {
            document.dispatchEvent(new CustomEvent('panel:activate', {
                detail: { panel: 'photo-wall' }
            }));
        }
    }

    /* ── Backdrop click: dismiss overlay when tapping outside region cards ── */
    function _onOverlayBackdropClick(e) {
        // Only dismiss if click target is the overlay itself (not a child)
        if (e.target === _gridEl || e.target.classList.contains('region-grid-inner')) {
            toggleGrid();
        }
    }

    /* ── T020: Graceful fallback for missing data ── */

    function renderFallbackGrid(container) {
        container.innerHTML = '';
        var grid = document.createElement('div');
        grid.className = 'region-grid-inner';

        window.TripModel.getRegions().forEach(function (cfg) {
            var panel = document.createElement('div');
            panel.className = 'region-panel region-panel--disabled';
            panel.appendChild(domHelpers.el('span', {className: 'region-panel-label'}, cfg.label));
            panel.appendChild(domHelpers.el('span', {className: 'region-panel-dates'}, 'No data'));
            grid.appendChild(panel);
        });

        container.appendChild(grid);
    }

    /* ── Public: Initialize ── */

    function initRegionNav(opts) {
        _map = opts.map;
        _allPhotos = opts.allPhotos.slice();
        _tripSegments = opts.tripSegments;
        _gridEl = opts.gridEl;
        _itineraryEl = opts.itineraryEl;
        _feedEntries = opts.feedEntries;
        _toggleBtn = opts.toggleBtn;
        _rebuildPhotoLayer = opts.rebuildPhotoLayer;
        _buildSmartRoutes = opts.buildSmartRoutes;
        _photoWall = opts.photoWall;
        _travelRouteLayerRef = opts.travelRouteLayerRef;
        _filteredPhotosRef = opts.filteredPhotos;

        // Read sections from shared model
        _sections = window.TripModel.getRegions();
        if (_sections.length && _sections[0].startDate) {
            renderRegionGrid(_gridEl, _sections);
        } else {
            console.warn('[region-nav] Itinerary data not available — showing fallback grid');
            renderFallbackGrid(_gridEl);
        }

        // Wire toggle button
        if (_toggleBtn) {
            _toggleBtn.addEventListener('click', toggleGrid);
        }

        // Close overlay on escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                if (_activeIndex >= 0) {
                    deselectRegion();
                } else if (_gridVisible) {
                    toggleGrid();
                }
            }
        });
    }

    /* ── Export ── */
    window.initRegionNav = initRegionNav;

})();
