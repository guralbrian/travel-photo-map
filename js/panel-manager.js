(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════
       PanelSnap — shared drag-to-snap behaviour for bottom panels.
       Uses Pointer Events for unified mouse + touch handling.
    ═══════════════════════════════════════════════════════════════ */

    function PanelSnap(opts) {
        this._panel = opts.panelEl;
        this._handle = opts.handleEl;
        this._prefix = opts.statePrefix || 'panel';
        this._onStateChange = opts.onStateChange || function () {};
        this.currentState = 'collapsed';
        this._dragging = false;
        this._startY = 0;
        this._startHeight = 0;
        this._velocitySamples = [];

        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp   = this._onPointerUp.bind(this);

        if (this._handle) {
            this._handle.addEventListener('pointerdown', this._onPointerDown);
        }
        if (opts.collapseBtn) {
            var self = this;
            opts.collapseBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (self.currentState === 'collapsed') {
                    self.snapTo('hidden');
                } else {
                    self.snapTo('collapsed');
                }
            });
        }
    }

    PanelSnap.prototype.snapTo = function (state) {
        this.currentState = state;
        var p = this._prefix;
        this._panel.classList.add(p + '--animating');
        this._panel.classList.remove(
            p + '--collapsed',
            p + '--half',
            p + '--full',
            p + '--hidden'
        );
        this._panel.classList.add(p + '--' + state);
        this._panel.style.height = '';

        this._panel.style.zIndex = (state === 'full') ? '1003' : '';

        var panel = this._panel;
        setTimeout(function () {
            panel.classList.remove(p + '--animating');
        }, 280);

        this._onStateChange(state);
    };

    PanelSnap.prototype._onPointerDown = function (e) {
        this._dragging = true;
        this._startY = e.clientY;
        this._startHeight = this._panel.offsetHeight;
        this._velocitySamples = [{ y: e.clientY, t: Date.now() }];
        this._panel.classList.remove(this._prefix + '--animating');
        this._handle.setPointerCapture(e.pointerId);

        document.addEventListener('pointermove', this._onPointerMove);
        document.addEventListener('pointerup',   this._onPointerUp);
        document.addEventListener('pointercancel', this._onPointerUp);
    };

    PanelSnap.prototype._onPointerMove = function (e) {
        if (!this._dragging) return;
        var deltaY = this._startY - e.clientY;
        var newH = Math.max(40, Math.min(window.innerHeight, this._startHeight + deltaY));
        this._panel.style.height = newH + 'px';

        this._velocitySamples.push({ y: e.clientY, t: Date.now() });
        if (this._velocitySamples.length > 6) this._velocitySamples.shift();
    };

    PanelSnap.prototype._onPointerUp = function () {
        if (!this._dragging) return;
        this._dragging = false;

        document.removeEventListener('pointermove', this._onPointerMove);
        document.removeEventListener('pointerup',   this._onPointerUp);
        document.removeEventListener('pointercancel', this._onPointerUp);

        var velocity = 0;
        if (this._velocitySamples.length >= 2) {
            var first = this._velocitySamples[0];
            var last  = this._velocitySamples[this._velocitySamples.length - 1];
            var dt = last.t - first.t;
            if (dt > 0) velocity = (last.y - first.y) / dt * 1000;
        }

        var currentH = this._panel.offsetHeight;
        var vh = window.innerHeight;
        var collapsedH = vh * 0.30;
        var halfH      = vh * 0.50;

        var target;
        if (velocity > 400) {
            target = (this.currentState === 'full') ? 'half' : (this.currentState === 'half') ? 'collapsed' : 'hidden';
        } else if (velocity < -250 && this.currentState === 'half') {
            target = 'full';
        } else if (velocity < -300) {
            target = (this.currentState === 'collapsed') ? 'half' : 'full';
        } else {
            var midColHalf = collapsedH + (halfH - collapsedH) * 0.5;
            var midHalfFull = halfH + (vh - halfH) * 0.35;
            if (currentH >= midHalfFull) {
                target = 'full';
            } else if (currentH >= midColHalf) {
                target = 'half';
            } else {
                target = 'collapsed';
            }
        }
        this.snapTo(target);
    };

    /* ═══════════════════════════════════════════════════════════════
       PanelCoordinator — enforces single-panel-at-a-time on mobile.
    ═══════════════════════════════════════════════════════════════ */

    function PanelCoordinator() {
        this._panels = {};       // id → { snap: PanelSnap, toggleBtn: Element }
        this._activePanel = null;

        var self = this;
        document.addEventListener('panel:activate', function (e) {
            var panelId = e.detail && e.detail.panel;
            if (panelId) self.activate(panelId);
        });
        document.addEventListener('panel:deactivate', function (e) {
            var panelId = e.detail && e.detail.panel;
            if (panelId === self._activePanel) {
                self._activePanel = null;
                self._updateToggleButtons();
            }
        });
    }

    PanelCoordinator.prototype.register = function (id, snap, toggleBtnEl) {
        this._panels[id] = { snap: snap, toggleBtn: toggleBtnEl };
    };

    PanelCoordinator.prototype.activate = function (panelId) {
        var entry = this._panels[panelId];
        if (!entry) return;

        // On mobile, hide all other panels first
        if (window.innerWidth <= 768) {
            for (var id in this._panels) {
                if (id !== panelId && this._panels[id].snap.currentState !== 'hidden') {
                    this._panels[id].snap.snapTo('hidden');
                    document.dispatchEvent(new CustomEvent('panel:deactivate', {
                        detail: { panel: id }
                    }));
                }
            }
        }

        // Activate the requested panel if it's hidden
        if (entry.snap.currentState === 'hidden') {
            entry.snap.snapTo('collapsed');
        }

        this._activePanel = panelId;
        this._updateToggleButtons();
    };

    PanelCoordinator.prototype._updateToggleButtons = function () {
        for (var id in this._panels) {
            var btn = this._panels[id].toggleBtn;
            if (!btn) continue;
            // Show toggle button when this panel is NOT the active one
            if (id !== this._activePanel) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        }
    };

    PanelCoordinator.prototype.getActivePanel = function () {
        return this._activePanel;
    };

    /* ═══════════════════════════════════════════════════════════════
       Escape Key / Back Gesture Handler
    ═══════════════════════════════════════════════════════════════ */
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;

        // 1. If regions overlay is open, close it
        var overlay = document.querySelector('.region-grid--overlay');
        if (overlay && !overlay.classList.contains('hidden')) {
            var toggleBtn = document.getElementById('region-toggle');
            if (toggleBtn) toggleBtn.click();
            return;
        }

        // 2. Dismiss the topmost active panel
        var coordinator = window.panelCoordinator;
        if (!coordinator) return;
        var activeId = coordinator.getActivePanel();
        if (activeId && coordinator._panels[activeId]) {
            var snap = coordinator._panels[activeId].snap;
            if (snap.currentState === 'full' || snap.currentState === 'half') {
                snap.snapTo('collapsed');
            } else if (snap.currentState === 'collapsed') {
                snap.snapTo('hidden');
            }
        }
    });

    /* ═══════════════════════════════════════════════════════════════
       Resize Handler — re-evaluate panel state on viewport change
    ═══════════════════════════════════════════════════════════════ */
    var _resizeTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(function () {
            var coordinator = window.panelCoordinator;
            if (!coordinator) return;
            var activeId = coordinator.getActivePanel();
            if (activeId && coordinator._panels[activeId]) {
                var snap = coordinator._panels[activeId].snap;
                // Re-snap to recalculate heights
                if (snap.currentState !== 'hidden') {
                    snap.snapTo(snap.currentState);
                }
            }
        }, 200);
    });

    /* ═══════════════════════════════════════════════════════════════
       Tap-to-Toggle Detection
       Detect taps on drag handles (<5px movement, <200ms)
       and toggle between collapsed and half states.
    ═══════════════════════════════════════════════════════════════ */
    var _origPointerDown = PanelSnap.prototype._onPointerDown;
    PanelSnap.prototype._onPointerDown = function (e) {
        this._tapStartY = e.clientY;
        this._tapStartTime = Date.now();
        _origPointerDown.call(this, e);
    };

    var _origPointerUp = PanelSnap.prototype._onPointerUp;
    PanelSnap.prototype._onPointerUp = function () {
        if (!this._dragging) return;
        var moved = Math.abs(this._panel.offsetHeight - this._startHeight);
        var elapsed = Date.now() - (this._tapStartTime || 0);

        if (moved < 5 && elapsed < 200) {
            // It's a tap, not a drag
            this._dragging = false;
            document.removeEventListener('pointermove', this._onPointerMove);
            document.removeEventListener('pointerup', this._onPointerUp);
            document.removeEventListener('pointercancel', this._onPointerUp);

            if (this.currentState === 'collapsed') {
                this.snapTo('half');
            } else {
                this.snapTo('collapsed');
            }
            return;
        }
        _origPointerUp.call(this);
    };

    /* ═══════════════════════════════════════════════════════════════
       ViewNav — perpetual nav buttons for switching between views.
       Tracks current view: 'map', 'photo-wall', 'landing'
       Shows two buttons for the views that aren't current.
    ═══════════════════════════════════════════════════════════════ */

    function ViewNav() {
        this._currentView = 'landing';  // start on landing page
        this._buttons = {};
        this._callbacks = {};
    }

    ViewNav.prototype.init = function () {
        this._buttons = {
            'photo-wall': document.getElementById('photo-wall-reopen-btn'),
            'region-intro': document.getElementById('region-intro-toggle-btn')
        };

        var self = this;
        // Track when photo-wall becomes active
        document.addEventListener('panel:activate', function (e) {
            if (e.detail && e.detail.panel === 'photo-wall') {
                self.setView('photo-wall');
            }
        });
        // Track when photo-wall is deactivated (back to map)
        document.addEventListener('panel:deactivate', function (e) {
            if (e.detail && e.detail.panel === 'photo-wall' && self._currentView === 'photo-wall') {
                self.setView('map');
            }
        });

        this._updateVisibility();
    };

    ViewNav.prototype.setView = function (view) {
        this._currentView = view;
        this._updateVisibility();
    };

    ViewNav.prototype.getView = function () {
        return this._currentView;
    };

    ViewNav.prototype.onNavigate = function (view, callback) {
        this._callbacks[view] = callback;
    };

    ViewNav.prototype._updateVisibility = function () {
        // Only show on mobile
        if (window.innerWidth > 768) return;

        for (var id in this._buttons) {
            var btn = this._buttons[id];
            if (!btn) continue;

            if (this._currentView === 'landing') {
                // On landing page, hide nav buttons (landing has its own nav)
                btn.classList.remove('visible');
            } else if (id === 'photo-wall') {
                // Show photo button when NOT in photo-wall
                btn.classList.toggle('visible', this._currentView !== 'photo-wall');
            } else if (id === 'region-intro') {
                // Show region button when NOT on landing
                btn.classList.toggle('visible', this._currentView !== 'landing');
            }
        }
    };

    /* ═══════════════════════════════════════════════════════════════
       Expose globally
    ═══════════════════════════════════════════════════════════════ */
    window.PanelSnap = PanelSnap;
    window.PanelCoordinator = PanelCoordinator;
    window.panelCoordinator = new PanelCoordinator();
    window.viewNav = new ViewNav();

}());
