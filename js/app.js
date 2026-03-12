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

    // ──── Popup Helpers ────
    function buildPopupHTML(photo) {
        var html = '<div class="photo-popup">';
        if (photo.type === 'video') {
            if (photo.web_url) {
                html += '<iframe class="popup-video-iframe" src="' + photo.web_url + '" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
            } else {
                html += '<video controls preload="metadata"><source src="' + photo.url + '"></video>';
            }
        } else {
            html += '<img src="' + photo.thumbnail + '" alt="' + (photo.caption || 'Photo') + '" onerror="this.onerror=null;this.style.background=\'#2a2a2e\';this.style.minHeight=\'120px\';this.alt=\'Photo unavailable\'">';
        }
        if (photo.google_photos_url) {
            html += '<a href="' + photo.google_photos_url + '" target="_blank" rel="noopener noreferrer" class="photo-link">View on Google Photos</a>';
        }
        html += '<div class="popup-info">';
        var _popupCaption = window.cloudData ? window.cloudData.getEffectiveCaption(window.cloudData.getPhotoId(photo), photo.caption) : (photo.caption || '');
        if (_popupCaption) {
            html += '<p class="popup-caption">' + _popupCaption + '</p>';
        }
        if (photo.date) {
            html += '<p class="popup-date">' + photo.date + '</p>';
        }
        var _popupTags = window.cloudData ? window.cloudData.getEffectiveTags(window.cloudData.getPhotoId(photo), photo.tags) : (photo.tags || []);
        if (_popupTags && _popupTags.length > 0) {
            html += '<div class="popup-tags">';
            for (var i = 0; i < _popupTags.length; i++) {
                html += '<span class="popup-tag">' + _popupTags[i] + '</span>';
            }
            html += '</div>';
        }
        html += '</div></div>';
        return html;
    }

    function showEmptyState() {
        var el = document.createElement('div');
        el.className = 'empty-state';
        el.innerHTML = '<h2>No Photos Yet</h2><p>Add geotagged photos to the <code>photos/</code> folder<br>and run <code>python scripts/process_photos.py</code></p>';
        document.body.appendChild(el);
    }

    // ──── Photo State ────
    var photoLayer = null;
    var favoritesLayer = null;
    var allPhotos = [];
    var filteredPhotos = [];
    var currentDensityCellSize = 150;
    var currentIconSize = 90;
    var cityClusters = [];
    var photoIndex = {};
    var dateIndex = {}; // { "YYYY-MM-DD": { photos: [], segmentName, segmentColor, segmentIndex } }

    // ──── Timeline State (hoisted from Promise.all callback) ────
    var uniqueDates = [];
    var boundaryMarkers = [];
    var timelineSegments = [];
    var handleMin, handleMax, dateStartLabel, dateEndLabel;
    var _filterTimeout = null;

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
        ViewportSampler.setPhotos(regularPhotos);
        if (!photoLayer) {
            ViewportSampler.init(map, regularPhotos, {
                iconSize: currentIconSize,
                cellSize: currentDensityCellSize,
                onClick: onPhotoClick
            });
            photoLayer = true; // flag that sampler is initialized
        } else {
            ViewportSampler.update();
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
                var popupHTML = '<div class="annotation-popup">';
                if (ann.title) popupHTML += '<strong>' + ann.title + '</strong>';
                if (ann.date) popupHTML += '<br><span class="annotation-date">' + ann.date + '</span>';
                if (ann.text) popupHTML += '<p>' + ann.text + '</p>';
                popupHTML += '</div>';
                marker.bindPopup(popupHTML);
                marker.addTo(map);
            }
        })
        .catch(function () {
            // annotations.json missing is fine
        });

    // ──── Trip Segments ────
    var travelRouteLayer = null;

    var tripSegments = [];

    function formatDateShort(isoDate) {
        if (!isoDate) return '';
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var parts = isoDate.split('-');
        if (parts.length < 3) return isoDate;
        return months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10);
    }

    // ──── Feed Sidebar ────
    var feedSidebar = document.getElementById('feed-sidebar');
    var feedToggle = document.getElementById('feed-toggle');
    var feedClose = document.getElementById('feed-close');
    var feedEntries = document.getElementById('feed-entries');
    var activeFeedDate = null;

    // Prevent map interaction behind feed sidebar
    L.DomEvent.disableClickPropagation(feedSidebar);
    L.DomEvent.disableScrollPropagation(feedSidebar);
    if (feedToggle) L.DomEvent.disableClickPropagation(feedToggle);

    // Prevent wheel events from reaching map
    feedSidebar.addEventListener('wheel', function (e) { e.stopPropagation(); }, { passive: false });

    // Wire PanelSnap for feed sidebar (replaces old touch handlers)
    var feedPanelSnap = new window.PanelSnap({
        panelEl: feedSidebar,
        handleEl: feedSidebar.querySelector('.feed-drag-handle'),
        collapseBtn: feedClose,
        statePrefix: 'feed-sidebar',
        onStateChange: function (state) {
            document.dispatchEvent(new CustomEvent('trip-feed:state-changed', {
                detail: { state: state }
            }));
            if (state !== 'hidden') {
                document.dispatchEvent(new CustomEvent('panel:activate', {
                    detail: { panel: 'trip-feed' }
                }));
            } else {
                document.dispatchEvent(new CustomEvent('panel:deactivate', {
                    detail: { panel: 'trip-feed' }
                }));
            }
        }
    });

    // Register with panel coordinator
    var feedToggleBtn = document.getElementById('trip-feed-toggle-btn');
    if (window.panelCoordinator) {
        window.panelCoordinator.register('trip-feed', feedPanelSnap, feedToggleBtn);
    }

    // Wire toggle buttons to coordinator
    if (feedToggleBtn) {
        feedToggleBtn.addEventListener('click', function () {
            document.dispatchEvent(new CustomEvent('panel:activate', {
                detail: { panel: 'trip-feed' }
            }));
        });
    }

    // Desktop: old feed toggle button still works
    if (feedToggle) {
        feedToggle.addEventListener('click', function () {
            if (window.innerWidth > 768) {
                var isHidden = feedSidebar.classList.toggle('hidden');
                feedToggle.style.display = isHidden ? '' : 'none';
            } else {
                document.dispatchEvent(new CustomEvent('panel:activate', {
                    detail: { panel: 'trip-feed' }
                }));
            }
        });
    }

    // Default state on mobile: Trip Feed starts hidden
    if (window.innerWidth <= 768) {
        feedSidebar.classList.remove('hidden');
        feedPanelSnap.snapTo('hidden');
        if (feedToggleBtn) feedToggleBtn.classList.add('visible');
    }

    function buildFeed() {
        var keys = Object.keys(dateIndex).sort();
        var html = '';
        for (var i = 0; i < keys.length; i++) {
            var date = keys[i];
            var entry = dateIndex[date];
            var photos = entry.photos;
            var maxThumbs = 6;
            var remaining = photos.length - maxThumbs;

            html += '<div class="feed-entry" data-date="' + date + '" style="--entry-color:' + entry.segmentColor + '">';
            html += '<div class="feed-entry-header">';
            html += '<span class="feed-entry-date">' + formatDateShort(date) + '</span>';
            html += '<span class="feed-entry-city" style="color:' + entry.segmentColor + '">' + entry.segmentName + '</span>';
            html += '</div>';

            // Narrative text placeholder (will be populated by US3)
            html += '<div class="feed-narrative-slot" data-date="' + date + '"></div>';

            html += '<div class="feed-thumbnails">';
            for (var t = 0; t < Math.min(photos.length, maxThumbs); t++) {
                var photo = photos[t];
                html += '<img class="feed-thumbnail" src="' + photo.thumbnail + '" alt="" data-photo-url="' + photo.url + '" data-photo-lat="' + photo.lat + '" data-photo-lng="' + photo.lng + '" onload="this.classList.add(\'loaded\')">';
            }
            if (remaining > 0) {
                html += '<span class="feed-more-indicator">+' + remaining + '</span>';
            }
            html += '</div>'; // .feed-thumbnails
            html += '</div>'; // .feed-entry
        }
        feedEntries.innerHTML = html;

        // Wire entry click handlers (fly to map)
        var entryEls = feedEntries.querySelectorAll('.feed-entry');
        for (var e = 0; e < entryEls.length; e++) {
            entryEls[e].addEventListener('click', onFeedEntryClick);
        }

        // Wire thumbnail click handlers (open photo viewer)
        var thumbEls = feedEntries.querySelectorAll('.feed-thumbnail');
        for (var th = 0; th < thumbEls.length; th++) {
            thumbEls[th].addEventListener('click', onFeedThumbnailClick);
        }
    }

    function onFeedEntryClick(evt) {
        // Don't handle if clicking on a thumbnail, narrative editor, or add-note
        if (evt.target.classList.contains('feed-thumbnail') ||
            evt.target.classList.contains('feed-narrative-editor') ||
            evt.target.classList.contains('feed-add-note')) return;

        var entryEl = evt.currentTarget;
        var date = entryEl.getAttribute('data-date');
        if (!date || !dateIndex[date]) return;

        // Highlight active entry
        var prev = feedEntries.querySelector('.feed-entry.active');
        if (prev) prev.classList.remove('active');
        entryEl.classList.add('active');
        activeFeedDate = date;

        // Compute bounds from photos and fly
        var photos = dateIndex[date].photos;
        var lats = [], lngs = [];
        for (var i = 0; i < photos.length; i++) {
            if (photos[i].lat && photos[i].lng) {
                lats.push(photos[i].lat);
                lngs.push(photos[i].lng);
            }
        }
        if (lats.length === 0) return;

        var sw, ne;
        if (lats.length === 1) {
            // Single photo: create artificial bounds
            sw = L.latLng(lats[0] - 0.005, lngs[0] - 0.005);
            ne = L.latLng(lats[0] + 0.005, lngs[0] + 0.005);
        } else {
            sw = L.latLng(Math.min.apply(null, lats), Math.min.apply(null, lngs));
            ne = L.latLng(Math.max.apply(null, lats), Math.max.apply(null, lngs));
        }
        var bounds = L.latLngBounds(sw, ne);

        // Asymmetric padding: account for left panel (310px) and right feed (290px)
        var panelVisible = document.querySelector('.control-panel') && !document.querySelector('.control-panel').classList.contains('hidden');
        var feedVisible = !feedSidebar.classList.contains('hidden');
        var padLeft = panelVisible ? 320 : 20;
        var padRight = feedVisible ? 300 : 20;

        // On mobile, use simpler padding
        if (window.innerWidth <= 768) {
            padLeft = 20;
            padRight = 20;
            // Auto-snap to half on entry tap
            if (feedPanelSnap.currentState === 'full') {
                feedPanelSnap.snapTo('half');
            }
        }

        map.flyToBounds(bounds, {
            paddingTopLeft: [padLeft, 20],
            paddingBottomRight: [padRight, 20],
            duration: 0.8,
            maxZoom: 15
        });

        // Notify photo wall to scroll to this date
        if (window.photoWall) {
            document.dispatchEvent(new CustomEvent('photo-wall:target-date', { detail: { date: date } }));
        }
    }

    function onFeedThumbnailClick(evt) {
        evt.stopPropagation();
        var url = evt.target.getAttribute('data-photo-url');
        var lat = evt.target.getAttribute('data-photo-lat');
        var lng = evt.target.getAttribute('data-photo-lng');
        if (!url) return;

        // Context-aware: navigate within that day's photos
        var entryEl = evt.target.closest('.feed-entry');
        var date = entryEl ? entryEl.getAttribute('data-date') : null;
        if (date && dateIndex[date]) {
            var dayPhotos = dateIndex[date].photos;
            var dayIdx = -1;
            for (var i = 0; i < dayPhotos.length; i++) {
                if (dayPhotos[i].url === url) { dayIdx = i; break; }
            }
            if (dayIdx >= 0) {
                window.photoViewer.open(dayPhotos, dayIdx, evt.target);
                return;
            }
        }
        // Fallback: open in full filteredPhotos set
        var key = url + '|' + lat + '|' + lng;
        var idx = photoIndex.hasOwnProperty(key) ? photoIndex[key] : -1;
        if (idx >= 0) {
            window.photoViewer.open(filteredPhotos, idx, evt.target);
        }
    }

    function updateFeedForTimeline(minDate, maxDate) {
        var entries = feedEntries.querySelectorAll('.feed-entry');
        for (var i = 0; i < entries.length; i++) {
            var d = entries[i].getAttribute('data-date');
            entries[i].style.display = (d >= minDate && d <= maxDate) ? '' : 'none';
        }
    }

    // Old touch handlers removed — PanelSnap handles drag gestures via Pointer Events

    // ──── Feed Narratives ────
    function renderFeedNarratives() {
        var slots = feedEntries.querySelectorAll('.feed-narrative-slot');
        var isEditor = !!(window.firebaseAuth && window.firebaseAuth.isEditor);
        for (var i = 0; i < slots.length; i++) {
            var date = slots[i].getAttribute('data-date');
            var text = window.cloudData ? window.cloudData.getDailyNarrative(date) : '';
            var html = '';
            if (text) {
                html = '<p class="feed-narrative"' + (isEditor ? ' data-date="' + date + '"' : '') + '>' + _escapeHtml(text) + '</p>';
            } else if (isEditor) {
                html = '<span class="feed-add-note" data-date="' + date + '">Add note...</span>';
            }
            slots[i].innerHTML = html;
        }
        // Wire narrative click events
        _wireNarrativeEditing();
    }

    function _escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function _wireNarrativeEditing() {
        var isEditor = !!(window.firebaseAuth && window.firebaseAuth.isEditor);
        if (!isEditor) return;

        // Wire "Add note..." prompts
        var addNotes = feedEntries.querySelectorAll('.feed-add-note');
        for (var a = 0; a < addNotes.length; a++) {
            addNotes[a].addEventListener('click', _onNarrativeEditStart);
        }
        // Wire existing narrative text for editing
        var narratives = feedEntries.querySelectorAll('.feed-narrative[data-date]');
        for (var n = 0; n < narratives.length; n++) {
            narratives[n].style.cursor = 'pointer';
            narratives[n].addEventListener('click', _onNarrativeEditStart);
        }
    }

    function _onNarrativeEditStart(evt) {
        evt.stopPropagation();
        var date = evt.target.getAttribute('data-date');
        if (!date) return;
        var currentText = window.cloudData ? window.cloudData.getDailyNarrative(date) : '';
        var slot = feedEntries.querySelector('.feed-narrative-slot[data-date="' + date + '"]');
        if (!slot) return;

        var textarea = document.createElement('textarea');
        textarea.className = 'feed-narrative-editor';
        textarea.value = currentText;
        textarea.setAttribute('data-date', date);
        textarea.placeholder = 'Write about this day...';
        slot.innerHTML = '';
        slot.appendChild(textarea);
        textarea.focus();

        textarea.addEventListener('blur', function () {
            _saveNarrativeAndRender(this);
        });
        textarea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.blur();
            }
        });
        textarea.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    }

    function _saveNarrativeAndRender(textarea) {
        var date = textarea.getAttribute('data-date');
        var text = textarea.value.trim();
        if (window.cloudData) {
            window.cloudData.saveDailyNarrative(date, text);
        }
        renderFeedNarratives();
    }

    // Listen for narratives loaded and auth changes to refresh narrative display
    window.addEventListener('narratives-loaded', function () {
        renderFeedNarratives();
    });
    window.addEventListener('auth-state-changed', function () {
        // Re-render narratives to show/hide edit controls
        if (window.cloudData) {
            renderFeedNarratives();
        }
    });

    // ──── Control Panel (hoisted from Promise.all callback) ────
    function buildControlPanel() {
        var totalDates = uniqueDates.length || 1;

        // Build timeline track segments HTML (dot + conditional label + tooltip)
        var segmentsHtml = '';
        for (var s = 0; s < timelineSegments.length; s++) {
            var seg = timelineSegments[s];
            var leftPct = (seg.startIdx / totalDates * 100).toFixed(2);
            var widthPct = (seg.count / totalDates * 100).toFixed(2);
            var showInline = parseFloat(widthPct) >= 12 || s === 0 || s === timelineSegments.length - 1;
            var labelPos = (s % 2 === 0) ? 'label-top' : 'label-bottom';
            segmentsHtml += '<div class="timeline-segment ' + labelPos + '" data-city="' + seg.cityName + '" style="--seg-offset:' + leftPct + '%;--seg-size:' + widthPct + '%;background:' + seg.color + '">' +
                '<span class="segment-dot"></span>' +
                (showInline ? '<span class="segment-label-inline">' + seg.cityName + '</span>' : '') +
                '<span class="segment-tooltip">' + seg.cityName + '</span></div>';
        }

        // Build boundary markers HTML
        var boundaryHtml = '';
        for (var bm = 0; bm < boundaryMarkers.length; bm++) {
            var marker = boundaryMarkers[bm];
            var pos = (marker.index / totalDates * 100).toFixed(2);
            if (marker.type === 'month') {
                boundaryHtml += '<div class="timeline-boundary timeline-boundary-month" style="--boundary-pos:' + pos + '%"><span class="boundary-label">' + marker.label + '</span></div>';
            } else {
                boundaryHtml += '<div class="timeline-boundary timeline-boundary-week" style="--boundary-pos:' + pos + '%"></div>';
            }
        }

        var maxIdx = uniqueDates.length > 0 ? uniqueDates.length - 1 : 0;
        var startLabel = uniqueDates.length > 0 ? formatDateShort(uniqueDates[0]) : '';
        var endLabel = uniqueDates.length > 0 ? formatDateShort(uniqueDates[maxIdx]) : '';

        // Build layer radio buttons HTML
        var layerNames = Object.keys(baseLayers);
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
                        '<div class="timeline-photo-count"><span class="photo-count-number">' + allPhotos.length + '</span> / ' + allPhotos.length + ' photos</div>' +
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
                if (!feedSidebar.classList.contains('hidden')) {
                    feedSidebar.classList.add('hidden');
                    feedToggle.style.display = '';
                }
            }
        }
        toggleBtn.addEventListener('click', togglePanel);
        panel.querySelector('.panel-close').addEventListener('click', togglePanel);

        // Wire base layer switching
        var radios = panel.querySelectorAll('input[name="base-layer"]');
        for (var r = 0; r < radios.length; r++) {
            radios[r].addEventListener('change', function () {
                map.removeLayer(currentBaseLayer);
                currentBaseLayer = baseLayers[this.value];
                currentBaseLayer.addTo(map);
            });
        }

        // Wire travel route toggle
        var routeToggle = panel.querySelector('#travel-route-toggle');
        if (routeToggle) {
            routeToggle.addEventListener('change', function () {
                if (this.checked) {
                    if (travelRouteLayer) travelRouteLayer.addTo(map);
                } else {
                    if (travelRouteLayer) map.removeLayer(travelRouteLayer);
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
                    // Migrate localStorage favorites on first sign-in
                    if (localStorage.getItem('photomap_favorites')) {
                        window.cloudData.migrateFavorites(user.uid, allPhotos).then(function () {
                            _cloudFavoritesLoaded = true;
                            rebuildPhotoLayer();
                            buildPhotoIndex();
                        });
                    } else {
                        window.cloudData.loadFavorites(user.uid).then(function () {
                            _cloudFavoritesLoaded = true;
                            rebuildPhotoLayer();
                            buildPhotoIndex();
                        });
                    }
                }
            } else {
                signInBtn.style.display = '';
                authUserInfo.style.display = 'none';
                _cloudFavoritesLoaded = false;
                rebuildPhotoLayer();
            }

            // Gate favorite star visibility based on editor status
            updateEditControlsVisibility();
        });
    }

    // ──── Timeline & Settings (hoisted from Promise.all callback) ────
    function _updatePendingIndicator() {
        var el = document.getElementById('pending-writes-indicator');
        if (!el) return;
        var count = window.cloudData ? window.cloudData.getPendingWritesCount() : 0;
        el.style.display = count > 0 ? '' : 'none';
        el.title = count + ' change' + (count !== 1 ? 's' : '') + ' pending sync';
    }

    function scheduleFilterUpdate() {
        if (_filterTimeout) clearTimeout(_filterTimeout);
        _filterTimeout = setTimeout(applyTimelineFilter, 150);
    }

    function updatePhotoCount(count) {
        var el = document.querySelector('.timeline-photo-count');
        if (el) {
            el.innerHTML = '<span class="photo-count-number">' + count + '</span> / ' + allPhotos.length + ' photos';
        }
    }

    // Cheap visual update on every input event
    function onTimelineVisualUpdate() {
        var minIdx = parseInt(handleMin.value, 10);
        var maxIdx = parseInt(handleMax.value, 10);
        if (minIdx > maxIdx) {
            if (this === handleMin) { handleMin.value = maxIdx; minIdx = maxIdx; }
            else { handleMax.value = minIdx; maxIdx = minIdx; }
        }

        dateStartLabel.textContent = formatDateShort(uniqueDates[minIdx]);
        dateEndLabel.textContent = formatDateShort(uniqueDates[maxIdx]);

        // Update range fill indicator
        var totalDates = uniqueDates.length || 1;
        var rangeFill = document.querySelector('.timeline-range-fill');
        if (rangeFill) {
            rangeFill.style.setProperty('--range-start', (minIdx / totalDates * 100) + '%');
            rangeFill.style.setProperty('--range-size', ((maxIdx - minIdx + 1) / totalDates * 100) + '%');
        }

        // Quick photo count (no array allocation)
        var minDate = uniqueDates[minIdx];
        var maxDate = uniqueDates[maxIdx];
        var count = 0;
        for (var f = 0; f < allPhotos.length; f++) {
            var pd = allPhotos[f].date || '';
            if (pd >= minDate && pd <= maxDate) count++;
        }
        updatePhotoCount(count);

        scheduleFilterUpdate();
    }

    // Expensive filter + rebuild (debounced at 150ms)
    function applyTimelineFilter() {
        var minIdx = parseInt(handleMin.value, 10);
        var maxIdx = parseInt(handleMax.value, 10);
        var minDate = uniqueDates[minIdx];
        var maxDate = uniqueDates[maxIdx];

        filteredPhotos = [];
        for (var f = 0; f < allPhotos.length; f++) {
            var pd = allPhotos[f].date || '';
            if (pd >= minDate && pd <= maxDate) {
                filteredPhotos.push(allPhotos[f]);
            }
        }

        rebuildPhotoLayer();
        buildPhotoIndex();

        // Update feed to show only entries in the filtered date range
        updateFeedForTimeline(minDate, maxDate);
    }

    function onTimelineRelease() {
        // Flush any pending debounced filter
        if (_filterTimeout) {
            clearTimeout(_filterTimeout);
            _filterTimeout = null;
            applyTimelineFilter();
        }
        try {
            var bounds = getFilteredBounds();
            if (bounds) map.flyToBounds(bounds, { padding: [50, 50], duration: 0.8, maxZoom: 14 });
        } catch (e) {}
    }

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

            // Build the feed sidebar (hidden initially if landing page active)
            buildFeed();
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
                    feedEntries: feedEntries,
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
                        feedSidebar.classList.remove('hidden');
                        feedToggle.style.display = 'none';
                        var wallPanel = document.getElementById('photo-wall-panel');
                        if (wallPanel) wallPanel.style.visibility = '';
                        var reopenBtn = document.getElementById('photo-wall-reopen-btn');
                        if (reopenBtn) reopenBtn.style.visibility = '';
                        // Invalidate map size after landing page hides
                        setTimeout(function () {
                            map.invalidateSize();
                            if (opts && opts.region) {
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

            // Build unique sorted dates
            var dateSet = {};
            for (var i = 0; i < allPhotos.length; i++) {
                if (allPhotos[i].date) dateSet[allPhotos[i].date] = true;
            }
            uniqueDates = Object.keys(dateSet).sort();

            // Calculate week/month boundary markers
            var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            boundaryMarkers = [];
            for (var bi = 0; bi < uniqueDates.length; bi++) {
                var bd = new Date(uniqueDates[bi] + 'T12:00:00');
                if (bd.getDate() === 1) {
                    boundaryMarkers.push({ index: bi, type: 'month', label: monthNames[bd.getMonth()] });
                } else if (bd.getDay() === 1) {
                    boundaryMarkers.push({ index: bi, type: 'week', label: '' });
                }
            }

            // Build timeline segments directly from trip segments
            // Map each date to a segment based on segment boundaries
            var dateSegmentMap = {};
            for (var di = 0; di < uniqueDates.length; di++) {
                var dStr = uniqueDates[di];
                var dateTime = new Date(dStr + 'T12:00:00'); // Use noon for date-only comparison
                var bestSeg = -1;
                for (var si = 0; si < tripSegments.length; si++) {
                    var segStart = new Date(tripSegments[si].start);
                    var segEnd = new Date(tripSegments[si].end);
                    if (dateTime >= segStart && dateTime < segEnd) {
                        bestSeg = si;
                        break;
                    }
                }
                dateSegmentMap[dStr] = bestSeg >= 0 ? bestSeg : 0;
            }

            // Build contiguous runs for timeline segments
            timelineSegments = [];
            if (uniqueDates.length > 0) {
                var runStart = 0;
                var runSegment = dateSegmentMap[uniqueDates[0]];
                for (var ri = 1; ri <= uniqueDates.length; ri++) {
                    var curSegment = ri < uniqueDates.length ? dateSegmentMap[uniqueDates[ri]] : -1;
                    if (curSegment !== runSegment) {
                        var seg = tripSegments[runSegment] || {};
                        timelineSegments.push({
                            clusterIndex: runSegment,
                            startIdx: runStart,
                            count: ri - runStart,
                            color: seg.color || '#999',
                            cityName: seg.name || 'Unknown'
                        });
                        runStart = ri;
                        runSegment = curSegment;
                    }
                }
            }

            // Build control panel
            buildControlPanel();

            // Pending-writes indicator
            window.addEventListener('pending-writes-changed', _updatePendingIndicator);

            // Timeline slider handlers
            handleMin = document.querySelector('.timeline-handle-min');
            handleMax = document.querySelector('.timeline-handle-max');
            dateStartLabel = document.querySelector('.timeline-date-start');
            dateEndLabel = document.querySelector('.timeline-date-end');

            if (handleMin && handleMax) {
                handleMin.addEventListener('input', onTimelineVisualUpdate);
                handleMax.addEventListener('input', onTimelineVisualUpdate);
                handleMin.addEventListener('change', onTimelineRelease);
                handleMax.addEventListener('change', onTimelineRelease);
            }

            // Settings slider handlers (debounced)
            var _densityTimeout = null;
            var _sizeTimeout = null;

            document.getElementById('density-slider').addEventListener('input', function () {
                currentDensityCellSize = parseInt(this.value, 10);
                if (_densityTimeout) clearTimeout(_densityTimeout);
                _densityTimeout = setTimeout(function () {
                    ViewportSampler.setCellSize(currentDensityCellSize);
                }, 100);
            });

            document.getElementById('size-slider').addEventListener('input', function () {
                currentIconSize = parseInt(this.value, 10);
                document.getElementById('size-val').textContent = currentIconSize + 'px';
                if (_sizeTimeout) clearTimeout(_sizeTimeout);
                _sizeTimeout = setTimeout(function () {
                    ViewportSampler.updateIconSize(currentIconSize);
                    // Also update favorites layer
                    if (filteredPhotos.length > 0) rebuildPhotoLayer();
                }, 100);
            });

            try {
                var initBounds = getFilteredBounds();
                if (initBounds) map.fitBounds(initBounds, { padding: [50, 50] });
            } catch (e) {
                // getBounds can fail if all markers are at the same point
            }

            // Wire viewport sampler to map movement
            map.on('moveend', function () {
                ViewportSampler.update();
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
