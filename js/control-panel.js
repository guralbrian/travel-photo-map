(function () {
    'use strict';

    // Module state (initialized via init)
    var _map = null;
    var _baseLayers = null;
    var _currentBaseLayer = null;
    var _travelRouteLayer = null;
    var _allPhotos = null;
    var _feedSidebar = null;
    var _feedToggle = null;
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
        _allPhotos = opts.allPhotos;
        _feedSidebar = opts.feedSidebar;
        _feedToggle = opts.feedToggle;
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
        var _el = domHelpers.el;

        // Build layer controls
        var layerNames = Object.keys(_baseLayers);
        var layerContent = _el('div', {className: 'panel-section-content'},
            _el('div', {className: 'layer-group-title'}, 'Base Map')
        );
        for (var li = 0; li < layerNames.length; li++) {
            var radioAttrs = {type: 'radio', name: 'base-layer', value: layerNames[li]};
            if (layerNames[li] === 'Humanitarian') radioAttrs.checked = '';
            layerContent.appendChild(_el('label', {className: 'layer-option'},
                _el('input', radioAttrs),
                ' ' + layerNames[li]
            ));
        }
        layerContent.appendChild(_el('hr', {className: 'layer-separator'}));
        layerContent.appendChild(_el('div', {className: 'layer-group-title'}, 'Overlays'));
        var routeCheckbox = _el('input', {type: 'checkbox', id: 'travel-route-toggle', checked: ''});
        layerContent.appendChild(_el('label', {className: 'layer-option'}, routeCheckbox, ' Travel Route'));

        // Toggle button (SVG via innerHTML — static markup, no user content)
        var toggleBtn = document.createElement('button');
        toggleBtn.className = 'panel-toggle';
        toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>';
        document.body.appendChild(toggleBtn);

        // Panel
        var panel = _el('div', {className: 'control-panel hidden'},
            _el('div', {className: 'panel-header'},
                _el('h3', null, 'Controls'),
                _el('button', {className: 'panel-close'}, '\u00D7')
            ),
            _el('div', {className: 'auth-section', id: 'auth-section'},
                _el('button', {className: 'auth-sign-in-btn', id: 'auth-sign-in-btn'}, 'Sign in with Google'),
                _el('div', {className: 'auth-user-info', id: 'auth-user-info', style: 'display:none'},
                    _el('img', {className: 'auth-avatar', id: 'auth-avatar', src: '', alt: ''}),
                    _el('span', {className: 'auth-name', id: 'auth-name'}),
                    _el('a', {href: '#', className: 'auth-sign-out', id: 'auth-sign-out'}, 'Sign out')
                ),
                _el('span', {className: 'pending-writes-indicator', id: 'pending-writes-indicator', style: 'display:none', title: 'Changes pending sync'}, '\u2601')
            ),
            _el('details', {className: 'panel-section'},
                _el('summary', null, 'Map Layers'),
                layerContent
            ),
            _el('details', {className: 'panel-section'},
                _el('summary', null, 'Settings'),
                _el('div', {className: 'panel-section-content'},
                    _el('label', null, 'Photo Density ', _el('span', {className: 'slider-value', id: 'density-val'})),
                    _el('input', {type: 'range', id: 'density-slider', min: '80', max: '300', value: String(currentDensityCellSize), style: 'direction:rtl'}),
                    _el('label', null, 'Photo Size ', _el('span', {className: 'slider-value', id: 'size-val'}, currentIconSize + 'px')),
                    _el('input', {type: 'range', id: 'size-slider', min: '45', max: '180', value: String(currentIconSize)})
                )
            )
        );
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

    function updatePhotoCount() {
        // No-op: timeline removed
    }

    window.controlPanel = { init: init };
})();
