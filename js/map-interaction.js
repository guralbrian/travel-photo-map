/**
 * Map Interaction Policy — Mobile passive/active toggle.
 *
 * On mobile (<=768px) the map starts inert (no drag/pinch/scroll-zoom)
 * so the user can scroll the page and interact with panels. A floating
 * button lets them opt in to map interaction and opt back out.
 *
 * On desktop the map is always interactive and the button is hidden.
 *
 * Exposes window.mapInteraction with init(map).
 */
(function () {
    'use strict';

    var MOBILE_BREAKPOINT = 768;
    var _map = null;
    var _btn = null;
    var _isActive = false;
    var _isMobile = false;
    var _resizeTimer = null;

    // ──── Handler management ────

    function disableMapHandlers() {
        _map.dragging.disable();
        _map.touchZoom.disable();
        _map.scrollWheelZoom.disable();
        if (_map.tap) _map.tap.disable();
        _map.getContainer().classList.add('map--passive');
    }

    function enableMapHandlers() {
        _map.dragging.enable();
        _map.touchZoom.enable();
        _map.scrollWheelZoom.enable();
        if (_map.tap) _map.tap.enable();
        _map.getContainer().classList.remove('map--passive');
    }

    // ──── Toggle logic ────

    function setActive(active) {
        _isActive = active;
        if (active) {
            enableMapHandlers();
        } else {
            disableMapHandlers();
        }
        updateButton();
        if (window.appState) {
            window.appState.set('mapInteractive', active);
        }
    }

    function updateButton() {
        if (!_btn) return;
        if (_isActive) {
            _btn.classList.add('map-mode-btn--active');
            _btn.setAttribute('aria-label', 'Lock map');
        } else {
            _btn.classList.remove('map-mode-btn--active');
            _btn.setAttribute('aria-label', 'Unlock map');
        }
    }

    // ──── Floating button ────

    function createButton() {
        var btn = document.createElement('button');
        btn.className = 'map-mode-btn';
        btn.setAttribute('aria-label', 'Unlock map');
        btn.innerHTML =
            '<svg class="map-mode-icon map-mode-icon-passive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M5 9l4-4 4 4"/>' +
                '<path d="M11 19l4 4 4-4"/>' +
                '<path d="M19 5l4 4-4 4"/>' +
                '<path d="M1 11l-4 4 4 4"/>' +
                '<path d="M9 5v14"/><path d="M15 5v14"/>' +
                '<path d="M5 9h14"/><path d="M5 15h14"/>' +
            '</svg>' +
            '<svg class="map-mode-icon map-mode-icon-active" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="18" y1="6" x2="6" y2="18"/>' +
                '<line x1="6" y1="6" x2="18" y2="18"/>' +
            '</svg>';
        btn.addEventListener('click', function () {
            setActive(!_isActive);
        });
        document.body.appendChild(btn);
        return btn;
    }

    // ──── State listeners ────

    function onViewerChange(open) {
        if (open && _isActive && _isMobile) {
            setActive(false);
        }
    }

    function onPanelChange(panelId) {
        if (panelId && _isActive && _isMobile) {
            setActive(false);
        }
    }

    // ──── Resize handling ────

    function evaluateMobile() {
        var wasMobile = _isMobile;
        _isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

        if (_isMobile && !wasMobile) {
            // Crossed desktop → mobile
            setActive(false);
            if (_btn) _btn.style.display = '';
        } else if (!_isMobile && wasMobile) {
            // Crossed mobile → desktop
            enableMapHandlers();
            _isActive = false;
            if (window.appState) window.appState.set('mapInteractive', false);
            if (_btn) _btn.style.display = 'none';
        }
    }

    function onResize() {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(evaluateMobile, 150);
    }

    // ──── Public API ────

    window.mapInteraction = {
        init: function (map) {
            _map = map;
            _isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
            _btn = createButton();

            if (_isMobile) {
                disableMapHandlers();
                if (window.appState) window.appState.set('mapInteractive', false);
            } else {
                _btn.style.display = 'none';
            }

            // Subscribe to appState changes
            if (window.appState) {
                window.appState.onChange('viewerOpen', onViewerChange);
                window.appState.onChange('activePanel', onPanelChange);
            }

            window.addEventListener('resize', onResize);
        }
    };
}());
