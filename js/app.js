(function () {
    'use strict';

    // ──── Map Setup ────
    var map = L.map('map').setView([20, 0], 2);

    var osmAttr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    var cartoAttr = osmAttr + ', &copy; <a href="https://carto.com/attributions">CARTO</a>';

    var streetMap = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: osmAttr,
        maxZoom: 19
    });

    var humanitarian = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: osmAttr + ', Tiles by <a href="https://www.hotosm.org/">HOT</a> hosted by <a href="https://openstreetmap.fr/">OSM France</a>',
        maxZoom: 19
    });

    var terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: ' + osmAttr + ', <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
        maxZoom: 17
    });

    var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
    });

    var esriStreet = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, TomTom',
        maxZoom: 18
    });

    var positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: cartoAttr,
        maxZoom: 20,
        subdomains: 'abcd'
    });

    var darkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: cartoAttr,
        maxZoom: 20,
        subdomains: 'abcd'
    });

    var voyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
        attribution: cartoAttr,
        maxZoom: 20,
        subdomains: 'abcd'
    });

    var usgsTopo = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>',
        maxZoom: 20
    });

    var usgsImagery = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>',
        maxZoom: 20
    });

    humanitarian.addTo(map);

    var baseLayers = {
        'Street Map': streetMap,
        'Humanitarian': humanitarian,
        'Terrain': terrain,
        'Satellite (Esri)': satellite,
        'Esri Street': esriStreet,
        'CartoDB Positron': positron,
        'CartoDB Dark Matter': darkMatter,
        'CartoDB Voyager': voyager,
        'USGS Topo': usgsTopo,
        'USGS Imagery': usgsImagery
    };
    var currentBaseLayer = humanitarian;

    // ──── Map Interaction Policy ────
    if (window.mapInteraction) window.mapInteraction.init(map);

    // ──── Popup Helpers ────
    var el = domHelpers.el, text = domHelpers.text;

    function createPopupElement(photo) {
        var mediaEl;
        if (photo.type === 'video') {
            if (photo.web_url) {
                mediaEl = el('iframe', {className: 'popup-video-iframe', src: photo.web_url, allow: 'autoplay; encrypted-media', allowfullscreen: 'true'});
            } else {
                mediaEl = el('video', {controls: 'true', preload: 'metadata'},
                    el('source', {src: photo.url})
                );
            }
        } else {
            mediaEl = el('img', {
                src: photo.thumbnail,
                alt: photo.caption || 'Photo',
                onerror: function () {
                    this.onerror = null;
                    this.style.background = '#2a2a2e';
                    this.style.minHeight = '120px';
                    this.alt = 'Photo unavailable';
                }
            });
        }

        var _popupCaption = window.cloudData ? window.cloudData.getEffectiveCaption(window.cloudData.getPhotoId(photo), photo.caption) : (photo.caption || '');
        var _popupTags = window.cloudData ? window.cloudData.getEffectiveTags(window.cloudData.getPhotoId(photo), photo.tags) : (photo.tags || []);

        var infoChildren = [];
        if (_popupCaption) {
            infoChildren.push(el('p', {className: 'popup-caption'}, text(_popupCaption)));
        }
        if (photo.date) {
            infoChildren.push(el('p', {className: 'popup-date'}, text(photo.date)));
        }
        if (_popupTags && _popupTags.length > 0) {
            var tagEls = [];
            for (var i = 0; i < _popupTags.length; i++) {
                tagEls.push(el('span', {className: 'popup-tag'}, text(_popupTags[i])));
            }
            var tagsDiv = el('div', {className: 'popup-tags'});
            for (var j = 0; j < tagEls.length; j++) {
                tagsDiv.appendChild(tagEls[j]);
            }
            infoChildren.push(tagsDiv);
        }

        var infoDiv = el('div', {className: 'popup-info'});
        for (var k = 0; k < infoChildren.length; k++) {
            infoDiv.appendChild(infoChildren[k]);
        }

        var popupDiv = el('div', {className: 'photo-popup'}, mediaEl);
        if (photo.google_photos_url) {
            popupDiv.appendChild(el('a', {href: photo.google_photos_url, target: '_blank', rel: 'noopener noreferrer', className: 'photo-link'}, text('View on Google Photos')));
        }
        popupDiv.appendChild(infoDiv);

        return popupDiv;
    }

    function showEmptyState() {
        var el = document.createElement('div');
        el.className = 'empty-state';
        el.innerHTML = '<h2>No Photos Yet</h2><p>Add geotagged photos to the <code>photos/</code> folder<br>and run <code>python scripts/process_photos.py</code></p>';
        document.body.appendChild(el);
    }

    // ──── Photo State ────
    var mainSampler = new ViewportSampler();
    var photoLayer = null;
    var favoritesLayer = null;
    var allPhotos = [];
    var filteredPhotos = [];
    var currentDensityCellSize = 100;
    var currentIconSize = 90;
    var cityClusters = [];
    var photoIndex = {};
    var dateIndex = {}; // { "YYYY-MM-DD": { photos: [], segmentName, segmentColor, segmentIndex } }

    // ──── Favorites Subsystem ────
    var _cloudFavoritesLoaded = false;

    function getFavorites() {
        try { return JSON.parse(localStorage.getItem('photomap_favorites') || '{}'); }
        catch (e) { return {}; }
    }
    function setFavorites(favs) {
        localStorage.setItem('photomap_favorites', JSON.stringify(favs));
    }
    function getFavKey(photo) {
        return photo.url + '|' + photo.lat + '|' + photo.lng;
    }
    function isFavorite(photo) {
        // Cloud path: use Firestore favorites
        if (_cloudFavoritesLoaded && window.cloudData) {
            var pid = window.cloudData.getPhotoId(photo);
            return window.cloudData.isFavoriteById(pid);
        }
        // Fallback: localStorage
        return !!getFavorites()[getFavKey(photo)];
    }
    function toggleFavorite(photo) {
        // Cloud path: use Firestore
        if (_cloudFavoritesLoaded && window.firebaseAuth && window.firebaseAuth.isEditor && window.cloudData) {
            var pid = window.cloudData.getPhotoId(photo);
            var uid = window.firebaseAuth.currentUser.uid;
            window.cloudData.toggleFavorite(uid, pid).then(function () {
                rebuildPhotoLayer();
                buildPhotoIndex();
            });
            return;
        }
        // Fallback: localStorage
        var favs = getFavorites();
        var key = getFavKey(photo);
        if (favs[key]) { delete favs[key]; } else { favs[key] = true; }
        setFavorites(favs);
    }

    // Editor visibility control — photo viewer handles its own editor UI internally
    function updateEditControlsVisibility() {
        // No-op: the new photo viewer module reads firebaseAuth.isEditor
        // directly when rendering info panel content.
    }

    // Old lightbox code removed — replaced by js/photo-viewer.js

    // ── Photo viewer event listeners (T033, T034) ──
    document.addEventListener('photoviewer:favorite', function (evt) {
        var photo = evt.detail.photo;
        toggleFavorite(photo);
        rebuildPhotoLayer();
        buildPhotoIndex();
    });

    document.addEventListener('photoviewer:caption-edit', function (evt) {
        if (window.cloudData) {
            window.cloudData.savePhotoCaption(evt.detail.photoId, evt.detail.caption);
        }
    });

    document.addEventListener('photoviewer:tag-edit', function (evt) {
        if (window.cloudData) {
            window.cloudData.savePhotoTags(evt.detail.photoId, evt.detail.tags);
        }
    });

    // ──── Photo Layer ────
    function buildPhotoIndex() {
        photoIndex = {};
        for (var i = 0; i < filteredPhotos.length; i++) {
            var p = filteredPhotos[i];
            photoIndex[p.url + '|' + p.lat + '|' + p.lng] = i;
        }
    }

    function onPhotoClick(e) {
        var photo = e.layer.photo;
        var key = photo.url + '|' + photo.lat + '|' + photo.lng;
        var index = photoIndex.hasOwnProperty(key) ? photoIndex[key] : -1;
        if (index >= 0) {
            var srcEl = e.layer._icon ? e.layer._icon.querySelector('img') : null;
            window.photoViewer.open(filteredPhotos, index, srcEl);
            // Notify photo wall to expand and scroll to this photo
            if (window.photoWall) {
                document.dispatchEvent(new CustomEvent('photo-wall:target', { detail: { photo: photo } }));
            }
        }
    }

    function rebuildPhotoLayer(photos) {
        var data = photos || filteredPhotos;

        // Stamp _isFavorite on each photo and partition
        var favs = getFavorites();
        var regularPhotos = [];
        var favoritePhotos = [];
        for (var i = 0; i < data.length; i++) {
            var key = getFavKey(data[i]);
            data[i]._isFavorite = !!favs[key];
            if (data[i]._isFavorite) {
                favoritePhotos.push(data[i]);
            } else {
                regularPhotos.push(data[i]);
            }
        }

        // Remove old favorites layer
        if (favoritesLayer) {
            favoritesLayer.off('click', onPhotoClick);
            map.removeLayer(favoritesLayer);
            favoritesLayer = null;
        }

        // Initialize ViewportSampler for regular photos
        mainSampler.setPhotos(regularPhotos);
        if (!photoLayer) {
            mainSampler.init(map, regularPhotos, {
                iconSize: currentIconSize,
                cellSize: currentDensityCellSize,
                onClick: onPhotoClick
            });
            photoLayer = true; // flag that sampler is initialized
        } else {
            mainSampler.update();
        }

        // Favorites: separate non-clustered layer (always visible, fixed tier-0 size)
        if (favoritePhotos.length > 0) {
            favoritesLayer = L.photo(null, {
                icon: { frameSize: 80, stemHeight: 0, tier: 0 }
            });
            favoritesLayer.add(favoritePhotos);
            favoritesLayer.on('click', onPhotoClick);
            favoritesLayer.addTo(map);
        }
    }

    function getFilteredBounds() {
        if (filteredPhotos.length === 0) return null;
        var lats = [], lngs = [];
        for (var i = 0; i < filteredPhotos.length; i++) {
            lats.push(filteredPhotos[i].lat);
            lngs.push(filteredPhotos[i].lng);
        }
        return L.latLngBounds(
            L.latLng(Math.min.apply(null, lats), Math.min.apply(null, lngs)),
            L.latLng(Math.max.apply(null, lats), Math.max.apply(null, lngs))
        );
    }

    // Load annotations (graceful failure if missing)
    fetch('data/annotations.json')
        .then(function (response) {
            if (!response.ok) return [];
            return response.json();
        })
        .then(function (annotations) {
            if (!annotations || annotations.length === 0) return;
            for (var i = 0; i < annotations.length; i++) {
                var ann = annotations[i];
                var icon = L.divIcon({
                    className: 'annotation-marker',
                    html: '<span class="annotation-pin">&#128204;</span>',
                    iconSize: [28, 28],
                    iconAnchor: [14, 28]
                });
                var marker = L.marker([ann.lat, ann.lng], { icon: icon });
                var popup = el('div', {className: 'annotation-popup'},
                    ann.title ? el('strong', null, text(ann.title)) : null,
                    ann.date ? el('br', null) : null,
                    ann.date ? el('span', {className: 'annotation-date'}, text(ann.date)) : null,
                    ann.text ? el('p', null, text(ann.text)) : null
                );
                marker.bindPopup(popup);
                marker.addTo(map);
            }
        })
        .catch(function () {
            // annotations.json missing is fine
        });

    // ──── Trip Segments ────
    var travelRouteLayer = null;

    var tripSegments = [];

    var formatDateShort = domHelpers.formatDateShort;

    // ──── Init Sequence ────
    Promise.all([
        fetch('data/trip_segments.json').then(function (r) { return r.ok ? r.json() : []; }),
        fetch('data/manifest.json').then(function (r) { if (!r.ok) throw new Error('Failed to load manifest'); return r.json(); }),
        fetch('data/itinerary.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ])
        .then(function (results) {
            tripSegments = results[0] || [];
            var photos = results[1];
            var itineraryData = results[2];

            if (!photos || photos.length === 0) {
                showEmptyState();
                return;
            }

            allPhotos = photos;
            window.TripModel.init(itineraryData, allPhotos, tripSegments);
            cityClusters = window.TripModel.getClusters();
            dateIndex = window.TripModel.getDateIndex();

            filteredPhotos = allPhotos;
            rebuildPhotoLayer();
            buildPhotoIndex();

            // Initialize feed controller
            window.feedController.init({
                map: map,
                dateIndex: dateIndex,
                getFilteredPhotos: function () { return filteredPhotos; },
                getPhotoIndex: function () { return photoIndex; },
                formatDateShort: formatDateShort
            });
            window.feedController.buildFeed();

            var feedSidebar = document.getElementById('feed-sidebar');
            var feedToggle = document.getElementById('feed-toggle');
            var landingPageEl = document.getElementById('landing-page');
            var landingActive = landingPageEl && landingPageEl.style.display !== 'none';

            if (landingActive) {
                // Keep sidebar and photo wall hidden until landing page is dismissed
                feedSidebar.classList.add('hidden');
                feedToggle.style.display = 'none';
                var wallPanel = document.getElementById('photo-wall-panel');
                if (wallPanel) wallPanel.style.visibility = 'hidden';
                var reopenBtn = document.getElementById('photo-wall-reopen-btn');
                if (reopenBtn) reopenBtn.style.visibility = 'hidden';
            } else {
                feedToggle.style.display = '';
                feedSidebar.classList.remove('hidden');
                feedToggle.style.display = 'none'; // hidden while feed is open
            }
            // On mobile, start in collapsed state
            if (window.innerWidth <= 768) {
                }

            // Draw intercity travel route using photo geotags
            travelRouteLayer = buildSmartRoutes(allPhotos, tripSegments, map);
            if (travelRouteLayer) travelRouteLayer.addTo(map);
            // Initialize photo wall
            if (window.PhotoWall) {
                var wallContainer = document.getElementById('photo-wall-panel');
                if (wallContainer) {
                    window.photoWall = new window.PhotoWall({
                        container: wallContainer,
                        photos: allPhotos,
                        segments: tripSegments
                    });

                    // Handle photo-wall clicks: open viewer + pan map
                    document.addEventListener('photo-wall:photo-clicked', function (e) {
                        var d = e.detail;
                        if (window.photoViewer) {
                            window.photoViewer.open(d.sectionPhotos, d.indexInSection, d.srcElement);
                        }
                        if (d.photo && d.photo.lat && d.photo.lng) {
                            map.panTo([d.photo.lat, d.photo.lng]);
                        }
                    });

                    // Relayout on window resize (debounced 200ms)
                    var _wallResizeTimer = null;
                    window.addEventListener('resize', function () {
                        if (_wallResizeTimer) clearTimeout(_wallResizeTimer);
                        _wallResizeTimer = setTimeout(function () {
                            if (window.photoWall) window.photoWall.relayout();
                        }, 200);
                    });
                }
            }

            // Initialize region navigation
            if (window.initRegionNav) {
                window.initRegionNav({
                    map: map,
                    allPhotos: allPhotos,
                    tripSegments: tripSegments,
                    itineraryData: itineraryData,
                    gridEl: document.getElementById('region-grid'),
                    itineraryEl: document.getElementById('itinerary-panel'),
                    feedEntries: document.getElementById('feed-entries'),
                    toggleBtn: document.getElementById('region-toggle'),
                    rebuildPhotoLayer: rebuildPhotoLayer,
                    buildSmartRoutes: buildSmartRoutes,
                    photoWall: window.photoWall,
                    travelRouteLayerRef: { layer: travelRouteLayer },
                    filteredPhotos: filteredPhotos
                });
            }

            // Initialize landing page
            if (window.initLandingPage && landingActive) {
                window.initLandingPage({
                    itineraryData: itineraryData,
                    allPhotos: allPhotos,
                    tripSegments: tripSegments,
                    map: map,
                    onEnterMap: function (opts) {
                        // Show feed sidebar and photo wall
                        var fs = document.getElementById('feed-sidebar');
                        var ft = document.getElementById('feed-toggle');
                        if (fs) fs.classList.remove('hidden');
                        if (ft) ft.style.display = 'none';
                        var wallPanel = document.getElementById('photo-wall-panel');
                        if (wallPanel) wallPanel.style.visibility = '';
                        var reopenBtn = document.getElementById('photo-wall-reopen-btn');
                        if (reopenBtn) reopenBtn.style.visibility = '';
                        // Invalidate map size after landing page hides
                        setTimeout(function () {
                            map.invalidateSize();
                            if (opts && opts.viewport) {
                                // Use detail map's current viewport (escalation)
                                map.setView(opts.viewport.center, opts.viewport.zoom);
                            } else if (opts && opts.region) {
                                // Fly to the selected region
                                var zoomLevel = opts.region.jsonRegions && opts.region.jsonRegions.length > 1 ? 7 : 10;
                                map.flyTo([opts.region.center.lat, opts.region.center.lng], zoomLevel, { duration: 0.8 });
                            }
                        }, 100);
                        // Update view nav state
                        if (window.viewNav) window.viewNav.setView('map');
                    }
                });
            }

            // Initialize view nav buttons
            if (window.viewNav) {
                window.viewNav.init();
                // Wire region-intro button to reopen landing
                var regionIntroBtn = document.getElementById('region-intro-toggle-btn');
                if (regionIntroBtn) {
                    regionIntroBtn.addEventListener('click', function () {
                        if (window.reopenLanding) window.reopenLanding();
                    });
                }
            }

            // Initialize control panel
            window.controlPanel.init({
                map: map,
                baseLayers: baseLayers,
                currentBaseLayer: currentBaseLayer,
                travelRouteLayer: travelRouteLayer,
                allPhotos: allPhotos,
                feedSidebar: feedSidebar,
                feedToggle: feedToggle,
                setCloudFavoritesLoaded: function (val) { _cloudFavoritesLoaded = val; },
                rebuildPhotoLayer: rebuildPhotoLayer,
                buildPhotoIndex: buildPhotoIndex,
                initialDensityCellSize: currentDensityCellSize,
                initialIconSize: currentIconSize,
                onDensityChange: function (cellSize) {
                    currentDensityCellSize = cellSize;
                    mainSampler.setCellSize(cellSize);
                },
                onSizeChange: function (iconSize) {
                    currentIconSize = iconSize;
                    mainSampler.updateIconSize(iconSize);
                    if (filteredPhotos.length > 0) rebuildPhotoLayer();
                }
            });

            // Pending-writes indicator
            window.addEventListener('pending-writes-changed', function () {
                window.controlPanel.updatePendingIndicator();
            });

            try {
                var initBounds = getFilteredBounds();
                if (initBounds) map.fitBounds(initBounds, { padding: [50, 50] });
            } catch (e) {
                // getBounds can fail if all markers are at the same point
            }

            // Wire viewport sampler to map movement
            map.on('moveend', function () {
                mainSampler.update();
            });
        })
        .catch(function (err) {
            console.error('Error loading photo manifest:', err);
            showEmptyState();
        });

    // ──── Firebase Integration ────
    // Re-initialize Firebase-dependent features when Firebase is ready.
    // The main app above works without Firebase (graceful degradation).
    window.addEventListener('firebase-ready', function () {
        // Load cloud photo edits (tags/captions) as soon as Firebase is ready.
        // This runs for all visitors (edits are publicly readable).
        if (window.cloudData) {
            window.cloudData.loadPhotoEdits().then(function () {
                // Popups and photo viewer will use effective values on next open.
            });
            // Load daily narratives and render them in feed entries
            window.cloudData.loadDailyNarratives().then(function () {
                window.dispatchEvent(new CustomEvent('narratives-loaded'));
            });
        }
    });
})();
