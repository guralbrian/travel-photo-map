/*
  ViewportSampler - Density-based photo display for the map viewport.
  Divides the visible viewport into a screen-space grid and shows at most
  one photo per cell, with "+N" badges for hidden neighbors.
*/
var ViewportSampler = (function () {
    var _map = null;
    var _photos = [];          // full filtered photo array
    var _markers = {};         // key -> L.Marker currently on map
    var _layerGroup = null;
    var _iconSize = 90;
    var _cellSize = 150;
    var _onClickHandler = null;
    var _favGetter = null;     // function(photo) -> bool

    // Stable hash for deterministic tiebreaking
    function stableHash(s) {
        var h = 0;
        for (var i = 0; i < s.length; i++) {
            h = ((h << 5) - h + s.charCodeAt(i)) | 0;
        }
        return h;
    }

    function photoKey(p) {
        return p.url + '|' + p.lat + '|' + p.lng;
    }

    // Priority: favorites > captioned > stable hash tiebreak
    function photoPriority(p) {
        var score = 0;
        if (p._isFavorite) score += 1000000;
        if (p.caption) score += 1000;
        // Add a stable hash component for deterministic ordering
        score += (stableHash(photoKey(p)) & 0x3FF);
        return score;
    }

    function init(map, photos, opts) {
        _map = map;
        _photos = photos || [];
        _iconSize = (opts && opts.iconSize) || _iconSize;
        _cellSize = (opts && opts.cellSize) || _cellSize;
        _onClickHandler = (opts && opts.onClick) || null;
        _favGetter = (opts && opts.isFavorite) || null;

        if (!_layerGroup) {
            _layerGroup = L.layerGroup().addTo(_map);
        }

        update();
    }

    function stop() {
        if (_layerGroup && _map) {
            _layerGroup.clearLayers();
            _map.removeLayer(_layerGroup);
        }
        _layerGroup = null;
        _markers = {};
        _photos = [];
    }

    function setPhotos(photos) {
        _photos = photos || [];
    }

    function update() {
        if (!_map || !_layerGroup) return;

        var bounds = _map.getBounds();
        var mapSize = _map.getSize();

        // Filter photos to viewport
        var visible = [];
        for (var i = 0; i < _photos.length; i++) {
            var p = _photos[i];
            if (p._isFavorite) continue; // favorites handled separately
            if (bounds.contains(L.latLng(p.lat, p.lng))) {
                visible.push(p);
            }
        }

        // Assign each photo to a screen-space grid cell
        var cells = {};
        for (var v = 0; v < visible.length; v++) {
            var photo = visible[v];
            var pt = _map.latLngToContainerPoint(L.latLng(photo.lat, photo.lng));
            var cellX = Math.floor(pt.x / _cellSize);
            var cellY = Math.floor(pt.y / _cellSize);
            var cellKey = cellX + ',' + cellY;

            if (!cells[cellKey]) {
                cells[cellKey] = [];
            }
            cells[cellKey].push(photo);
        }

        // Select best photo per cell
        var nextMarkers = {}; // key -> { photo, hiddenCount }
        var cellKeys = Object.keys(cells);
        for (var c = 0; c < cellKeys.length; c++) {
            var bucket = cells[cellKeys[c]];
            // Sort by priority descending
            bucket.sort(function (a, b) {
                return photoPriority(b) - photoPriority(a);
            });
            var best = bucket[0];
            var key = photoKey(best);
            nextMarkers[key] = {
                photo: best,
                hiddenCount: bucket.length - 1
            };
        }

        // Diff: remove markers no longer needed, add new ones
        var toRemove = [];
        var toKeep = {};
        var existingKeys = Object.keys(_markers);
        for (var r = 0; r < existingKeys.length; r++) {
            var ek = existingKeys[r];
            if (!nextMarkers[ek]) {
                toRemove.push(ek);
            } else {
                toKeep[ek] = true;
            }
        }

        // Fade out removed markers
        for (var rm = 0; rm < toRemove.length; rm++) {
            var rmKey = toRemove[rm];
            var rmMarker = _markers[rmKey];
            if (rmMarker) {
                fadeOutAndRemove(rmMarker);
            }
            delete _markers[rmKey];
        }

        // Update existing markers' hiddenCount badge
        var keepKeys = Object.keys(toKeep);
        for (var uk = 0; uk < keepKeys.length; uk++) {
            var uKey = keepKeys[uk];
            var marker = _markers[uKey];
            var info = nextMarkers[uKey];
            if (marker && marker._icon) {
                updateBadge(marker._icon, info.hiddenCount);
            }
        }

        // Add new markers
        var newKeys = Object.keys(nextMarkers);
        var newMarkers = [];
        for (var n = 0; n < newKeys.length; n++) {
            var nk = newKeys[n];
            if (toKeep[nk]) continue; // already on map
            var data = nextMarkers[nk];
            var m = createMarker(data.photo, data.hiddenCount);
            _markers[nk] = m;
            _layerGroup.addLayer(m);
            fadeIn(m);
            newMarkers.push(m);
        }

    }

    function createMarker(photo, hiddenCount) {
        var icon = new L.Photo.Icon(L.extend({}, {
            iconSize: [_iconSize, _iconSize],
            thumbnail: photo.thumbnail,
            isVideo: photo.type === 'video',
            isFavorite: photo._isFavorite || false,
            hasCaption: !!(photo.caption),
            hiddenCount: hiddenCount || 0
        }));
        var marker = L.marker(L.latLng(photo.lat, photo.lng), {
            icon: icon,
            title: photo.caption || ''
        });
        marker.photo = photo;

        if (_onClickHandler) {
            marker.on('click', function () {
                _onClickHandler({ layer: marker });
            });
        }

        return marker;
    }

    function fadeIn(marker) {
        // Wait for marker to be added to DOM
        setTimeout(function () {
            var el = marker.getElement ? marker.getElement() : (marker._icon || null);
            if (el) {
                el.classList.add('photo-fade-in');
                // Remove class after animation completes
                setTimeout(function () {
                    el.classList.remove('photo-fade-in');
                }, 300);
            }
        }, 10);
    }

    function fadeOutAndRemove(marker) {
        var el = marker.getElement ? marker.getElement() : (marker._icon || null);
        if (el) {
            el.classList.add('photo-fade-out');
            setTimeout(function () {
                if (_layerGroup) _layerGroup.removeLayer(marker);
            }, 300);
        } else {
            if (_layerGroup) _layerGroup.removeLayer(marker);
        }
    }

    function updateBadge(iconEl, hiddenCount) {
        var badge = iconEl.querySelector('.photo-cluster-count');
        if (hiddenCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'photo-cluster-count';
                iconEl.appendChild(badge);
            }
            badge.textContent = '+' + hiddenCount;
        } else {
            if (badge) badge.parentNode.removeChild(badge);
        }
    }

    function updateIconSize(size) {
        _iconSize = size;
        // Rebuild all markers with new size
        var keys = Object.keys(_markers);
        for (var i = 0; i < keys.length; i++) {
            var marker = _markers[keys[i]];
            if (marker && marker.photo) {
                var hiddenCount = 0;
                var badge = marker._icon ? marker._icon.querySelector('.photo-cluster-count') : null;
                if (badge) {
                    var text = badge.textContent;
                    hiddenCount = parseInt(text.replace('+', ''), 10) || 0;
                }
                var icon = new L.Photo.Icon(L.extend({}, {
                    iconSize: [size, size],
                    thumbnail: marker.photo.thumbnail,
                    isVideo: marker.photo.type === 'video',
                    isFavorite: marker.photo._isFavorite || false,
                    hasCaption: !!(marker.photo.caption),
                    hiddenCount: hiddenCount
                }));
                marker.setIcon(icon);
            }
        }
    }

    function setCellSize(size) {
        _cellSize = size;
        update();
    }

    function getBounds() {
        var keys = Object.keys(_markers);
        if (keys.length === 0) return null;
        var group = L.featureGroup();
        for (var i = 0; i < keys.length; i++) {
            if (_markers[keys[i]]) {
                group.addLayer(_markers[keys[i]]);
            }
        }
        return group.getBounds();
    }

    return {
        init: init,
        stop: stop,
        update: update,
        updateIconSize: updateIconSize,
        setCellSize: setCellSize,
        setPhotos: setPhotos,
        getBounds: getBounds
    };
})();
