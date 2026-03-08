/**
 * photo-wall.js — Photo Wall Album View
 * Feature 006 | Travel Photo Map
 *
 * Provides a full-width bottom panel with a justified chronological
 * photo grid (Google Photos album style), snap-point drag behaviour,
 * date scrubber, and bidirectional navigation with the Leaflet map.
 *
 * Loaded as a plain <script> tag; exposes window.PhotoWall.
 */

(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════
       Constants
    ═══════════════════════════════════════════════════════════════ */
    const SECTION_HEADER_HEIGHT = 40;
    const ROW_GAP = 4;
    const TARGET_ROW_HEIGHT = 160;
    const SCRUBBER_WIDTH = 20;

    /* ═══════════════════════════════════════════════════════════════
       Helper: resolveSegmentForDate
    ═══════════════════════════════════════════════════════════════ */
    /**
     * Find the trip segment whose time range contains the given date.
     * @param {string} date - 'YYYY-MM-DD'
     * @param {Array}  segments - trip_segments.json array
     * @returns {{ name: string, color: string }}
     */
    function resolveSegmentForDate(date, segments) {
        // Use midday to avoid UTC/local timezone edge cases
        const photoDate = new Date(date + 'T12:00:00');
        for (let i = 0; i < segments.length; i++) {
            const start = new Date(segments[i].start);
            const end = new Date(segments[i].end);
            if (photoDate >= start && photoDate <= end) {
                return { name: segments[i].name, color: segments[i].color };
            }
        }
        return { name: 'Unknown', color: '#888888' };
    }

    /* ═══════════════════════════════════════════════════════════════
       Helper: buildDateSections
    ═══════════════════════════════════════════════════════════════ */
    /**
     * Group photos into chronological DateSection objects.
     * @param {Array} photos   - manifest.json photo entries
     * @param {Array} segments - trip_segments.json entries
     * @returns {Array} sorted DateSection[]
     */
    function buildDateSections(photos, segments) {
        // Sort by full datetime (fall back to date if datetime missing)
        const sorted = photos.slice().sort((a, b) =>
            (a.datetime || a.date || '').localeCompare(b.datetime || b.date || '')
        );

        const dateMap = {};
        const dateOrder = [];
        for (let i = 0; i < sorted.length; i++) {
            const p = sorted[i];
            if (!p.date) continue;
            if (!dateMap[p.date]) {
                dateMap[p.date] = [];
                dateOrder.push(p.date);
            }
            dateMap[p.date].push(p);
        }

        return dateOrder.map(d => {
            const seg = resolveSegmentForDate(d, segments);
            const dateObj = new Date(d + 'T12:00:00');
            const dayStr = dateObj.toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric'
            });
            return {
                date:      d,
                label:     `${dayStr} · ${seg.name}`,
                cityName:  seg.name,
                cityColor: seg.color,
                photos:    dateMap[d],
                gridRows:  [],
                yOffset:   0,
                totalHeight: 0
            };
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       Helper: computeJustifiedRows
    ═══════════════════════════════════════════════════════════════ */
    /**
     * Pack photos into rows where every photo in a row shares the same
     * height and the total row width equals panelInnerWidth exactly.
     * @param {Array}  photos         - photo entries for a section
     * @param {number} panelInnerWidth - available width in px
     * @param {number} targetRowHeight - ideal row height in px
     * @param {number} gap             - pixel gap between photos
     * @returns {Array} GridRow[]
     */
    function computeJustifiedRows(photos, panelInnerWidth, targetRowHeight, gap) {
        if (!photos || !photos.length) return [];

        const rows = [];
        let row = [];
        let rowAspectSum = 0;

        for (let i = 0; i < photos.length; i++) {
            const p = photos[i];
            const aspect = (p._naturalAspect !== undefined) ? p._naturalAspect : (4 / 3);
            row.push(p);
            rowAspectSum += aspect;

            // Natural width of this row at targetRowHeight
            const naturalWidth = rowAspectSum * targetRowHeight + gap * (row.length - 1);
            const isLast = (i === photos.length - 1);

            if (naturalWidth >= panelInnerWidth || isLast) {
                const gapTotal = gap * (row.length - 1);
                let rowHeight;

                if (!isLast || naturalWidth >= panelInnerWidth) {
                    // Full row: scale height so total width = panelInnerWidth
                    rowHeight = Math.round((panelInnerWidth - gapTotal) / rowAspectSum);
                } else {
                    // Partial last row: keep target height (left-aligned)
                    rowHeight = targetRowHeight;
                }

                // Compute individual widths
                const widths = [];
                let totalW = 0;
                for (let k = 0; k < row.length; k++) {
                    const a = (row[k]._naturalAspect !== undefined) ? row[k]._naturalAspect : (4 / 3);
                    const w = Math.round(a * rowHeight);
                    widths.push(w);
                    totalW += w;
                }

                // Distribute rounding error to last photo (only for full rows)
                if (!isLast || naturalWidth >= panelInnerWidth) {
                    widths[widths.length - 1] += (panelInnerWidth - gapTotal) - totalW;
                }

                rows.push({ photos: row.slice(), height: rowHeight, widths, yOffset: 0 });
                row = [];
                rowAspectSum = 0;
            }
        }
        return rows;
    }

    /* ═══════════════════════════════════════════════════════════════
       Helper: buildLayoutCache
    ═══════════════════════════════════════════════════════════════ */
    /**
     * Pre-compute absolute pixel positions for all photos in all sections.
     * @param {Array}  sections       - DateSection[] (mutated in-place)
     * @param {number} panelInnerWidth
     * @returns {Object} LayoutCache
     */
    function buildLayoutCache(sections, panelInnerWidth) {
        const dateToSectionIndex = {};
        const photoToPosition = {};
        let y = 0;

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            section.yOffset = y;
            section.gridRows = computeJustifiedRows(
                section.photos, panelInnerWidth, TARGET_ROW_HEIGHT, ROW_GAP
            );

            let rowY = y + SECTION_HEADER_HEIGHT;

            for (let r = 0; r < section.gridRows.length; r++) {
                const row = section.gridRows[r];
                row.yOffset = rowY;
                let x = 0;

                for (let p = 0; p < row.photos.length; p++) {
                    const photo = row.photos[p];
                    photoToPosition[photo.url] = {
                        top:          rowY,
                        left:         x,
                        width:        row.widths[p],
                        height:       row.height,
                        sectionIndex: i,
                        rowIndex:     r,
                        photoIndex:   p
                    };
                    x += row.widths[p] + ROW_GAP;
                }
                rowY += row.height + ROW_GAP;
            }

            section.totalHeight = rowY - y;
            y = rowY;

            dateToSectionIndex[section.date] = i;
        }

        return { sections, totalHeight: y, dateToSectionIndex, photoToPosition, panelWidth: panelInnerWidth };
    }

    /* ═══════════════════════════════════════════════════════════════
       PanelSnap — now provided by panel-manager.js (window.PanelSnap)
    ═══════════════════════════════════════════════════════════════ */

    /* ═══════════════════════════════════════════════════════════════
       DateScrubber
    ═══════════════════════════════════════════════════════════════ */
    function DateScrubber({ scrubberEl, thumbEl, tooltipEl, onDateSelect }) {
        this._scrubberEl = scrubberEl;
        this._thumbEl    = thumbEl;
        this._tooltipEl  = tooltipEl;
        this._onDateSelect = onDateSelect || (() => {});
        this._sections = [];
        this._hideTimer = null;

        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp   = this._onPointerUp.bind(this);

        if (scrubberEl) {
            scrubberEl.addEventListener('pointerdown', this._onPointerDown);
        }
    }

    DateScrubber.prototype.updateSections = function (sections) {
        this._sections = sections;
    };

    DateScrubber.prototype._onPointerDown = function (e) {
        e.preventDefault();
        this._scrubberEl.setPointerCapture(e.pointerId);
        document.addEventListener('pointermove', this._onPointerMove);
        document.addEventListener('pointerup',   this._onPointerUp);
        this._move(e);
    };

    DateScrubber.prototype._onPointerMove = function (e) {
        this._move(e);
    };

    DateScrubber.prototype._move = function (e) {
        if (!this._sections.length) return;
        const rect  = this._scrubberEl.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const idx   = Math.min(
            Math.floor(ratio * this._sections.length),
            this._sections.length - 1
        );
        const section = this._sections[idx];

        // Position thumb
        if (this._thumbEl) this._thumbEl.style.top = (ratio * rect.height - 4) + 'px';

        // Tooltip
        if (this._tooltipEl) {
            this._tooltipEl.textContent = section.label;
            this._tooltipEl.style.top   = (ratio * rect.height - 10) + 'px';
            this._tooltipEl.classList.add('visible');
        }

        this._onDateSelect(section);
    };

    DateScrubber.prototype._onPointerUp = function () {
        document.removeEventListener('pointermove', this._onPointerMove);
        document.removeEventListener('pointerup',   this._onPointerUp);
        clearTimeout(this._hideTimer);
        this._hideTimer = setTimeout(() => {
            if (this._tooltipEl) this._tooltipEl.classList.remove('visible');
        }, 1000);
    };

    DateScrubber.prototype.updateFromScroll = function (scrollTop, totalHeight) {
        if (!this._scrubberEl || !this._sections.length) return;
        const rect  = this._scrubberEl.getBoundingClientRect();
        const ratio = totalHeight > 0 ? Math.min(1, scrollTop / totalHeight) : 0;
        if (this._thumbEl) this._thumbEl.style.top = (ratio * rect.height - 4) + 'px';
    };

    /* ═══════════════════════════════════════════════════════════════
       PhotoWall
    ═══════════════════════════════════════════════════════════════ */
    function PhotoWall({ container, photos, segments }) {
        this._container = container;
        this._photos    = photos || [];
        this._segments  = segments || [];
        this._layout    = null;
        this._sections  = [];
        this._activeItems = new Map();
        this._isEmpty   = false;
        this._stickyHeaderEl = null;
        this._layoutDirtyTimer = null;

        // DOM refs
        this._scrollEl     = container.querySelector('.photo-wall-scroll');
        this._spacerEl     = container.querySelector('.photo-wall-spacer');
        this._handleEl     = container.querySelector('.photo-wall-handle');
        this._collapseBtn  = container.querySelector('.photo-wall-collapse-btn');
        this._scrubberEl   = container.querySelector('.photo-wall-scrubber');
        this._scrubberThumb = container.querySelector('.photo-wall-scrubber-thumb');
        this._scrubberTooltip = container.querySelector('.photo-wall-scrubber-tooltip');
        this._dateLabelEl  = container.querySelector('.photo-wall-date-label');

        // Build layout
        this._buildLayout();

        // Snap panel (uses shared PanelSnap from panel-manager.js)
        this._snap = new window.PanelSnap({
            panelEl:    container,
            handleEl:   this._handleEl,
            collapseBtn: this._collapseBtn,
            statePrefix: 'photo-wall-panel',
            onStateChange: state => {
                this._onSnapStateChange(state);
                document.dispatchEvent(new CustomEvent('photo-wall:state-changed', {
                    detail: { state }
                }));
                // Notify panel coordinator
                if (state !== 'hidden') {
                    document.dispatchEvent(new CustomEvent('panel:activate', {
                        detail: { panel: 'photo-wall' }
                    }));
                } else {
                    document.dispatchEvent(new CustomEvent('panel:deactivate', {
                        detail: { panel: 'photo-wall' }
                    }));
                }
            }
        });
        container.classList.add('photo-wall-panel--collapsed');

        // Slide the panel up into view automatically on load
        // rAF ensures the browser has painted the off-screen position first
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                container.classList.add('photo-wall-panel--visible');
            });
        });

        // Date scrubber
        this._scrubber = new DateScrubber({
            scrubberEl:  this._scrubberEl,
            thumbEl:     this._scrubberThumb,
            tooltipEl:   this._scrubberTooltip,
            onDateSelect: section => {
                this._scrollEl.scrollTop = section.yOffset;
            }
        });
        this._scrubber.updateSections(this._sections);

        // Render grid content
        this._renderGrid();

        // Event: map marker clicked → target photo
        document.addEventListener('photo-wall:target', e => {
            this._onTargetPhoto(e.detail.photo);
        });

        // Event: feed entry clicked → target date
        document.addEventListener('photo-wall:target-date', e => {
            this._onTargetDate(e.detail.date);
        });

        // Delegated click: grid photo clicked
        this._scrollEl.addEventListener('click', e => {
            const item = e.target.closest('.photo-wall-item');
            if (!item) return;
            const url = item.dataset.photoUrl;
            if (!url || !this._layout) return;

            const pos = this._layout.photoToPosition[url];
            if (!pos) return;

            const section = this._layout.sections[pos.sectionIndex];
            const sectionPhotos = section.photos;
            const indexInSection = sectionPhotos.findIndex(p => p.url === url);
            if (indexInSection < 0) return;

            document.dispatchEvent(new CustomEvent('photo-wall:photo-clicked', {
                detail: {
                    photo:           sectionPhotos[indexInSection],
                    sectionPhotos,
                    indexInSection,
                    srcElement:      item
                }
            }));
        });

        // Prevent scroll events from reaching the map (blocks map zoom-on-scroll)
        container.addEventListener('wheel', e => e.stopPropagation(), { passive: false });

        // Wire close button (X) to fully dismiss the panel
        const closeBtn = document.getElementById('photo-wall-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this._snap.snapTo('hidden');
            });
        }

        // Register with panel coordinator
        const reopenBtn = document.getElementById('photo-wall-reopen-btn');
        if (window.panelCoordinator) {
            window.panelCoordinator.register('photo-wall', this._snap, reopenBtn);
        }
        // Wire reopen button to coordinator
        if (reopenBtn) {
            reopenBtn.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('panel:activate', {
                    detail: { panel: 'photo-wall' }
                }));
            });
        }
    }

    // ── Public API ────────────────────────────────────────────────

    PhotoWall.prototype.expand = function (state) {
        this._snap.snapTo(state);
    };

    PhotoWall.prototype.targetPhoto = function (photo) {
        this._onTargetPhoto(photo);
    };

    PhotoWall.prototype.targetDate = function (date) {
        this._onTargetDate(date);
    };

    PhotoWall.prototype.setPhotos = function (photos) {
        this._photos = photos || [];

        // Remove all rendered items and headers
        var staleEls = this._scrollEl.querySelectorAll('.photo-wall-item, .photo-wall-section-header');
        staleEls.forEach(function (el) { el.parentNode.removeChild(el); });
        this._activeItems.clear();

        // Remove empty state if present
        var emptyEl = this._scrollEl.querySelector('.photo-wall-empty');
        if (emptyEl) emptyEl.parentNode.removeChild(emptyEl);

        // Rebuild layout from scratch
        this._buildLayout();

        if (this._isEmpty) {
            var emptyDiv = document.createElement('div');
            emptyDiv.className = 'photo-wall-empty';
            emptyDiv.innerHTML = '<span>No photos to display</span>';
            this._scrollEl.appendChild(emptyDiv);
            if (this._spacerEl) this._spacerEl.style.height = '0px';
        } else {
            if (this._spacerEl) this._spacerEl.style.height = this._layout.totalHeight + 'px';
            this._renderVisibleRows();
        }

        this._scrubber.updateSections(this._sections);
        this._scrollEl.scrollTop = 0;
    };

    PhotoWall.prototype.relayout = function () {
        if (!this._layout) return;
        const newWidth = Math.max(100, this._scrollEl.clientWidth - SCRUBBER_WIDTH);
        if (newWidth === this._layout.panelWidth) return;

        this._layout = buildLayoutCache(this._sections, newWidth);
        if (this._spacerEl) this._spacerEl.style.height = this._layout.totalHeight + 'px';

        // Remove all rendered items and headers
        const staleEls = this._scrollEl.querySelectorAll('.photo-wall-item, .photo-wall-section-header');
        staleEls.forEach(el => el.parentNode.removeChild(el));
        this._activeItems.clear();

        this._renderVisibleRows();
        this._scrubber.updateSections(this._sections);
    };

    PhotoWall.prototype.destroy = function () {
        // Simple teardown
        this._container.innerHTML = '';
    };

    // ── Private: Layout ───────────────────────────────────────────

    PhotoWall.prototype._buildLayout = function () {
        this._sections = buildDateSections(this._photos, this._segments);
        this._isEmpty  = this._sections.length === 0;

        if (!this._isEmpty && this._scrollEl) {
            const w = Math.max(100, this._scrollEl.clientWidth - SCRUBBER_WIDTH);
            this._layout = buildLayoutCache(this._sections, w);
        }
    };

    // ── Private: Rendering ────────────────────────────────────────

    PhotoWall.prototype._renderGrid = function () {
        if (this._isEmpty) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'photo-wall-empty';
            emptyEl.innerHTML = '<span>No photos to display</span>';
            this._scrollEl.appendChild(emptyEl);
            return;
        }

        // Set spacer to full content height (creates correct scrollbar)
        if (this._spacerEl) {
            this._spacerEl.style.height  = this._layout.totalHeight + 'px';
        }

        // Sticky section header element (stays at top of scroll area)
        this._stickyHeaderEl = document.createElement('div');
        this._stickyHeaderEl.className = 'photo-wall-sticky-header';
        this._stickyHeaderEl.style.display = 'none';
        this._scrollEl.appendChild(this._stickyHeaderEl);

        // Scroll listener
        this._scrollEl.addEventListener('scroll', () => {
            this._renderVisibleRows();
            this._updateStickyHeader();
            if (this._scrubber) {
                this._scrubber.updateFromScroll(
                    this._scrollEl.scrollTop,
                    this._layout.totalHeight
                );
            }
        }, { passive: true });

        this._renderVisibleRows();
        this._updateStickyHeader();
        this._scrubber.updateSections(this._sections);
    };

    PhotoWall.prototype._renderVisibleRows = function () {
        if (!this._layout || this._isEmpty) return;

        const scrollTop  = this._scrollEl.scrollTop;
        const panelH     = this._scrollEl.clientHeight;
        const buffer     = Math.max(panelH * 1.5, 300);
        const visTop     = scrollTop - buffer;
        const visBottom  = scrollTop + panelH + buffer;

        const seen = new Set();
        const sections = this._layout.sections;

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const secBottom = section.yOffset + section.totalHeight;

            if (secBottom < visTop || section.yOffset > visBottom) {
                // Section is entirely out of view — remove its header
                const hKey = 'header_' + section.date;
                const existingH = this._activeItems.get(hKey);
                if (existingH && existingH.parentNode) {
                    existingH.parentNode.removeChild(existingH);
                    this._activeItems.delete(hKey);
                }
                // Remove any rendered photo items from this section
                for (let r = 0; r < section.gridRows.length; r++) {
                    const row = section.gridRows[r];
                    if (row.yOffset + row.height < visTop || row.yOffset > visBottom) {
                        for (let p = 0; p < row.photos.length; p++) {
                            const pKey = row.photos[p].url;
                            const el = this._activeItems.get(pKey);
                            if (el && el.parentNode) {
                                el.parentNode.removeChild(el);
                                this._activeItems.delete(pKey);
                            }
                        }
                    }
                }
                continue;
            }

            // Ensure section header
            const hKey = 'header_' + section.date;
            let headerEl = this._activeItems.get(hKey);
            if (!headerEl) {
                headerEl = document.createElement('div');
                headerEl.className = 'photo-wall-section-header';
                headerEl.style.setProperty('--section-color', section.cityColor);
                headerEl.textContent = section.label;
                this._scrollEl.appendChild(headerEl);
                this._activeItems.set(hKey, headerEl);
            }
            headerEl.style.top   = section.yOffset + 'px';
            headerEl.style.right = SCRUBBER_WIDTH + 'px';
            seen.add(hKey);

            // Render rows
            for (let r = 0; r < section.gridRows.length; r++) {
                const row = section.gridRows[r];
                const rowBottom = row.yOffset + row.height;

                if (rowBottom < visTop || row.yOffset > visBottom) {
                    // Remove row photos that are out of view
                    for (let p = 0; p < row.photos.length; p++) {
                        const pKey = row.photos[p].url;
                        const el = this._activeItems.get(pKey);
                        if (el && el.parentNode) {
                            el.parentNode.removeChild(el);
                            this._activeItems.delete(pKey);
                        }
                    }
                    continue;
                }

                for (let p = 0; p < row.photos.length; p++) {
                    const photo = row.photos[p];
                    const pKey  = photo.url;
                    seen.add(pKey);

                    let itemEl = this._activeItems.get(pKey);
                    if (!itemEl) {
                        itemEl = this._createPhotoItem(photo, section.photos);
                        this._scrollEl.appendChild(itemEl);
                        this._activeItems.set(pKey, itemEl);
                    }

                    // Set position from layout cache
                    const pos = this._layout.photoToPosition[pKey];
                    if (pos) {
                        itemEl.style.top    = pos.top + 'px';
                        itemEl.style.left   = pos.left + 'px';
                        itemEl.style.width  = pos.width + 'px';
                        itemEl.style.height = pos.height + 'px';
                    }
                }
            }
        }
    };

    PhotoWall.prototype._createPhotoItem = function (photo) {
        const item = document.createElement('div');
        item.className = 'photo-wall-item';
        if (photo.type === 'video') item.classList.add('photo-wall-item--video');
        item.dataset.photoUrl = photo.url;
        item.style.position = 'absolute';

        if (photo.thumbnail) {
            const img = document.createElement('img');
            img.loading = 'lazy';
            img.alt = photo.caption || '';
            img.addEventListener('load', () => {
                img.classList.add('loaded');
                item.classList.add('photo-wall-item--loaded');
                // Lazy aspect ratio correction
                if (img.naturalWidth && img.naturalHeight) {
                    const actual  = img.naturalWidth / img.naturalHeight;
                    const stored  = photo._naturalAspect !== undefined ? photo._naturalAspect : (4 / 3);
                    if (Math.abs(actual - stored) > 0.05) {
                        photo._naturalAspect = actual;
                        clearTimeout(this._layoutDirtyTimer);
                        this._layoutDirtyTimer = setTimeout(() => this._recomputeLayout(), 150);
                    }
                }
            });
            img.src = photo.thumbnail;
            item.appendChild(img);
        }

        if (photo.type === 'video') {
            const play = document.createElement('div');
            play.className = 'photo-wall-play-icon';
            play.textContent = '▶';
            item.appendChild(play);
        }

        return item;
    };

    PhotoWall.prototype._recomputeLayout = function () {
        if (!this._sections.length) return;
        const w = this._layout ? this._layout.panelWidth
                                : Math.max(100, this._scrollEl.clientWidth - SCRUBBER_WIDTH);
        this._layout = buildLayoutCache(this._sections, w);

        if (this._spacerEl) this._spacerEl.style.height = this._layout.totalHeight + 'px';

        // Update positions of all currently rendered items
        this._activeItems.forEach((el, key) => {
            if (key.startsWith('header_')) {
                const date = key.slice(7);
                const sIdx = this._layout.dateToSectionIndex[date];
                if (sIdx !== undefined) {
                    el.style.top = this._layout.sections[sIdx].yOffset + 'px';
                }
            } else {
                const pos = this._layout.photoToPosition[key];
                if (pos) {
                    el.style.top    = pos.top + 'px';
                    el.style.left   = pos.left + 'px';
                    el.style.width  = pos.width + 'px';
                    el.style.height = pos.height + 'px';
                }
            }
        });

        this._scrubber.updateSections(this._sections);
    };

    PhotoWall.prototype._updateStickyHeader = function () {
        if (!this._stickyHeaderEl || !this._sections.length) return;
        const scrollTop = this._scrollEl.scrollTop;

        let current = null;
        for (let i = 0; i < this._sections.length; i++) {
            if (this._sections[i].yOffset <= scrollTop + SECTION_HEADER_HEIGHT) {
                current = this._sections[i];
            } else {
                break;
            }
        }

        if (current) {
            this._stickyHeaderEl.style.display = '';
            this._stickyHeaderEl.style.setProperty('--section-color', current.cityColor);
            this._stickyHeaderEl.textContent = current.label;
            if (this._dateLabelEl) this._dateLabelEl.textContent = current.label;
        } else {
            this._stickyHeaderEl.style.display = 'none';
            if (this._dateLabelEl) this._dateLabelEl.textContent = '';
        }
    };

    // ── Private: Snap & State ─────────────────────────────────────

    PhotoWall.prototype._onSnapStateChange = function (state) {
        if (state === 'full') {
            this._container.style.zIndex = '1003';
        } else {
            this._container.style.zIndex = '';
        }

        // Toggle button visibility is now managed by PanelCoordinator

        // Re-render after animation completes (panel height changed)
        setTimeout(() => {
            this._renderVisibleRows();
            this._updateStickyHeader();
        }, 280);
    };

    // ── Private: Navigation targets ───────────────────────────────

    PhotoWall.prototype._onTargetPhoto = function (photo) {
        if (!photo) return;
        if (this._snap.currentState === 'collapsed') {
            this._snap.snapTo('half');
        }
        if (!this._layout) return;

        const pos = this._layout.photoToPosition[photo.url];
        if (!pos) return;

        const targetY = Math.max(0, pos.top - 60);
        this._scrollEl.scrollTo({ top: targetY, behavior: 'smooth' });

        setTimeout(() => this._highlightPhoto(photo.url), 380);
    };

    PhotoWall.prototype._onTargetDate = function (date) {
        if (!date) return;
        if (this._snap.currentState === 'collapsed') {
            this._snap.snapTo('half');
        }
        if (!this._layout) return;

        const sIdx = this._layout.dateToSectionIndex[date];
        if (sIdx === undefined) return;

        const section = this._layout.sections[sIdx];
        this._scrollEl.scrollTo({ top: section.yOffset, behavior: 'smooth' });
    };

    PhotoWall.prototype._highlightPhoto = function (url) {
        // Force-render to ensure the item is in the DOM
        this._renderVisibleRows();

        const el = this._activeItems.get(url);
        if (!el) return;

        el.classList.remove('photo-wall-item--highlight');
        // Force reflow to restart animation if called twice rapidly
        void el.offsetWidth;
        el.classList.add('photo-wall-item--highlight');

        setTimeout(() => el.classList.remove('photo-wall-item--highlight'), 2000);
    };

    /* ═══════════════════════════════════════════════════════════════
       Expose globally
    ═══════════════════════════════════════════════════════════════ */
    window.PhotoWall = PhotoWall;

}());
