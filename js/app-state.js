/**
 * App State Module — Lightweight shared state for top-level UI coordination.
 * Exposes window.appState with get/set/getAll/onChange.
 */
(function () {
    'use strict';

    var _state = {
        activePanel: null,
        activeRegionId: null,
        visibleDateRange: { min: null, max: null },
        viewerOpen: false,
        mapInteractive: false,    // Reserved for spec 021 (mobile map policy). Do not consume yet.
        baseLayer: 'Humanitarian'
    };

    var _listeners = {
        activePanel: [],
        activeRegionId: [],
        visibleDateRange: [],
        viewerOpen: [],
        mapInteractive: [],
        baseLayer: []
    };

    function _hasKey(key) {
        return _listeners.hasOwnProperty(key);
    }

    function _changed(key, oldVal, newVal) {
        if (key === 'visibleDateRange') {
            var o = oldVal || {};
            var n = newVal || {};
            return o.min !== n.min || o.max !== n.max;
        }
        return oldVal !== newVal;
    }

    function _notify(key, newVal, oldVal) {
        var cbs = _listeners[key];
        for (var i = 0; i < cbs.length; i++) {
            try {
                cbs[i](newVal, oldVal);
            } catch (err) {
                console.error('[appState] Listener error for "' + key + '":', err);
            }
        }
    }

    window.appState = {
        get: function (key) {
            if (!_hasKey(key)) {
                console.warn('[appState] Unknown key: ' + key);
                return undefined;
            }
            return _state[key];
        },

        set: function (key, value) {
            if (!_hasKey(key)) {
                console.warn('[appState] Unknown key: ' + key);
                return;
            }
            var oldVal = _state[key];
            if (!_changed(key, oldVal, value)) return;
            _state[key] = value;
            _notify(key, value, oldVal);
        },

        getAll: function () {
            var copy = {};
            for (var k in _state) {
                if (_state.hasOwnProperty(k)) {
                    if (k === 'visibleDateRange') {
                        var vdr = _state[k];
                        copy[k] = { min: vdr.min, max: vdr.max };
                    } else {
                        copy[k] = _state[k];
                    }
                }
            }
            return copy;
        },

        onChange: function (key, callback) {
            if (!_hasKey(key)) {
                console.warn('[appState] Unknown key: ' + key);
                return function () {};
            }
            _listeners[key].push(callback);
            var removed = false;
            return function () {
                if (removed) return;
                var arr = _listeners[key];
                var idx = arr.indexOf(callback);
                if (idx !== -1) arr.splice(idx, 1);
                removed = true;
            };
        }
    };
}());
