(function () {
    'use strict';

    // Module state (initialized via init)
    var _map = null;
    var _baseLayers = null;
    var _currentBaseLayer = null;
    var _travelRouteLayer = null;
    var _uniqueDates = null;
    var _timelineSegments = null;
    var _boundaryMarkers = null;
    var _allPhotos = null;
    var _feedSidebar = null;
    var _feedToggle = null;
    var _formatDateShort = null;
    var _setCloudFavoritesLoaded = null;
    var _rebuildPhotoLayer = null;
    var _buildPhotoIndex = null;
    var _onDensityChange = null;
    var _onSizeChange = null;
    var currentDensityCellSize = 150;
    var currentIconSize = 90;

    function init(opts) {
        _map = opts.map;
        _baseLayers = opts.baseLayers;
        _currentBaseLayer = opts.currentBaseLayer;
        _travelRouteLayer = opts.travelRouteLayer;
        _uniqueDates = opts.uniqueDates;
        _timelineSegments = opts.timelineSegments;
        _boundaryMarkers = opts.boundaryMarkers;
        _allPhotos = opts.allPhotos;
        _feedSidebar = opts.feedSidebar;
        _feedToggle = opts.feedToggle;
        _formatDateShort = opts.formatDateShort;
        _setCloudFavoritesLoaded = opts.setCloudFavoritesLoaded;
        _rebuildPhotoLayer = opts.rebuildPhotoLayer;
        _buildPhotoIndex = opts.buildPhotoIndex;
        _onDensityChange = opts.onDensityChange;
        _onSizeChange = opts.onSizeChange;
        currentDensityCellSize = opts.initialDensityCellSize || 150;
        currentIconSize = opts.initialIconSize || 90;

        buildControlPanel();

        // Expose public methods
        window.controlPanel.updatePhotoCount = updatePhotoCount;
        window.controlPanel.updatePendingIndicator = _updatePendingIndicator;
    }

    function buildControlPanel() {
        var totalDates = _uniqueDates.length || 1;

        // Build timeline track segments HTML
        var segmentsHtml = '';
        for (var s = 0; s < _timelineSegments.length; s++) {
            var seg = _timelineSegments[s];
            var leftPct = (seg.startIdx / totalDates * 100).toFixed(2);
            var widthPct = (seg.count / totalDates * 100).toFixed(2);
            var showInline = parseFloat(widthPct) >= 12 || s === 0 || s === _timelineSegments.length - 1;
            var labelPos = (s % 2 === 0) ? 'label-top' : 'label-bottom';
            segmentsHtml += '<div class="timeline-segment ' + labelPos + '" data-city="' + seg.cityName + '" style="--seg-offset:' + leftPct + '%;--seg-size:' + widthPct + '%;background:' + seg.color + '">' +
                '<span class="segment-dot"></span>' +
                (showInline ? '<span class="segment-label-inline">' + seg.cityName + '</span>' : '') +
                '<span class="segment-tooltip">' + seg.cityName + '</span></div>';
        }

        // Build boundary markers HTML
        var boundaryHtml = '';
        for (var bm = 0; bm < _boundaryMarkers.length; bm++) {
            var marker = _boundaryMarkers[bm];
            var pos = (marker.index / totalDates * 100).toFixed(2);
            if (marker.type === 'month') {
                boundaryHtml += '<div class="timeline-boundary timeline-boundary-month" style="--boundary-pos:' + pos + '%"><span class="boundary-label">' + marker.label + '</span></div>';
            } else {
                boundaryHtml += '<div class="timeline-boundary timeline-boundary-week" style="--boundary-pos:' + pos + '%"></div>';
            }
        }

        var maxIdx = _uniqueDates.length > 0 ? _uniqueDates.length - 1 : 0;
        var startLabel = _uniqueDates.length > 0 ? _formatDateShort(_uniqueDates[0]) : '';
        var endLabel = _uniqueDates.length > 0 ? _formatDateShort(_uniqueDates[maxIdx]) : '';

        // Build layer radio buttons HTML
        var layerNames = Object.keys(_baseLayers);
        var layerHtml = '<div class="layer-group-title">Base Map</div>';
        for (var li = 0; li < layerNames.length; li++) {
            var checked = layerNames[li] === 'Humanitarian' ? ' checked' : '';
            layerHtml += '<label class="layer-option"><input type="radio" name="base-layer" value="' + layerNames[li] + '"' + checked + '> ' + layerNames[li] + '</label>';
        }
        layerHtml += '<hr class="layer-separator">';
        layerHtml += '<div class="layer-group-title">Overlays</div>';
        layerHtml += '<label class="layer-option"><input type="checkbox" id="travel-route-toggle" checked> Travel Route</label>';

        // Toggle button
        var toggleBtn = document.createElement('button');
        toggleBtn.className = 'panel-toggle';
        toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>';
        document.body.appendChild(toggleBtn);

        // Panel
        var panel = document.createElement('div');
        panel.className = 'control-panel hidden';
        panel.innerHTML =
            '<div class="panel-header"><h3>Controls</h3><button class="panel-close">&times;</button></div>' +
            '<div class="auth-section" id="auth-section">' +
                '<button class="auth-sign-in-btn" id="auth-sign-in-btn">Sign in with Google</button>' +
                '<div class="auth-user-info" id="auth-user-info" style="display:none">' +
                    '<img class="auth-avatar" id="auth-avatar" src="" alt="">' +
                    '<span class="auth-name" id="auth-name"></span>' +
                    '<a href="#" class="auth-sign-out" id="auth-sign-out">Sign out</a>' +
                '</div>' +
                '<span class="pending-writes-indicator" id="pending-writes-indicator" style="display:none" title="Changes pending sync">&#9729;</span>' +
            '</div>' +
            '<details class="panel-section" open>' +
                '<summary>Timeline</summary>' +
                '<div class="panel-section-content">' +
                    '<div class="timeline-bar">' +
                        '<div class="timeline-track">' + segmentsHtml + boundaryHtml + '<div class="timeline-range-fill" style="--range-start:0%;--range-size:100%"></div></div>' +
                        '<input type="range" class="timeline-handle timeline-handle-min" min="0" max="' + maxIdx + '" value="0">' +
                        '<input type="range" class="timeline-handle timeline-handle-max" min="0" max="' + maxIdx + '" value="' + maxIdx + '">' +
                        '<div class="timeline-date-display">' +
                            '<span class="timeline-date-start">' + startLabel + '</span>' +
                            '<span class="timeline-date-end">' + endLabel + '</span>' +
                        '</div>' +
                        '<div class="timeline-photo-count"><span class="photo-count-number">' + _allPhotos.length + '</span> / ' + _allPhotos.length + ' photos</div>' +
                    '</div>' +
                '</div>' +
            '</details>' +
            '<details class="panel-section">' +
                '<summary>Map Layers</summary>' +
                '<div class="panel-section-content">' + layerHtml + '</div>' +
            '</details>' +
            '<details class="panel-section">' +
                '<summary>Settings</summary>' +
                '<div class="panel-section-content">' +
                    '<label>Photo Density <span class="slider-value" id="density-val"></span></label>' +
                    '<input type="range" id="density-slider" min="80" max="300" value="' + currentDensityCellSize + '" style="direction:rtl">' +
                    '<label>Photo Size <span class="slider-value" id="size-val">' + currentIconSize + 'px</span></label>' +
                    '<input type="range" id="size-slider" min="45" max="180" value="' + currentIconSize + '">' +
                '</div>' +
            '</details>';
        document.body.appendChild(panel);

        // Prevent map interaction when interacting with panel
        L.DomEvent.disableClickPropagation(panel);
        L.DomEvent.disableScrollPropagation(panel);
        L.DomEvent.disableClickPropagation(toggleBtn);

        // Toggle open/close
        function togglePanel() {
            var isHidden = panel.classList.toggle('hidden');
            toggleBtn.classList.toggle('open', !isHidden);
            toggleBtn.style.display = isHidden ? '' : 'none';
            // On medium viewports, auto-collapse feed when control panel opens
            if (!isHidden && window.innerWidth >= 769 && window.innerWidth < 1280) {
                if (!_feedSidebar.classList.contains('hidden')) {
                    _feedSidebar.classList.add('hidden');
                    _feedToggle.style.display = '';
                }
            }
        }
        toggleBtn.addEventListener('click', togglePanel);
        panel.querySelector('.panel-close').addEventListener('click', togglePanel);

        // Wire base layer switching via appState
        var radios = panel.querySelectorAll('input[name="base-layer"]');
        for (var r = 0; r < radios.length; r++) {
            radios[r].addEventListener('change', function () {
                if (window.appState) {
                    window.appState.set('baseLayer', this.value);
                } else {
                    _map.removeLayer(_currentBaseLayer);
                    _currentBaseLayer = _baseLayers[this.value];
                    _currentBaseLayer.addTo(_map);
                }
            });
        }

        // React to baseLayer changes from any source (radio buttons, URL hash, etc.)
        if (window.appState) {
            window.appState.onChange('baseLayer', function (newLayer) {
                // Swap map tile layer
                if (_currentBaseLayer) _map.removeLayer(_currentBaseLayer);
                _currentBaseLayer = _baseLayers[newLayer];
                if (_currentBaseLayer) _currentBaseLayer.addTo(_map);

                // Sync radio UI in case change came from outside the control panel
                for (var i = 0; i < radios.length; i++) {
                    radios[i].checked = (radios[i].value === newLayer);
                }
            });
        }

        // Wire travel route toggle
        var routeToggle = panel.querySelector('#travel-route-toggle');
        if (routeToggle) {
            routeToggle.addEventListener('change', function () {
                if (this.checked) {
                    if (_travelRouteLayer) _travelRouteLayer.addTo(_map);
                } else {
                    if (_travelRouteLayer) _map.removeLayer(_travelRouteLayer);
                }
            });
        }

        // Mobile touch handler for segment tooltips
        var segments = panel.querySelectorAll('.timeline-segment');
        for (var ts = 0; ts < segments.length; ts++) {
            segments[ts].addEventListener('touchstart', (function (allSegs) {
                return function () {
                    for (var c = 0; c < allSegs.length; c++) allSegs[c].classList.remove('touched');
                    this.classList.add('touched');
                };
            })(segments));
        }

        // Wire auth UI
        var signInBtn = document.getElementById('auth-sign-in-btn');
        var signOutLink = document.getElementById('auth-sign-out');
        var authUserInfo = document.getElementById('auth-user-info');
        var authAvatar = document.getElementById('auth-avatar');
        var authName = document.getElementById('auth-name');
        var authSection = document.getElementById('auth-section');

        if (signInBtn) {
            signInBtn.addEventListener('click', function () {
                if (window.firebaseAuth) window.firebaseAuth.signIn();
            });
        }
        if (signOutLink) {
            signOutLink.addEventListener('click', function (e) {
                e.preventDefault();
                if (window.firebaseAuth) window.firebaseAuth.signOut();
            });
        }

        // Hide auth section until Firebase is ready
        if (authSection && !window.firebaseApp) {
            authSection.style.display = 'none';
        }

        window.addEventListener('firebase-ready', function () {
            if (authSection) authSection.style.display = '';
        });

        window.addEventListener('auth-state-changed', function (e) {
            var user = e.detail.user;
            var isEditor = e.detail.isEditor;
            if (user) {
                signInBtn.style.display = 'none';
                authUserInfo.style.display = '';
                authAvatar.src = user.photoURL || '';
                authAvatar.style.display = user.photoURL ? '' : 'none';
                authName.textContent = user.displayName || user.email || '';

                // Load cloud favorites for signed-in editors
                if (isEditor && window.cloudData) {
                    if (localStorage.getItem('photomap_favorites')) {
                        window.cloudData.migrateFavorites(user.uid, _allPhotos).then(function () {
                            _setCloudFavoritesLoaded(true);
                            _rebuildPhotoLayer();
                            _buildPhotoIndex();
                        });
                    } else {
                        window.cloudData.loadFavorites(user.uid).then(function () {
                            _setCloudFavoritesLoaded(true);
                            _rebuildPhotoLayer();
                            _buildPhotoIndex();
                        });
                    }
                }
            } else {
                signInBtn.style.display = '';
                authUserInfo.style.display = 'none';
                _setCloudFavoritesLoaded(false);
                _rebuildPhotoLayer();
            }

            // Gate favorite star visibility based on editor status
            // No-op: photo viewer reads firebaseAuth.isEditor directly
        });

        // visibleDateRange: No onChange subscriber needed here. The timeline sliders
        // are the *source* of the date range, not a consumer. appState.set('visibleDateRange', ...)
        // is called in app.js:applyTimelineFilter(). If programmatic date range changes are
        // needed in the future (e.g., URL hash restore), add an onChange subscriber here to
        // sync slider positions.

        // Wire density slider
        var _densityTimeout = null;
        document.getElementById('density-slider').addEventListener('input', function () {
            currentDensityCellSize = parseInt(this.value, 10);
            if (_densityTimeout) clearTimeout(_densityTimeout);
            _densityTimeout = setTimeout(function () {
                _onDensityChange(currentDensityCellSize);
            }, 100);
        });

        // Wire size slider
        var _sizeTimeout = null;
        document.getElementById('size-slider').addEventListener('input', function () {
            currentIconSize = parseInt(this.value, 10);
            document.getElementById('size-val').textContent = currentIconSize + 'px';
            if (_sizeTimeout) clearTimeout(_sizeTimeout);
            _sizeTimeout = setTimeout(function () {
                _onSizeChange(currentIconSize);
            }, 100);
        });
    }

    function _updatePendingIndicator() {
        var el = document.getElementById('pending-writes-indicator');
        if (!el) return;
        var count = window.cloudData ? window.cloudData.getPendingWritesCount() : 0;
        el.style.display = count > 0 ? '' : 'none';
        el.title = count + ' change' + (count !== 1 ? 's' : '') + ' pending sync';
    }

    function updatePhotoCount(count) {
        var el = document.querySelector('.timeline-photo-count');
        if (el) {
            el.innerHTML = '<span class="photo-count-number">' + count + '</span> / ' + _allPhotos.length + ' photos';
        }
    }

    window.controlPanel = { init: init };
})();
