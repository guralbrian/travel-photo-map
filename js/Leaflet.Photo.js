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

        // Support tier-based sizing (new) with fallback to legacy iconSize
        var frameSize, stemHeight, tier;
        if (this.options.frameSize !== undefined) {
            frameSize = this.options.frameSize;
            stemHeight = this.options.stemHeight || 0;
            tier = this.options.tier !== undefined ? this.options.tier : 0;
        } else {
            frameSize = this.options.iconSize[0];
            stemHeight = 0;
            tier = 0;
        }

        // Set iconSize to total element dimensions for Leaflet's internal positioning
        this.options.iconSize = [frameSize, frameSize + stemHeight];

        // iconAnchor: stemmed markers anchor at stem tip; stemless anchor at frame center
        if (tier > 0 && stemHeight > 0) {
            this.options.iconAnchor = [Math.round(frameSize / 2), frameSize + stemHeight];
        } else {
            this.options.iconAnchor = [Math.round(frameSize / 2), Math.round(frameSize / 2)];
        }

        this._setIconStyles(el, 'icon');
        el.classList.add('marker-tier-' + tier);

        // Inner frame div — clips photo and contains all badges
        var frameInner = document.createElement('div');
        frameInner.className = 'photo-frame-inner';
        frameInner.style.width = frameSize + 'px';
        frameInner.style.height = frameSize + 'px';
        el.appendChild(frameInner);

        var img = document.createElement('img');
        img.src = this.options.thumbnail || '';
        img.style.width = frameSize + 'px';
        img.style.height = frameSize + 'px';
        frameInner.appendChild(img);

        if (this.options.isVideo) {
            var badge = document.createElement('span');
            badge.className = 'photo-video-badge';
            badge.textContent = '\u25B6';
            frameInner.appendChild(badge);
        }

        if (this.options.isFavorite) {
            el.classList.add('photo-marker-favorite');
            var favBadge = document.createElement('span');
            favBadge.className = 'photo-favorite-badge';
            favBadge.textContent = '\u2605';
            frameInner.appendChild(favBadge);
        }

        if (this.options.hasCaption) {
            var notesBadge = document.createElement('span');
            notesBadge.className = 'photo-notes-badge';
            notesBadge.textContent = '\uD83D\uDCAC';
            frameInner.appendChild(notesBadge);
        }

        if (this.options.hiddenCount && this.options.hiddenCount > 0) {
            var countBadge = document.createElement('span');
            countBadge.className = 'photo-cluster-count';
            countBadge.textContent = '' + this.options.hiddenCount;
            frameInner.appendChild(countBadge);
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


})();
