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
    var _miniMap = null;
    var _allPhotos = [];
    var _tripSegments = [];
    var _regions = [];           // built region objects for cards
    var _onEnterMap = null;
    var _mainMap = null;
    var _introTimer = null;
    var _lastCardRect = null;    // for collapse animation

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
        var dateRange = formatDateRange(region.days);

        var summaryText = region.summary;
        if (!summaryText) {
            // Fallback: first day's notes
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

        _detailEl.textContent = '';
        _detailEl.appendChild(_el('div', {className: 'detail-header'},
            _el('h2', {className: 'detail-header__title'},
                region.label + ' ',
                _el('span', {className: 'detail-header__dates'}, '\u00B7 ' + dateRange)
            ),
            _el('div', {className: 'detail-header__actions'}, mapBtn, closeBtn)
        ));
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
                _el('div', null,
                    _el('h4', {className: 'detail-section-title'}, 'Location'),
                    _el('div', {className: 'detail-map-container', id: 'detail-mini-map'})
                ),
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
                for (var i = 0; i < imgs.length; i++) {
                    if (imgs[i] === img) { clickedIndex = i; break; }
                }
                if (window.photoViewer) {
                    window.photoViewer.open(photos, clickedIndex, img);
                }
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

        // Force reflow then animate
        _detailEl.offsetHeight;
        _detailEl.classList.add('landing-detail--visible');

        // Hide grid
        _gridWrap.style.opacity = '0';
        _gridWrap.style.pointerEvents = 'none';

        // Init mini map after animation
        setTimeout(function () {
            initMiniMap(region);
        }, 420);

        // Escape key
        document.addEventListener('keydown', onDetailEscape);
    }

    function closeDetail() {
        if (!_detailEl) return;

        // Destroy mini map
        if (_miniMap) {
            _miniMap.remove();
            _miniMap = null;
        }

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

    function initMiniMap(region) {
        var container = document.getElementById('detail-mini-map');
        if (!container || !L) return;

        _miniMap = L.map(container, {
            center: [region.center.lat, region.center.lng],
            zoom: region.jsonRegions.length > 1 ? 7 : 10,
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false,
            keyboard: false
        });

        L.tileLayer(TILE_URL, { attribution: TILE_ATTR }).addTo(_miniMap);
        L.circleMarker([region.center.lat, region.center.lng], {
            radius: 8,
            color: '#d4a853',
            fillColor: '#d4a853',
            fillOpacity: 0.8,
            weight: 2
        }).addTo(_miniMap);
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

    function enterMapFromDetail(regionIndex) {
        // Destroy mini map first
        if (_miniMap) {
            _miniMap.remove();
            _miniMap = null;
        }
        document.removeEventListener('keydown', onDetailEscape);

        // Hide detail immediately
        if (_detailEl) {
            _detailEl.classList.remove('landing-detail--visible', 'landing-detail--animating');
            _detailEl.style.display = 'none';
        }

        enterMap(regionIndex);
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
