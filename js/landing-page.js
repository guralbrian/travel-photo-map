/* ─── Landing Page Module ─── */
(function () {
    'use strict';

    /* ── Constants ── */
    var INTRO_DELAY = 3500;       // ms before auto-dismiss
    var MAX_THUMBNAILS = 30;
    var TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
    var TILE_ATTR = '&copy; OpenStreetMap contributors, &copy; CARTO';

    /* ── Module state ── */
    var _container = null;      // #landing-page
    var _introEl = null;
    var _gridWrap = null;
    var _detailEl = null;
    var _allPhotos = [];
    var _tripSegments = [];
    var _regions = [];           // built region objects for cards
    var _onEnterMap = null;
    var _mainMap = null;
    var _introTimer = null;
    var _lastCardRect = null;    // for collapse animation

    /* ── Detail map state ── */
    var _detailMap = null;       // pre-initialized Leaflet map instance
    var _detailSampler = null;   // ViewportSampler for detail map
    var _detailMapHolder = null; // hidden holder div
    var _regionBounds = null;    // L.latLngBounds for current region photos
    var _regionPhotos = [];      // current region's photo array
    var _currentRegionIndex = null;
    var _escalationDismissed = false;
    var _moveendHandler = null;  // for cleanup
    var _detailMapTimeout = null; // for cancelling stale region-switch timeouts
    var _gestureHintShown = false;

    /* ══════════════════════════════════════
       Helpers
       ══════════════════════════════════════ */

    function formatDateRange(days) {
        if (!days || !days.length) return '';
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var first = new Date(days[0].date + 'T12:00:00');
        var last = new Date(days[days.length - 1].date + 'T12:00:00');
        var s = months[first.getMonth()] + ' ' + first.getDate();
        var e = months[last.getMonth()] + ' ' + last.getDate();
        return s + ' \u2013 ' + e;
    }

    function formatDayDate(dateStr) {
        var d = new Date(dateStr + 'T12:00:00');
        var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();
    }

    function getPhotosForRegion(region) {
        if (!region.startDate || !region.endDate) return [];
        return _allPhotos.filter(function (p) {
            return p.date >= region.startDate && p.date <= region.endDate;
        });
    }

    function getSegmentColor(regionName) {
        for (var i = 0; i < _tripSegments.length; i++) {
            if (_tripSegments[i].name && _tripSegments[i].name.toLowerCase().indexOf(regionName.toLowerCase()) >= 0) {
                return _tripSegments[i].color;
            }
        }
        // Fallback: cycle through a palette
        var palette = ['#d4a853','#5b8c6e','#7a6cb5','#c75c5c','#5c8ac7','#c7895c','#5cc7b8','#c75c96'];
        return palette[Math.floor(Math.random() * palette.length)];
    }

    /* ══════════════════════════════════════
       Intro Screen
       ══════════════════════════════════════ */

    function dismissIntro() {
        if (!_introEl || _introEl.classList.contains('landing-intro--hidden')) return;
        clearTimeout(_introTimer);
        _introEl.classList.add('landing-intro--hidden');
        // Reveal the card grid behind the intro
        if (_gridWrap) _gridWrap.classList.add('landing-grid-wrap--visible');
        // Remove event listeners
        document.removeEventListener('click', onIntroInteraction, true);
        document.removeEventListener('keydown', onIntroInteraction, true);
        document.removeEventListener('wheel', onIntroInteraction, true);
        document.removeEventListener('touchstart', onIntroInteraction, true);
    }

    function onIntroInteraction(e) {
        // Don't dismiss if clicking inside detail or explore button
        if (e.target && e.target.closest && e.target.closest('.landing-detail')) return;
        dismissIntro();
    }

    function setupIntro() {
        _introEl = _container.querySelector('.landing-intro');
        if (!_introEl) return;

        // Auto-dismiss timer
        _introTimer = setTimeout(dismissIntro, INTRO_DELAY);

        // Skip on interaction
        document.addEventListener('click', onIntroInteraction, true);
        document.addEventListener('keydown', onIntroInteraction, true);
        document.addEventListener('wheel', onIntroInteraction, true);
        document.addEventListener('touchstart', onIntroInteraction, true);

        // Pre-initialize detail map during intro animation (FR-009a)
        initDetailMapBackground();
    }

    /* ══════════════════════════════════════
       Card Grid
       ══════════════════════════════════════ */

    function renderCardGrid() {
        _gridWrap = _container.querySelector('.landing-grid-wrap');
        var grid = _gridWrap.querySelector('.landing-grid');
        grid.innerHTML = '';

        _regions.forEach(function (region, index) {
            var card = document.createElement('div');
            card.className = 'landing-card';

            // Hero photo or color fallback
            if (region.heroPhoto) {
                card.style.backgroundImage = 'url(' + region.heroPhoto + ')';
            } else {
                var color = getSegmentColor(region.jsonRegions[0]);
                card.style.background = 'linear-gradient(135deg, ' + color + ' 0%, rgba(24,24,28,0.9) 100%)';
            }

            card.appendChild(domHelpers.el('div', {className: 'landing-card__content'},
                domHelpers.el('h3', {className: 'landing-card__name'}, region.label),
                domHelpers.el('span', {className: 'landing-card__dates'}, formatDateRange(region.days))
            ));

            card.addEventListener('click', function () {
                openDetail(index, card);
            });

            grid.appendChild(card);
        });
    }

    /* ══════════════════════════════════════
       Detail View
       ══════════════════════════════════════ */

    function openDetail(index, cardEl) {
        var region = _regions[index];
        if (!region) return;

        _currentRegionIndex = index;
        _escalationDismissed = false;
        _escalationShown = false;

        // Create detail element if not exists
        if (!_detailEl) {
            _detailEl = document.createElement('div');
            _detailEl.className = 'landing-detail';
            _container.appendChild(_detailEl);
        }

        // Remember card rect for collapse
        _lastCardRect = cardEl.getBoundingClientRect();

        // Build content
        var photos = getPhotosForRegion(region);
        _regionPhotos = photos;
        var dateRange = formatDateRange(region.days);

        var summaryText = region.summary;
        if (!summaryText) {
            for (var i = 0; i < region.days.length; i++) {
                if (region.days[i].notes) {
                    summaryText = region.days[i].notes;
                    break;
                }
            }
        }
        if (!summaryText) summaryText = 'Details coming soon.';

        var _el = domHelpers.el;

        // Places list
        var placesList = _el('ul', {className: 'detail-places'});
        region.days.forEach(function (day) {
            if (!day.notes) return;
            placesList.appendChild(_el('li', {className: 'detail-places__item'},
                _el('span', {className: 'detail-places__date'}, formatDayDate(day.date)),
                _el('span', {className: 'detail-places__notes'}, day.notes)
            ));
        });

        // Photo grid
        var displayed = Math.min(photos.length, MAX_THUMBNAILS);
        var photoSection;
        if (photos.length === 0) {
            photoSection = _el('p', {className: 'detail-photos-empty'}, 'No photos yet');
        } else {
            var photoGrid = _el('div', {className: 'detail-photos-grid'});
            for (var p = 0; p < displayed; p++) {
                if (photos[p].type === 'video') {
                    photoGrid.appendChild(_el('div', {style: 'position:relative;display:inline-block'},
                        _el('img', {src: photos[p].thumbnail, alt: '', loading: 'lazy'}),
                        _el('div', {style: 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.2);pointer-events:none'},
                            _el('span', {style: 'color:rgba(255,255,255,0.9);font-size:24px;text-shadow:0 1px 4px rgba(0,0,0,0.6)'}, '\u25B6')
                        )
                    ));
                } else {
                    photoGrid.appendChild(_el('img', {src: photos[p].thumbnail, alt: '', loading: 'lazy'}));
                }
            }
            photoSection = photoGrid;
        }

        // "View on map" handler
        function onViewOnMap() { enterMapFromDetail(index); }

        // Build detail tree
        var closeBtn = _el('button', {className: 'detail-close-btn'}, 'Back');
        closeBtn.addEventListener('click', closeDetail);

        var mapBtn = _el('button', {className: 'detail-map-btn'}, 'View on map');
        mapBtn.addEventListener('click', onViewOnMap);

        var photosContainer = _el('div', null,
            _el('h4', {className: 'detail-section-title'}, 'Photos (' + photos.length + ')'),
            photoSection
        );
        if (photos.length > MAX_THUMBNAILS) {
            var moreBtn = _el('button', {className: 'detail-photos-more'}, 'View on map');
            moreBtn.addEventListener('click', onViewOnMap);
            photosContainer.appendChild(moreBtn);
        }

        // Interactive map section with gesture overlay and escalation prompt
        var gestureOverlay = _el('div', {className: 'map-gesture-overlay'}, 'Use two fingers to move the map');
        var escalationAcceptBtn = _el('button', {className: 'map-escalation-prompt__accept'}, 'Explore full map');
        var escalationDismissBtn = _el('button', {className: 'map-escalation-prompt__dismiss'}, 'Dismiss');
        var escalationPrompt = _el('div', {className: 'map-escalation-prompt'},
            _el('span', {className: 'map-escalation-prompt__text'}, 'Explore the full map?'),
            escalationAcceptBtn,
            escalationDismissBtn
        );
        var mapSection = _el('div', {className: 'detail-map-section'},
            gestureOverlay,
            escalationPrompt
        );

        // Wire escalation buttons
        escalationAcceptBtn.addEventListener('click', function () {
            enterMapFromDetail(_currentRegionIndex, true);
        });
        escalationDismissBtn.addEventListener('click', function () {
            _escalationDismissed = true;
            _escalationShown = false;
            escalationPrompt.classList.remove('map-escalation-prompt--visible');
        });

        _detailEl.textContent = '';
        _detailEl.appendChild(_el('div', {className: 'detail-header'},
            _el('h2', {className: 'detail-header__title'},
                region.label + ' ',
                _el('span', {className: 'detail-header__dates'}, '\u00B7 ' + dateRange)
            ),
            _el('div', {className: 'detail-header__actions'}, mapBtn, closeBtn)
        ));
        _detailEl.appendChild(mapSection);
        _detailEl.appendChild(_el('div', {className: 'detail-body'},
            _el('div', {className: 'detail-body__left'},
                _el('div', null,
                    _el('h4', {className: 'detail-section-title'}, 'Summary'),
                    _el('p', {className: 'detail-summary'}, summaryText)
                ),
                _el('div', null,
                    _el('h4', {className: 'detail-section-title'}, 'Places & Dates'),
                    placesList
                )
            ),
            _el('div', {className: 'detail-body__right'},
                photosContainer
            )
        ));

        // Wire photo thumbnail clicks → open photo viewer
        var photoGrid = _detailEl.querySelector('.detail-photos-grid');
        if (photoGrid && photos.length > 0) {
            photoGrid.addEventListener('click', function (e) {
                var img = e.target;
                if (img.tagName !== 'IMG') return;
                var imgs = photoGrid.querySelectorAll('img');
                var clickedIndex = 0;
                for (var ci = 0; ci < imgs.length; ci++) {
                    if (imgs[ci] === img) { clickedIndex = ci; break; }
                }
                if (window.photoViewer) {
                    window.photoViewer.open(photos, clickedIndex, img);
                }
            });
        }

        // Wire escalation prompt
        var escalationAccept = _detailEl.querySelector('.map-escalation-prompt__accept');
        var escalationDismiss = _detailEl.querySelector('.map-escalation-prompt__dismiss');
        if (escalationAccept) {
            escalationAccept.addEventListener('click', function () {
                enterMapFromDetail(_currentRegionIndex, true);
            });
        }
        if (escalationDismiss) {
            escalationDismiss.addEventListener('click', function () {
                _escalationDismissed = true;
                _escalationShown = false;
                var prompt = _detailEl.querySelector('.map-escalation-prompt');
                if (prompt) prompt.classList.remove('map-escalation-prompt--visible');
            });
        }

        // Animate in from card position
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var sx = _lastCardRect.width / vw;
        var sy = _lastCardRect.height / vh;
        var tx = _lastCardRect.left;
        var ty = _lastCardRect.top;

        _detailEl.style.display = 'block';
        _detailEl.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + sx + ', ' + sy + ')';
        _detailEl.classList.add('landing-detail--animating');

        _detailEl.offsetHeight;
        _detailEl.classList.add('landing-detail--visible');

        // Hide grid
        _gridWrap.style.opacity = '0';
        _gridWrap.style.pointerEvents = 'none';

        // Wire interactive detail map after animation (cancel any stale pending call)
        if (_detailMapTimeout) clearTimeout(_detailMapTimeout);
        _detailMapTimeout = setTimeout(function () {
            _detailMapTimeout = null;
            showDetailMap(region, photos);
        }, 420);

        // Escape key
        document.addEventListener('keydown', onDetailEscape);
    }

    function closeDetail() {
        if (!_detailEl) return;

        // Cancel any pending region-switch timeout
        if (_detailMapTimeout) { clearTimeout(_detailMapTimeout); _detailMapTimeout = null; }

        // Detach detail map
        hideDetailMap();

        document.removeEventListener('keydown', onDetailEscape);

        if (_lastCardRect) {
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var sx = _lastCardRect.width / vw;
            var sy = _lastCardRect.height / vh;
            var tx = _lastCardRect.left;
            var ty = _lastCardRect.top;

            _detailEl.classList.remove('landing-detail--visible');
            _detailEl.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + sx + ', ' + sy + ')';

            var el = _detailEl;
            setTimeout(function () {
                el.classList.remove('landing-detail--animating');
                el.style.display = 'none';
                el.style.transform = '';
            }, 420);
        } else {
            _detailEl.classList.remove('landing-detail--visible', 'landing-detail--animating');
            _detailEl.style.display = 'none';
        }

        // Show grid
        _gridWrap.style.opacity = '';
        _gridWrap.style.pointerEvents = '';
    }

    function onDetailEscape(e) {
        if (e.key === 'Escape') closeDetail();
    }

    /* ══════════════════════════════════════
       Interactive Detail Map (FR-009)
       ══════════════════════════════════════ */

    function initDetailMapBackground() {
        if (_detailMap) return; // already initialized
        if (typeof L === 'undefined' || typeof ViewportSampler === 'undefined') return;

        // Create hidden holder
        _detailMapHolder = document.createElement('div');
        _detailMapHolder.id = 'detail-map-holder';
        _detailMapHolder.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;overflow:hidden;';
        _container.appendChild(_detailMapHolder);

        var isMobile = window.innerWidth <= 768;
        _detailMap = L.map(_detailMapHolder, {
            zoomControl: false,
            attributionControl: false,
            dragging: !isMobile,
            scrollWheelZoom: !isMobile,
            touchZoom: true,
            doubleClickZoom: true,
            keyboard: false
        });

        // Set an initial view so Leaflet is ready (will be overridden on card open)
        _detailMap.setView([50, 10], 5);
        L.tileLayer(TILE_URL, { attribution: TILE_ATTR }).addTo(_detailMap);

        // Create ViewportSampler instance for detail map
        _detailSampler = new ViewportSampler();
        _detailSampler.init(_detailMap, [], {
            onClick: onDetailPhotoClick
        });
    }

    function onDetailPhotoClick(e) {
        var marker = e.layer;
        if (!marker || !marker.photo) return;
        var photo = marker.photo;
        // Use reference equality — marker.photo is a direct reference to the object in _regionPhotos
        var idx = _regionPhotos.indexOf(photo);
        if (idx < 0) return; // guard: don't open wrong photo if arrays are out of sync
        var srcEl = marker._icon ? marker._icon.querySelector('img') : null;
        if (window.photoViewer) {
            window.photoViewer.open(_regionPhotos, idx, srcEl);
        }
    }

    function showDetailMap(region, photos) {
        if (!_detailMap || !_detailEl) return;

        // Re-sync in case _regionPhotos was overwritten by a rapid region switch
        _regionPhotos = photos;

        var mapSection = _detailEl.querySelector('.detail-map-section');
        if (!mapSection) return;

        // Move map holder into the detail map section
        mapSection.insertBefore(_detailMapHolder, mapSection.firstChild);
        _detailMapHolder.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;';

        // Recalculate map size
        _detailMap.invalidateSize();

        // Compute region photo bounds and fit
        if (photos.length > 0) {
            var latLngs = [];
            for (var i = 0; i < photos.length; i++) {
                if (photos[i].lat && photos[i].lng) {
                    latLngs.push([photos[i].lat, photos[i].lng]);
                }
            }
            if (latLngs.length > 0) {
                _regionBounds = L.latLngBounds(latLngs);
                _detailMap.fitBounds(_regionBounds, { padding: [30, 30] });
            } else {
                _regionBounds = null;
                _detailMap.setView([region.center.lat, region.center.lng], 10);
            }
        } else {
            _regionBounds = null;
            _detailMap.setView([region.center.lat, region.center.lng], 10);
        }

        // Load photos into sampler
        _detailSampler.setPhotos(photos);
        _detailSampler.update();

        // Wire moveend for sampler updates and escalation check
        _moveendHandler = function () {
            _detailSampler.update();
            checkBoundsEscalation();
        };
        _detailMap.on('moveend', _moveendHandler);

        // Setup mobile two-finger gesture handler
        setupGestureHandler(mapSection);
    }

    function hideDetailMap() {
        if (!_detailMap) return;

        // Remove moveend listener
        if (_moveendHandler) {
            _detailMap.off('moveend', _moveendHandler);
            _moveendHandler = null;
        }

        // Clear sampler
        _detailSampler.setPhotos([]);

        // Move holder back to hidden position
        if (_detailMapHolder && _container) {
            _container.appendChild(_detailMapHolder);
            _detailMapHolder.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;overflow:hidden;';
        }

        _regionBounds = null;
        _regionPhotos = [];
        _currentRegionIndex = null;

        // Hide escalation prompt
        if (_detailEl) {
            var prompt = _detailEl.querySelector('.map-escalation-prompt');
            if (prompt) prompt.classList.remove('map-escalation-prompt--visible');
        }
    }

    /* ── Bounds overlap escalation (FR-009e) ── */

    function boundsOverlapRatio(viewBounds, regionBounds) {
        if (!viewBounds || !regionBounds) return 1;
        if (!viewBounds.intersects(regionBounds)) return 0;

        var vSW = viewBounds.getSouthWest();
        var vNE = viewBounds.getNorthEast();
        var rSW = regionBounds.getSouthWest();
        var rNE = regionBounds.getNorthEast();

        // Compute intersection
        var iSWlat = Math.max(vSW.lat, rSW.lat);
        var iSWlng = Math.max(vSW.lng, rSW.lng);
        var iNElat = Math.min(vNE.lat, rNE.lat);
        var iNElng = Math.min(vNE.lng, rNE.lng);

        if (iSWlat >= iNElat || iSWlng >= iNElng) return 0;

        var intArea = (iNElat - iSWlat) * (iNElng - iSWlng);
        var viewArea = (vNE.lat - vSW.lat) * (vNE.lng - vSW.lng);

        return viewArea > 0 ? intArea / viewArea : 1;
    }

    var _escalationShown = false; // tracks if prompt is currently shown

    function checkBoundsEscalation() {
        if (!_detailMap || !_regionBounds || !_detailEl) return;

        var overlap = boundsOverlapRatio(_detailMap.getBounds(), _regionBounds);
        var prompt = _detailEl.querySelector('.map-escalation-prompt');
        if (!prompt) return;

        if (overlap < 0.2 && !_escalationDismissed && !_escalationShown) {
            // Show prompt and keep it visible
            prompt.classList.add('map-escalation-prompt--visible');
            _escalationShown = true;
        } else if (_escalationShown && overlap >= 0.5) {
            // Only auto-hide when user has returned well within region bounds
            prompt.classList.remove('map-escalation-prompt--visible');
            _escalationShown = false;
            _escalationDismissed = false;
        }
    }

    /* ── Two-finger gesture handler (FR-009d) ── */

    function setupGestureHandler(mapSection) {
        var isMobile = window.innerWidth <= 768;
        if (!isMobile) return;

        var overlay = mapSection.querySelector('.map-gesture-overlay');
        var mapContainer = _detailMap.getContainer();
        var pointers = {};
        var lastCentroid = null;

        // Set touch-action so single-finger scrolls the detail view
        mapContainer.style.touchAction = 'pan-y';

        function getPointerArray() {
            var arr = [];
            var keys = Object.keys(pointers);
            for (var i = 0; i < keys.length; i++) arr.push(pointers[keys[i]]);
            return arr;
        }

        function getCentroid(pts) {
            var x = 0, y = 0;
            for (var i = 0; i < pts.length; i++) {
                x += pts[i].clientX;
                y += pts[i].clientY;
            }
            return { x: x / pts.length, y: y / pts.length };
        }

        mapContainer.addEventListener('pointerdown', function (e) {
            pointers[e.pointerId] = { clientX: e.clientX, clientY: e.clientY };
            var pts = getPointerArray();
            if (pts.length >= 2) {
                lastCentroid = getCentroid(pts);
                // Hide gesture overlay when two fingers detected
                if (overlay) {
                    overlay.classList.remove('map-gesture-overlay--visible');
                    overlay.classList.add('map-gesture-overlay--fading');
                }
            }
        });

        mapContainer.addEventListener('pointermove', function (e) {
            if (!pointers[e.pointerId]) return;
            pointers[e.pointerId] = { clientX: e.clientX, clientY: e.clientY };
            var pts = getPointerArray();
            if (pts.length >= 2 && lastCentroid) {
                var centroid = getCentroid(pts);
                var dx = centroid.x - lastCentroid.x;
                var dy = centroid.y - lastCentroid.y;
                _detailMap.panBy([-(dx), -(dy)], { animate: false });
                lastCentroid = centroid;
            }
        });

        function onPointerEnd(e) {
            delete pointers[e.pointerId];
            if (getPointerArray().length < 2) {
                lastCentroid = null;
            }
        }

        mapContainer.addEventListener('pointerup', onPointerEnd);
        mapContainer.addEventListener('pointercancel', onPointerEnd);

        // Show gesture hint on first single-finger touch
        if (!_gestureHintShown && !sessionStorage.getItem('mapGestureHintShown')) {
            mapContainer.addEventListener('touchstart', function onFirstTouch(e) {
                if (e.touches.length === 1 && overlay) {
                    _gestureHintShown = true;
                    sessionStorage.setItem('mapGestureHintShown', '1');
                    overlay.classList.add('map-gesture-overlay--visible');
                    overlay.classList.remove('map-gesture-overlay--fading');
                    setTimeout(function () {
                        overlay.classList.add('map-gesture-overlay--fading');
                        setTimeout(function () {
                            overlay.classList.remove('map-gesture-overlay--visible', 'map-gesture-overlay--fading');
                        }, 300);
                    }, 2000);
                }
                mapContainer.removeEventListener('touchstart', onFirstTouch);
            });
        }
    }

    /* ══════════════════════════════════════
       Enter Map Transitions
       ══════════════════════════════════════ */

    function enterMap(regionIndex) {
        var regionData = typeof regionIndex === 'number' ? _regions[regionIndex] : null;

        _container.classList.add('landing--hidden');

        // After fade, fully hide
        setTimeout(function () {
            _container.style.display = 'none';
        }, 450);

        if (_onEnterMap) {
            _onEnterMap({ region: regionData, regionIndex: regionIndex });
        }
    }

    function enterMapFromDetail(regionIndex, useDetailViewport) {
        var viewportData = null;
        if (useDetailViewport && _detailMap) {
            viewportData = {
                center: _detailMap.getCenter(),
                zoom: _detailMap.getZoom()
            };
        }

        // Detach detail map
        hideDetailMap();
        document.removeEventListener('keydown', onDetailEscape);

        // Hide detail immediately
        if (_detailEl) {
            _detailEl.classList.remove('landing-detail--visible', 'landing-detail--animating');
            _detailEl.style.display = 'none';
        }

        // Pass viewport data to enterMap
        var regionData = typeof regionIndex === 'number' ? _regions[regionIndex] : null;

        _container.classList.add('landing--hidden');
        setTimeout(function () {
            _container.style.display = 'none';
        }, 450);

        if (_onEnterMap) {
            _onEnterMap({
                region: regionData,
                regionIndex: regionIndex,
                viewport: viewportData
            });
        }
    }

    /* ══════════════════════════════════════
       Init
       ══════════════════════════════════════ */

    function initLandingPage(opts) {
        _container = document.getElementById('landing-page');
        if (!_container) return;

        _allPhotos = opts.allPhotos || [];
        _tripSegments = opts.tripSegments || [];
        _onEnterMap = opts.onEnterMap || null;
        _mainMap = opts.map || null;

        // Read region data from shared model
        _regions = window.TripModel.getRegions();

        // Grab grid wrap ref early (before intro can dismiss)
        _gridWrap = _container.querySelector('.landing-grid-wrap');

        // Setup intro
        setupIntro();

        // Render card grid
        renderCardGrid();

        // Wire explore button
        var exploreBtn = _container.querySelector('.landing-explore-btn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                enterMap(null);
            });
        }
    }

    function reopenLanding() {
        if (!_container) return;
        _container.style.display = '';
        _container.classList.remove('landing--hidden');
        // Close any open detail
        closeDetail();
        // Show grid
        if (_gridWrap) {
            _gridWrap.style.opacity = '';
            _gridWrap.style.pointerEvents = '';
            _gridWrap.classList.add('landing-grid-wrap--visible');
        }
        if (window.viewNav) window.viewNav.setView('landing');
    }

    /* ── Export ── */
    window.initLandingPage = initLandingPage;
    window.reopenLanding = reopenLanding;

})();
