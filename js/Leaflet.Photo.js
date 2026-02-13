/*
  Leaflet.Photo - HeikkiVesanto fork
  https://github.com/HeikkiVesanto/Leaflet.Photo
  Based on original by turban: https://github.com/turban/Leaflet.Photo
  License: MIT
*/
(function () {

L.Photo = L.FeatureGroup.extend({
    options: {
        icon: {
            iconSize: [40, 40]
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
                thumbnail: photo.thumbnail
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
        iconSize: [40, 40],
        className: 'leaflet-marker-photo'
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
            iconCreateFunction: function (cluster) {
                var markers = cluster.getAllChildMarkers();
                // Use the first marker's thumbnail as the cluster icon
                var firstThumb = '';
                if (markers.length > 0 && markers[0].photo) {
                    firstThumb = markers[0].photo.thumbnail;
                }
                return new L.Photo.Icon({
                    iconSize: [40, 40],
                    thumbnail: firstThumb
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
            var markers = [];
            for (var i = 0, len = photos.length; i < len; i++) {
                var photo = photos[i];
                var icon = new L.Photo.Icon(
                    L.extend({}, this.options.icon || {}, {
                        iconSize: [40, 40],
                        thumbnail: photo.thumbnail
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
