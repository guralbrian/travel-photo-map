/*
  Leaflet.Photo - HeikkiVesanto fork
  https://github.com/HeikkiVesanto/Leaflet.Photo
  Based on original by turban: https://github.com/turban/Leaflet.Photo
  License: MIT
*/
(function () {

var DEFAULT_ICON_SIZE = [90, 90];

L.Photo = L.FeatureGroup.extend({
    options: {
        icon: {
            iconSize: DEFAULT_ICON_SIZE
        }
    },

    initialize: function (photos, options) {
        L.setOptions(this, options);
        L.FeatureGroup.prototype.initialize.call(this, options);
        if (photos) {
            this.add(photos);
        }
    },

    add: function (photos) {
        if (photos) {
            for (var i = 0, len = photos.length; i < len; i++) {
                this.addLayer(this._getMarker(photos[i]));
            }
        }
        return this;
    },

    clear: function () {
        this.eachLayer(function (layer) {
            this.removeLayer(layer);
        }, this);
        return this;
    },

    _getMarker: function (photo) {
        var icon = new L.Photo.Icon(
            L.extend(this.options.icon, {
                thumbnail: photo.thumbnail,
                isVideo: photo.type === 'video',
                isFavorite: photo._isFavorite || false,
                hasCaption: !!(photo.caption)
            })
        );
        var marker = L.marker(L.latLng(photo.lat, photo.lng), {
            icon: icon,
            title: photo.caption || ''
        });
        marker.photo = photo;
        return marker;
    }
});

L.Photo.Icon = L.Icon.extend({
    options: {
        iconSize: DEFAULT_ICON_SIZE,
        className: 'leaflet-marker-photo',
        isFavorite: false,
        hasCaption: false
    },

    initialize: function (options) {
        L.setOptions(this, options);
    },

    createIcon: function () {
        var el = document.createElement('div');
        var img = document.createElement('img');
        el.appendChild(img);
        this._setIconStyles(el, 'icon');

        el.style.width = this.options.iconSize[0] + 'px';
        el.style.height = this.options.iconSize[1] + 'px';

        img.src = this.options.thumbnail || '';
        img.style.width = this.options.iconSize[0] + 'px';
        img.style.height = this.options.iconSize[1] + 'px';

        if (this.options.isVideo) {
            var badge = document.createElement('span');
            badge.className = 'photo-video-badge';
            badge.textContent = '\u25B6';
            el.appendChild(badge);
        }

        if (this.options.isFavorite) {
            el.classList.add('photo-marker-favorite');
            var favBadge = document.createElement('span');
            favBadge.className = 'photo-favorite-badge';
            favBadge.textContent = '\u2605';
            el.appendChild(favBadge);
        }

        if (this.options.hasCaption) {
            var notesBadge = document.createElement('span');
            notesBadge.className = 'photo-notes-badge';
            notesBadge.textContent = '\uD83D\uDCAC';
            el.appendChild(notesBadge);
        }

        return el;
    },

    createShadow: function () {
        return null;
    }
});

L.photo = function (photos, options) {
    return new L.Photo(photos, options);
};

if (L.MarkerClusterGroup) {
    L.Photo.Cluster = L.MarkerClusterGroup.extend({
        options: {
            featureGroup: L.photo,
            maxClusterRadius: 100,
            showCoverageOnHover: false,
            iconSize: DEFAULT_ICON_SIZE,
            iconCreateFunction: function (cluster) {
                var markers = cluster.getAllChildMarkers();
                var count = cluster.getChildCount();
                var size = cluster._group.options.iconSize || DEFAULT_ICON_SIZE;
                var w = size[0], h = size[1];

                // Collect unique thumbnails
                var thumbs = [];
                var seen = {};
                for (var i = 0; i < markers.length; i++) {
                    if (markers[i].photo && markers[i].photo.thumbnail) {
                        var t = markers[i].photo.thumbnail;
                        if (!seen[t]) {
                            seen[t] = true;
                            thumbs.push(t);
                        }
                    }
                    if (thumbs.length >= 9) break;
                }

                // Determine grid: 2-4 photos = 2x2, 5+ = 3x3
                var cols = thumbs.length >= 5 ? 3 : 2;
                var maxCells = cols * cols;
                var usedThumbs = thumbs.slice(0, maxCells);

                // Build grid HTML
                var cellW = Math.floor(w / cols);
                var cellH = Math.floor(h / cols);
                var gridHtml = '<div class="photo-cluster-grid" style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);width:' + w + 'px;height:' + h + 'px;">';
                for (var g = 0; g < maxCells; g++) {
                    var src = usedThumbs[g] || usedThumbs[usedThumbs.length - 1];
                    gridHtml += '<img src="' + src + '" style="width:' + cellW + 'px;height:' + cellH + 'px;">';
                }
                gridHtml += '</div>';
                gridHtml += '<span class="photo-cluster-count">' + count + '</span>';

                return L.divIcon({
                    html: gridHtml,
                    className: 'leaflet-marker-photo',
                    iconSize: [w, h],
                    iconAnchor: [w / 2, h / 2]
                });
            },
            spiderfyDistanceMultiplier: 1.2
        },

        initialize: function (options) {
            options = L.Util.setOptions(this, options);
            L.MarkerClusterGroup.prototype.initialize.call(this, options);
            this._photos = [];
        },

        add: function (photos) {
            this._photos = photos;
            var size = this.options.iconSize || DEFAULT_ICON_SIZE;
            var markers = [];
            for (var i = 0, len = photos.length; i < len; i++) {
                var photo = photos[i];
                var icon = new L.Photo.Icon(
                    L.extend({}, this.options.icon || {}, {
                        iconSize: size,
                        thumbnail: photo.thumbnail,
                        isVideo: photo.type === 'video',
                        isFavorite: photo._isFavorite || false,
                        hasCaption: !!(photo.caption)
                    })
                );
                var marker = L.marker(L.latLng(photo.lat, photo.lng), {
                    icon: icon,
                    title: photo.caption || ''
                });
                marker.photo = photo;
                markers.push(marker);
            }
            this.addLayers(markers);
            return this;
        },

        clear: function () {
            this.clearLayers();
            this._photos = [];
            return this;
        }
    });

    L.photo.cluster = function (options) {
        return new L.Photo.Cluster(options);
    };
}

})();
