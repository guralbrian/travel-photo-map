(function () {
    'use strict';

    var el = domHelpers.el, text = domHelpers.text;

    // Module state (initialized via init)
    var _map = null;
    var _dateIndex = null;
    var _getFilteredPhotos = null;
    var _getPhotoIndex = null;
    var _formatDateShort = null;

    // DOM refs
    var feedSidebar = null;
    var feedToggle = null;
    var feedClose = null;
    var feedEntries = null;
    var activeFeedDate = null;
    var feedPanelSnap = null;

    function init(opts) {
        _map = opts.map;
        _dateIndex = opts.dateIndex;
        _getFilteredPhotos = opts.getFilteredPhotos;
        _getPhotoIndex = opts.getPhotoIndex;
        _formatDateShort = opts.formatDateShort;

        // Acquire DOM refs
        feedSidebar = document.getElementById('feed-sidebar');
        feedToggle = document.getElementById('feed-toggle');
        feedClose = document.getElementById('feed-close');
        feedEntries = document.getElementById('feed-entries');
        activeFeedDate = null;

        // Prevent map interaction behind feed sidebar
        L.DomEvent.disableClickPropagation(feedSidebar);
        L.DomEvent.disableScrollPropagation(feedSidebar);
        if (feedToggle) L.DomEvent.disableClickPropagation(feedToggle);

        // Prevent wheel events from reaching map
        feedSidebar.addEventListener('wheel', function (e) { e.stopPropagation(); }, { passive: false });

        // Wire PanelSnap for feed sidebar
        feedPanelSnap = new window.PanelSnap({
            panelEl: feedSidebar,
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

        // Manual close button handler (works on both desktop and mobile)
        if (feedClose) {
            feedClose.addEventListener('click', function () {
                if (window.innerWidth > 768) {
                    feedSidebar.classList.add('hidden');
                    if (feedToggle) feedToggle.style.display = '';
                } else {
                    feedPanelSnap.snapTo('hidden');
                }
            });
        }

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

        // Listen for narratives loaded and auth changes to refresh narrative display
        window.addEventListener('narratives-loaded', function () {
            renderFeedNarratives();
        });
        window.addEventListener('auth-state-changed', function () {
            if (window.cloudData) {
                renderFeedNarratives();
            }
        });

        // Expose public methods
        window.feedController.buildFeed = buildFeed;
        window.feedController.renderFeedNarratives = renderFeedNarratives;
    }

    function buildFeed() {
        var keys = Object.keys(_dateIndex).sort();
        var fragment = document.createDocumentFragment();

        for (var i = 0; i < keys.length; i++) {
            var date = keys[i];
            var entry = _dateIndex[date];
            var photos = entry.photos;
            var maxThumbs = 6;
            var remaining = photos.length - maxThumbs;

            var thumbsDiv = el('div', {className: 'feed-thumbnails'});
            for (var t = 0; t < Math.min(photos.length, maxThumbs); t++) {
                var photo = photos[t];
                var img = el('img', {
                    className: 'feed-thumbnail',
                    src: photo.thumbnail,
                    alt: '',
                    dataset: {
                        photoUrl: photo.url,
                        photoLat: photo.lat,
                        photoLng: photo.lng
                    },
                    onload: function () { this.classList.add('loaded'); },
                    onclick: onFeedThumbnailClick
                });
                thumbsDiv.appendChild(img);
            }
            if (remaining > 0) {
                thumbsDiv.appendChild(el('span', {className: 'feed-more-indicator'}, text('+' + remaining)));
            }

            var entryDiv = el('div', {
                className: 'feed-entry',
                dataset: {date: date},
                style: {},
                onclick: onFeedEntryClick
            },
                el('div', {className: 'feed-entry-header'},
                    el('span', {className: 'feed-entry-date'}, text(_formatDateShort(date))),
                    el('span', {className: 'feed-entry-city', style: {color: entry.segmentColor}}, text(entry.segmentName))
                ),
                el('div', {className: 'feed-narrative-slot', dataset: {date: date}}),
                thumbsDiv
            );
            entryDiv.style.setProperty('--entry-color', entry.segmentColor);

            fragment.appendChild(entryDiv);
        }

        feedEntries.innerHTML = '';
        feedEntries.appendChild(fragment);
    }

    function onFeedEntryClick(evt) {
        // Don't handle if clicking on a thumbnail, narrative editor, or add-note
        if (evt.target.classList.contains('feed-thumbnail') ||
            evt.target.classList.contains('feed-narrative-editor') ||
            evt.target.classList.contains('feed-add-note')) return;

        var entryEl = evt.currentTarget;
        var date = entryEl.getAttribute('data-date');
        if (!date || !_dateIndex[date]) return;

        // Highlight active entry
        var prev = feedEntries.querySelector('.feed-entry.active');
        if (prev) prev.classList.remove('active');
        entryEl.classList.add('active');
        activeFeedDate = date;

        // Compute bounds from photos and fly
        var photos = _dateIndex[date].photos;
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

        _map.flyToBounds(bounds, {
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
        if (date && _dateIndex[date]) {
            var dayPhotos = _dateIndex[date].photos;
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
        var filteredPhotos = _getFilteredPhotos();
        var photoIndex = _getPhotoIndex();
        var key = url + '|' + lat + '|' + lng;
        var idx = photoIndex.hasOwnProperty(key) ? photoIndex[key] : -1;
        if (idx >= 0) {
            window.photoViewer.open(filteredPhotos, idx, evt.target);
        }
    }

    // ──── Feed Narratives ────
    function renderFeedNarratives() {
        var slots = feedEntries.querySelectorAll('.feed-narrative-slot');
        var isEditor = !!(window.firebaseAuth && window.firebaseAuth.isEditor);
        for (var i = 0; i < slots.length; i++) {
            var date = slots[i].getAttribute('data-date');
            var narrativeText = window.cloudData ? window.cloudData.getDailyNarrative(date) : '';
            slots[i].textContent = '';
            if (narrativeText) {
                slots[i].appendChild(el('p', {className: 'feed-narrative', dataset: isEditor ? {date: date} : {}}, text(narrativeText)));
            } else if (isEditor) {
                slots[i].appendChild(el('span', {className: 'feed-add-note', dataset: {date: date}}, text('Add note...')));
            }
        }
        _wireNarrativeEditing();
    }

    function _wireNarrativeEditing() {
        var isEditor = !!(window.firebaseAuth && window.firebaseAuth.isEditor);
        if (!isEditor) return;

        var addNotes = feedEntries.querySelectorAll('.feed-add-note');
        for (var a = 0; a < addNotes.length; a++) {
            addNotes[a].addEventListener('click', _onNarrativeEditStart);
        }
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
        var noteText = textarea.value.trim();
        if (window.cloudData) {
            window.cloudData.saveDailyNarrative(date, noteText);
        }
        renderFeedNarratives();
    }

    window.feedController = { init: init };
})();
