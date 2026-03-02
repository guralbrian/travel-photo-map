/**
 * Photo Viewer Module — Immersive viewer for travel photo map
 * iPhone Photos style on mobile, Google Photos style on desktop
 * Uses Pointer Events API for unified gesture handling
 */
(function () {
    'use strict';

    // ── Constants ──
    var MIN_SCALE = 1, MAX_SCALE = 5;
    var SWIPE_THRESHOLD = 80, SWIPE_VELOCITY = 0.3, DISMISS_THRESHOLD = 150;
    var GESTURE_THRESHOLD = 10, ANGLE_HORIZ = 30, ANGLE_VERT = 60;
    var MOBILE_HIDE_MS = 4000, DESKTOP_HIDE_MS = 4000;
    var TAP_MS = 250, TAP_PX = 10, DRAG_PX = 3;

    // ── Gesture FSM modes ──
    var IDLE = 0, PINCHING = 1, PANNING = 2, SWIPING_NAV = 3, SWIPING_DISMISS = 4;

    // ── State ──
    var S = {
        open: false, photos: [], idx: -1, srcEl: null,
        scale: 1, tx: 0, ty: 0,
        loaded: false, pending: null, prePrev: null, preNext: null,
        ctrlVis: false, hideTimer: null, didDrag: false,
        savedOverflow: '', savedMapPE: '', navGuardUntil: 0
    };
    var G = {
        mode: IDLE, ptrs: new Map(),
        dist0: 0, scale0: 1, mid: { x: 0, y: 0 },
        sx: 0, sy: 0, st: 0, stx: 0, sty: 0, committed: false,
        lastTapTime: 0, lastTapX: 0, lastTapY: 0
    };

    // ── DOM refs ──
    var $ov, $wrap, $media, $close, $prev, $next, $info, $fav;
    var $cap, $capEd, $capIn, $tagEd, $tagChips, $tagIn;

    // ── Helpers ──
    function mobile() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; }
    function emit(name, d) { document.dispatchEvent(new CustomEvent(name, { detail: d || {} })); }
    function pid(p) { return p.url.split('/').pop().replace(/\.[^.]+$/, ''); }
    function eCap(p) { return window.cloudData ? window.cloudData.getEffectiveCaption(pid(p), p.caption) : (p.caption || ''); }
    function eTags(p) { return window.cloudData ? window.cloudData.getEffectiveTags(pid(p), p.tags) : (p.tags || []); }

    // ══════════════════════════════════════════════════════════════
    // DOM Construction (T003)
    // ══════════════════════════════════════════════════════════════
    function build() {
        if ($ov) return;
        $ov = document.createElement('div');
        $ov.className = 'pv-overlay';
        $ov.innerHTML =
            '<div class="pv-wrap">' +
                '<div class="pv-media"></div>' +
            '</div>' +
            '<button class="pv-close pv-ctrl" aria-label="Close">&times;</button>' +
            '<button class="pv-fav pv-ctrl" aria-label="Favorite">&#9734;</button>' +
            '<button class="pv-nav pv-prev pv-ctrl" aria-label="Previous">&#8249;</button>' +
            '<button class="pv-nav pv-next pv-ctrl" aria-label="Next">&#8250;</button>' +
            '<div class="pv-info pv-ctrl">' +
                '<div class="pv-cap-wrap">' +
                    '<p class="pv-cap"></p>' +
                    '<div class="pv-cap-ed" style="display:none">' +
                        '<textarea class="pv-cap-in" rows="2" placeholder="Add a caption..."></textarea>' +
                    '</div>' +
                '</div>' +
                '<p class="pv-date"></p>' +
                '<div class="pv-tags"></div>' +
                '<div class="pv-tag-ed" style="display:none">' +
                    '<div class="pv-tag-chips"></div>' +
                    '<input class="pv-tag-in" type="text" placeholder="Add tag..." maxlength="50">' +
                '</div>' +
                '<a class="pv-link" target="_blank" rel="noopener noreferrer">View on Google Photos</a>' +
            '</div>';
        document.body.appendChild($ov);

        $wrap = $ov.querySelector('.pv-wrap');
        $media = $ov.querySelector('.pv-media');
        $close = $ov.querySelector('.pv-close');
        $prev = $ov.querySelector('.pv-prev');
        $next = $ov.querySelector('.pv-next');
        $info = $ov.querySelector('.pv-info');
        $fav = $ov.querySelector('.pv-fav');
        $cap = $ov.querySelector('.pv-cap');
        $capEd = $ov.querySelector('.pv-cap-ed');
        $capIn = $ov.querySelector('.pv-cap-in');
        $tagEd = $ov.querySelector('.pv-tag-ed');
        $tagChips = $ov.querySelector('.pv-tag-chips');
        $tagIn = $ov.querySelector('.pv-tag-in');

        // ── Static listeners ──
        $close.addEventListener('click', function (e) { e.stopPropagation(); close(); });
        $prev.addEventListener('click', function (e) { e.stopPropagation(); nav(-1); });
        $next.addEventListener('click', function (e) { e.stopPropagation(); nav(1); });

        $fav.addEventListener('click', function (e) {
            e.stopPropagation();
            if (S.idx < 0 || S.idx >= S.photos.length) return;
            var p = S.photos[S.idx];
            emit('photoviewer:favorite', { photo: p });
            p._isFavorite = !p._isFavorite;
            updFav(p);
        });

        $ov.addEventListener('click', function (e) {
            if ((e.target === $ov || e.target === $wrap) && !S.didDrag && Date.now() >= S.navGuardUntil) close();
            S.didDrag = false;
        });

        // Caption editor
        $cap.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!(window.firebaseAuth && window.firebaseAuth.isEditor)) return;
            $cap.style.display = 'none';
            $capEd.style.display = '';
            $capIn.value = $cap.textContent || '';
            $capIn.focus();
        });
        $capIn.addEventListener('click', function (e) { e.stopPropagation(); });
        $capIn.addEventListener('blur', saveCap);
        $capIn.addEventListener('keydown', function (e) {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $capIn.blur(); }
        });

        // Tag editor
        $tagIn.addEventListener('keydown', function (e) {
            e.stopPropagation();
            if (e.key !== 'Enter') return;
            e.preventDefault();
            var v = this.value.trim();
            if (!v || S.idx < 0) return;
            var p = S.photos[S.idx];
            var cur = eTags(p).slice();
            if (cur.indexOf(v) === -1) cur.push(v);
            emit('photoviewer:tag-edit', { photoId: pid(p), tags: cur });
            this.value = '';
            renderTagChips(p);
            renderTags(p);
        });
        $tagIn.addEventListener('click', function (e) { e.stopPropagation(); });

        // ── Pointer events (gesture system) ──
        $wrap.addEventListener('pointerdown', ptrDown);
        $wrap.addEventListener('pointermove', ptrMove);
        $wrap.addEventListener('pointerup', ptrUp);
        $wrap.addEventListener('pointercancel', ptrUp);

        // Wheel zoom
        $wrap.addEventListener('wheel', function (e) {
            e.preventDefault();
            zoomAt(S.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY);
        }, { passive: false });

        // Double-click zoom toggle (desktop mouse)
        $wrap.addEventListener('dblclick', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (S.scale > 1.05) animResetZoom();
            else animZoomAt(2, e.clientX, e.clientY);
        });

        // Desktop hover for nav arrows + auto-hide
        $ov.addEventListener('mousemove', function (e) {
            if (!S.open) return;
            showCtrl(); resetHide();
            var w = window.innerWidth;
            $prev.classList.toggle('pv-nav-hover', e.clientX < 80);
            $next.classList.toggle('pv-nav-hover', e.clientX > w - 80);
        });
    }

    // ══════════════════════════════════════════════════════════════
    // Scroll Lock (T007)
    // ══════════════════════════════════════════════════════════════
    function lockScroll() {
        S.savedOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        var m = document.getElementById('map');
        if (m) { S.savedMapPE = m.style.pointerEvents; m.style.pointerEvents = 'none'; }
    }
    function unlockScroll() {
        document.body.style.overflow = S.savedOverflow;
        var m = document.getElementById('map');
        if (m) m.style.pointerEvents = S.savedMapPE;
    }

    // ══════════════════════════════════════════════════════════════
    // FLIP Open / Close Animation (T004, T005)
    // ══════════════════════════════════════════════════════════════
    function animOpen(srcEl) {
        $ov.style.display = 'flex';
        $ov.classList.remove('pv-closing');

        if (srcEl && srcEl.getBoundingClientRect) {
            var r = srcEl.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                $ov.style.setProperty('--pv-sx', r.left + 'px');
                $ov.style.setProperty('--pv-sy', r.top + 'px');
                $ov.style.setProperty('--pv-sw', r.width + 'px');
                $ov.style.setProperty('--pv-sh', r.height + 'px');
                $ov.classList.add('pv-anim');
                $ov.offsetHeight; // reflow
                $ov.classList.add('pv-open');
                setTimeout(function () { $ov.classList.remove('pv-anim'); }, 300);
                return;
            }
        }
        // Fallback fade
        $ov.classList.add('pv-fade');
        $ov.offsetHeight;
        $ov.classList.add('pv-open');
        setTimeout(function () { $ov.classList.remove('pv-fade'); }, 250);
    }

    function animClose() {
        var el = S.srcEl;
        if (el && el.getBoundingClientRect) {
            var r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                $ov.style.setProperty('--pv-sx', r.left + 'px');
                $ov.style.setProperty('--pv-sy', r.top + 'px');
                $ov.style.setProperty('--pv-sw', r.width + 'px');
                $ov.style.setProperty('--pv-sh', r.height + 'px');
                $ov.classList.add('pv-anim');
                $ov.classList.remove('pv-open');
                $ov.classList.add('pv-closing');
                setTimeout(finalize, 300);
                return;
            }
        }
        $ov.classList.remove('pv-open');
        $ov.classList.add('pv-closing');
        setTimeout(finalize, 250);
    }

    function finalize() {
        // Stop video
        var vid = $media.querySelector('video');
        if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); }

        $ov.style.display = 'none';
        $ov.classList.remove('pv-closing', 'pv-anim', 'pv-open', 'pv-fade', 'pv-controls-visible');
        $ov.style.background = '';
        $wrap.style.transform = '';
        $wrap.style.transition = '';

        S.open = false; S.idx = -1; S.photos = []; S.srcEl = null;
        resetZoom(); cancelLoads(); unlockScroll(); clearHide();
        document.removeEventListener('keydown', onKey);
        emit('photoviewer:close');
    }

    // ══════════════════════════════════════════════════════════════
    // Zoom (T010, T018, T019)
    // ══════════════════════════════════════════════════════════════
    function resetZoom() {
        S.scale = 1; S.tx = 0; S.ty = 0;
        applyTx();
        if ($wrap) $wrap.classList.remove('pv-zoomed');
    }

    function zoomAt(ns, cx, cy) {
        // Use the media element's natural (un-translated) origin so the zoom
        // pivot is always the cursor position, not the wrapper's top-left.
        var c = $media ? $media.querySelector('img, video') : null;
        var rect = c ? c.getBoundingClientRect() : $wrap.getBoundingClientRect();
        var ox = rect.left - S.tx; // recover natural left edge from post-transform rect
        var oy = rect.top - S.ty;  // recover natural top edge
        var mx = cx - ox, my = cy - oy;
        var prev = S.scale;
        ns = Math.max(MIN_SCALE, Math.min(MAX_SCALE, ns));
        var r = ns / prev;
        S.tx = mx - r * (mx - S.tx);
        S.ty = my - r * (my - S.ty);
        S.scale = ns;
        if (S.scale <= 1) { S.tx = 0; S.ty = 0; S.scale = 1; }
        applyTx();
        $wrap.classList.toggle('pv-zoomed', S.scale > 1);
    }

    function animResetZoom() {
        var c = $media.querySelector('img, video');
        if (!c) return;
        c.style.transition = 'transform 0.25s ease-out';
        S.scale = 1; S.tx = 0; S.ty = 0;
        applyTx();
        $wrap.classList.remove('pv-zoomed');
        setTimeout(function () { if (c) c.style.transition = ''; }, 260);
    }

    function animZoomAt(ns, cx, cy) {
        var c = $media ? $media.querySelector('img, video') : null;
        if (!c) return;
        c.style.transition = 'transform 0.25s ease-out';
        zoomAt(ns, cx, cy);
        setTimeout(function () { if (c) c.style.transition = ''; }, 260);
    }

    function applyTx() {
        var c = $media ? $media.querySelector('img, video') : null;
        if (!c) return;
        if (S.scale === 1 && S.tx === 0 && S.ty === 0) {
            c.style.transform = ''; c.style.transformOrigin = '';
        } else {
            c.style.transform = 'translate(' + S.tx + 'px,' + S.ty + 'px) scale(' + S.scale + ')';
            c.style.transformOrigin = '0 0';
        }
    }

    // ══════════════════════════════════════════════════════════════
    // Gesture FSM — Pointer Events (T009 – T014)
    // ══════════════════════════════════════════════════════════════
    function ptrDown(e) {
        if (!S.open) return;
        if (e.target.closest('.pv-ctrl')) return;
        e.preventDefault();

        try { $wrap.setPointerCapture(e.pointerId); } catch (_) {}
        G.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

        var n = G.ptrs.size;
        if (n === 2 && G.mode === IDLE) {
            var pts = Array.from(G.ptrs.values());
            var dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
            G.dist0 = Math.sqrt(dx * dx + dy * dy);
            G.scale0 = S.scale;
            G.mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
            G.mode = PINCHING; G.committed = true;
        } else if (n === 1) {
            G.sx = e.clientX; G.sy = e.clientY; G.st = Date.now();
            G.stx = S.tx; G.sty = S.ty; G.committed = false;
            if (S.scale > 1 && G.mode === IDLE) { G.mode = PANNING; G.committed = true; }
        }
    }

    function ptrMove(e) {
        if (!S.open || !G.ptrs.has(e.pointerId)) return;
        G.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (G.mode === PINCHING && G.ptrs.size === 2) {
            e.preventDefault();
            var pts = Array.from(G.ptrs.values());
            var dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (G.dist0 > 0) zoomAt(G.scale0 * (d / G.dist0), G.mid.x, G.mid.y);
            return;
        }
        if (G.mode === PANNING) {
            e.preventDefault();
            var pdx = e.clientX - G.sx, pdy = e.clientY - G.sy;
            if (Math.abs(pdx) > DRAG_PX || Math.abs(pdy) > DRAG_PX) S.didDrag = true;
            S.tx = G.stx + pdx; S.ty = G.sty + pdy;
            applyTx(); return;
        }
        if (G.mode === SWIPING_NAV) {
            e.preventDefault();
            $wrap.style.transform = 'translateX(' + (e.clientX - G.sx) + 'px)';
            return;
        }
        if (G.mode === SWIPING_DISMISS) {
            e.preventDefault();
            var sdy = Math.max(0, e.clientY - G.sy);
            var prog = Math.min(sdy / 400, 1);
            $wrap.style.transform = 'translateY(' + sdy + 'px) scale(' + (1 - prog * 0.3) + ')';
            $ov.style.background = 'rgba(0,0,0,' + (0.95 - prog * 0.5) + ')';
            return;
        }

        // IDLE — detect gesture direction
        if (G.mode === IDLE && G.ptrs.size === 1 && !G.committed) {
            var dx2 = e.clientX - G.sx, dy2 = e.clientY - G.sy;
            var dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            if (dist > GESTURE_THRESHOLD) {
                var ang = Math.abs(Math.atan2(dy2, dx2) * 180 / Math.PI);
                if (S.scale <= 1) {
                    if (ang < ANGLE_HORIZ || ang > 180 - ANGLE_HORIZ) {
                        G.mode = SWIPING_NAV; G.committed = true; e.preventDefault();
                    } else if (ang > ANGLE_VERT && ang < 180 - ANGLE_VERT && dy2 > 0) {
                        G.mode = SWIPING_DISMISS; G.committed = true; e.preventDefault();
                    }
                } else {
                    G.mode = PANNING; G.committed = true; e.preventDefault();
                }
            }
        }
    }

    function ptrUp(e) {
        if (!G.ptrs.has(e.pointerId)) return;
        G.ptrs.delete(e.pointerId);

        if (G.ptrs.size === 0) {
            if (G.mode === PINCHING) {
                if (S.scale < 1.2) animResetZoom();
            } else if (G.mode === SWIPING_NAV) {
                var dx = e.clientX - G.sx, dt = Date.now() - G.st;
                var vel = dt > 0 ? Math.abs(dx) / dt : 0;
                if (Math.abs(dx) > SWIPE_THRESHOLD || vel > SWIPE_VELOCITY) {
                    commitSwipe(dx < 0 ? 1 : -1);
                } else { snapSwipe(); }
            } else if (G.mode === SWIPING_DISMISS) {
                if (e.clientY - G.sy > DISMISS_THRESHOLD) close();
                else snapDismiss();
            } else if (!G.committed) {
                // Tap detection (single + double-tap)
                var td = Math.sqrt(Math.pow(e.clientX - G.sx, 2) + Math.pow(e.clientY - G.sy, 2));
                if (td < TAP_PX && Date.now() - G.st < TAP_MS && !e.target.closest('.pv-ctrl')) {
                    var now = Date.now();
                    var dtx = e.clientX - G.lastTapX, dty = e.clientY - G.lastTapY;
                    var tapDist = Math.sqrt(dtx * dtx + dty * dty);
                    if (now - G.lastTapTime < 300 && tapDist < 30) {
                        // Double-tap: toggle zoom 1x ↔ 2x at tap point
                        G.lastTapTime = 0; // prevent triple-tap from re-triggering
                        if (S.scale > 1.05) { animResetZoom(); }
                        else { animZoomAt(2, e.clientX, e.clientY); }
                    } else {
                        // Single tap: toggle controls; record for potential double-tap
                        G.lastTapTime = now;
                        G.lastTapX = e.clientX;
                        G.lastTapY = e.clientY;
                        toggleCtrl();
                    }
                }
            }
            G.mode = IDLE; G.committed = false;
        } else if (G.ptrs.size === 1 && G.mode === PINCHING) {
            // 2→1 finger: switch to pan if zoomed
            if (S.scale > 1) {
                var rem = G.ptrs.values().next().value;
                G.sx = rem.x; G.sy = rem.y; G.stx = S.tx; G.sty = S.ty;
                G.mode = PANNING;
            } else { G.mode = IDLE; G.committed = false; }
        }
    }

    // ── Swipe animations (T011, T012) ──
    function commitSwipe(dir) {
        var ni = S.idx + dir;
        if (ni < 0 || ni >= S.photos.length) { snapSwipe(); return; }
        $wrap.style.transition = 'transform 0.25s ease-out';
        $wrap.style.transform = 'translateX(' + (dir < 0 ? '100' : '-100') + 'vw)';
        setTimeout(function () {
            $wrap.style.transition = 'none'; $wrap.style.transform = '';
            showPhoto(ni);
            $wrap.offsetHeight; $wrap.style.transition = '';
            showCtrl(); resetHide(); S.navGuardUntil = Date.now() + 300;
        }, 260);
    }
    function snapSwipe() {
        $wrap.style.transition = 'transform 0.2s ease-out'; $wrap.style.transform = '';
        setTimeout(function () { $wrap.style.transition = ''; }, 210);
    }
    function snapDismiss() {
        $wrap.style.transition = 'transform 0.2s ease-out'; $wrap.style.transform = '';
        $ov.style.transition = 'background 0.2s ease-out'; $ov.style.background = '';
        setTimeout(function () { $wrap.style.transition = ''; $ov.style.transition = ''; }, 210);
    }

    // ══════════════════════════════════════════════════════════════
    // Show Photo / Video (T006, T024, T028)
    // ══════════════════════════════════════════════════════════════
    function showPhoto(i) {
        if (i < 0 || i >= S.photos.length) return;
        S.idx = i;
        var p = S.photos[i];
        resetZoom(); cancelLoads();

        $prev.style.display = i <= 0 ? 'none' : '';
        $next.style.display = i >= S.photos.length - 1 ? 'none' : '';

        if (p.type === 'video') renderVideo(p);
        else renderPhoto(p);

        updInfo(p);
        emit('photoviewer:navigate', { index: i, photo: p });
    }

    function renderPhoto(p) {
        var img = document.createElement('img');
        img.className = 'pv-img pv-loading';
        img.alt = p.caption || 'Photo';
        img.draggable = false;
        img.src = p.thumbnail;
        img.onerror = function () { this.onerror = null; errPlaceholder(); };

        $media.innerHTML = '';
        $media.appendChild(img);
        S.loaded = false;

        if (p.web_url) {
            S.pending = new Image();
            var ref = S.pending;
            ref.onload = function () {
                if (S.pending !== ref) return;
                if (img.parentNode) { img.src = ref.src; img.classList.remove('pv-loading'); }
                S.loaded = true; S.pending = null; preloadAdj();
            };
            ref.onerror = function () {
                if (S.pending !== ref) return;
                img.classList.remove('pv-loading'); S.pending = null;
            };
            ref.src = p.web_url;
        } else {
            img.classList.remove('pv-loading'); S.loaded = true;
        }
    }

    function renderVideo(p) {
        var old = $media.querySelector('video');
        if (old) { old.pause(); old.removeAttribute('src'); old.load(); }

        var v = document.createElement('video');
        v.className = 'pv-video';
        v.controls = true;
        v.playsInline = true;
        v.preload = 'none';
        v.poster = p.thumbnail;
        v.src = p.web_url || p.url;
        v.onerror = function () { errPlaceholder(); };

        $media.innerHTML = '';
        $media.appendChild(v);
        S.loaded = true;
    }

    function errPlaceholder() {
        $media.innerHTML = '<div class="pv-error">Photo unavailable</div>';
    }

    // ── Preloading (T025, T026, T030) ──
    function cancelLoads() {
        if (S.pending) { S.pending.onload = S.pending.onerror = null; S.pending.src = ''; S.pending = null; }
        if (S.prePrev) { S.prePrev.src = ''; S.prePrev = null; }
        if (S.preNext) { S.preNext.src = ''; S.preNext = null; }
    }

    function preloadAdj() {
        var ps = S.photos, i = S.idx;
        if (i > 0) {
            var pp = ps[i - 1];
            S.prePrev = new Image();
            S.prePrev.src = pp.type === 'video' ? pp.thumbnail : (pp.web_url || pp.thumbnail);
        }
        if (i < ps.length - 1) {
            var pn = ps[i + 1];
            S.preNext = new Image();
            S.preNext.src = pn.type === 'video' ? pn.thumbnail : (pn.web_url || pn.thumbnail);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // Info Panel (T031 – T034)
    // ══════════════════════════════════════════════════════════════
    function updInfo(p) {
        var cap = eCap(p), tags = eTags(p);
        var ed = !!(window.firebaseAuth && window.firebaseAuth.isEditor);

        // Caption
        $cap.textContent = cap;
        $cap.style.cursor = ed ? 'pointer' : '';
        $capEd.style.display = 'none';
        if (!cap && ed) {
            $cap.textContent = '';
            $cap.setAttribute('data-placeholder', 'Click to add caption...');
            $cap.classList.add('pv-cap-placeholder');
            $cap.style.display = '';
        } else {
            $cap.classList.remove('pv-cap-placeholder');
            $cap.removeAttribute('data-placeholder');
            $cap.style.display = cap ? '' : 'none';
        }

        // Date
        var dateEl = $ov.querySelector('.pv-date');
        dateEl.textContent = p.date || ''; dateEl.style.display = p.date ? '' : 'none';

        // Tags
        renderTags(p);
        $tagEd.style.display = ed ? '' : 'none';
        if (ed) renderTagChips(p);

        // Link
        var lk = $ov.querySelector('.pv-link');
        if (p.google_photos_url) { lk.href = p.google_photos_url; lk.style.display = ''; }
        else lk.style.display = 'none';

        // Favorite
        updFav(p);
        $fav.style.display = '';
    }

    function renderTags(p) {
        var el = $ov.querySelector('.pv-tags'), tags = eTags(p);
        if (tags && tags.length) {
            var h = ''; for (var i = 0; i < tags.length; i++) h += '<span class="pv-tag">' + tags[i] + '</span>';
            el.innerHTML = h; el.style.display = '';
        } else { el.innerHTML = ''; el.style.display = 'none'; }
    }

    function renderTagChips(p) {
        var tags = eTags(p), h = '';
        for (var i = 0; i < tags.length; i++)
            h += '<span class="pv-tag-chip">' + tags[i] + '<button class="pv-chip-x" data-tag="' + tags[i] + '">&times;</button></span>';
        $tagChips.innerHTML = h;
        var btns = $tagChips.querySelectorAll('.pv-chip-x');
        for (var r = 0; r < btns.length; r++) {
            btns[r].addEventListener('click', function (evt) {
                evt.stopPropagation();
                var tag = this.getAttribute('data-tag');
                var ph = S.photos[S.idx];
                var cur = eTags(ph).slice();
                var idx = cur.indexOf(tag); if (idx !== -1) cur.splice(idx, 1);
                emit('photoviewer:tag-edit', { photoId: pid(ph), tags: cur });
                renderTagChips(ph); renderTags(ph);
            });
        }
    }

    function updFav(p) {
        $fav.innerHTML = p._isFavorite ? '&#9733;' : '&#9734;';
        $fav.classList.toggle('pv-is-fav', !!p._isFavorite);
    }

    function saveCap() {
        var nc = $capIn.value.trim();
        if (S.idx >= 0 && S.idx < S.photos.length) {
            emit('photoviewer:caption-edit', { photoId: pid(S.photos[S.idx]), caption: nc });
            $cap.textContent = nc;
        }
        $capEd.style.display = 'none';
        $cap.style.display = $cap.textContent ? '' : 'none';
    }

    // ── UI Controls (T014, T016, T021) ──
    function toggleCtrl() {
        S.ctrlVis = !S.ctrlVis;
        $ov.classList.toggle('pv-controls-visible', S.ctrlVis);
        if (S.ctrlVis) resetHide(); else clearHide();
    }
    function showCtrl() {
        if (!S.ctrlVis) { S.ctrlVis = true; $ov.classList.add('pv-controls-visible'); }
    }
    function clearHide() { if (S.hideTimer) { clearTimeout(S.hideTimer); S.hideTimer = null; } }
    function resetHide() {
        clearHide();
        S.hideTimer = setTimeout(function () {
            S.ctrlVis = false; $ov.classList.remove('pv-controls-visible');
        }, mobile() ? MOBILE_HIDE_MS : DESKTOP_HIDE_MS);
    }

    // ── Keyboard (T017) ──
    function onKey(e) {
        if (!S.open) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') nav(-1);
        else if (e.key === 'ArrowRight') nav(1);
    }

    // ── Navigation helper ──
    function nav(dir) {
        var ni = S.idx + dir;
        if (ni >= 0 && ni < S.photos.length) {
            showPhoto(ni);
            showCtrl(); resetHide(); S.navGuardUntil = Date.now() + 300;
        }
    }

    // ── Orientation / resize (T037) ──
    window.addEventListener('resize', function () { if (S.open) resetZoom(); });

    // ══════════════════════════════════════════════════════════════
    // Public API
    // ══════════════════════════════════════════════════════════════
    function open(photos, startIndex, sourceElement) {
        if (!photos || !photos.length) return;
        if (startIndex < 0) startIndex = 0;
        if (startIndex >= photos.length) startIndex = photos.length - 1;

        build();
        S.open = true; S.photos = photos; S.srcEl = sourceElement || null;
        lockScroll();

        $ov.classList.add('pv-controls-visible');
        S.ctrlVis = true; resetHide();

        showPhoto(startIndex);
        animOpen(sourceElement);
        document.addEventListener('keydown', onKey);
        emit('photoviewer:open', { index: startIndex, photo: photos[startIndex] });
    }

    function close() {
        if (!S.open) return;
        animClose();
    }

    window.photoViewer = { open: open, close: close, isOpen: function () { return S.open; } };
})();
