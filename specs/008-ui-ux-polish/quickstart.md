# Quickstart: UI and UX Polish Testing

**Feature**: 008-ui-ux-polish | **Date**: 2026-03-03

## Prerequisites

```bash
cd /home/bgural/photoMap/travel-photo-map
python3 -m http.server 8000
# Open http://localhost:8000 in browser
```

## Visual Testing Checklist

### 1. Panel Transparency (FR-001 / SC-001)

- [ ] Open Control Panel → map colors/shapes visible through background
- [ ] Open Trip Feed → map colors/shapes visible through background
- [ ] Expand Photo Wall to half → map visible through panel body
- [ ] Scroll/pan map while panels are open → movement visible through panels
- [ ] Text on all panels remains legible against map backgrounds (light tiles, dark tiles, satellite)

### 2. Photo Wall Header (FR-002 / SC-002)

- [ ] Expand photo wall → "PHOTOS" title has wide letter-spacing, uppercase, editorial feel
- [ ] Date/location label is legible (not too faint)
- [ ] Header has visual separation from grid content

### 3. Grid Hover States (FR-003 / SC-003) — Desktop Only

- [ ] Hover over photo → subtle scale-up (1.03x) with soft gold-tinted shadow
- [ ] Hover transition feels smooth (~200ms)
- [ ] Hover does not cause neighboring items to shift or overlap badly
- [ ] Moving mouse quickly across grid → no jank or stacking issues
- [ ] On mobile/touch device → NO hover effect fires (progressive enhancement)

### 4. Reopen Button (FR-004 / SC-004)

- [ ] Hide photo wall → reopen button appears
- [ ] Button is a gold (#d4a853) circle matching Panel and Feed toggles
- [ ] Button has same size (44px), border-radius, and shadow as other toggles
- [ ] Hover on button → slightly lighter gold
- [ ] Click button → photo wall reopens

### 5. Transition Consistency (FR-005)

- [ ] All hover states transition at ~200ms (not instant, not sluggish)
- [ ] Panel open/close animations feel smooth
- [ ] No visible layout shifts during any transition

### 6. Cross-Browser

- [ ] Chrome (desktop + mobile emulation)
- [ ] Firefox
- [ ] Safari (if available)
- [ ] `backdrop-filter` renders correctly (check for fallback on older browsers)
