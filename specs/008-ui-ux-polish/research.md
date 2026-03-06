# Research: UI and UX Polish

**Feature**: 008-ui-ux-polish | **Date**: 2026-03-03

## Current State Audit

### Panel Backgrounds (FR-001 / SC-001)

| Panel | Current Background | Current Blur | Current Opacity |
|-------|--------------------|-------------|----------------|
| Control Panel | `rgba(24, 24, 28, 0.88)` | `blur(16px)` | 0.88 |
| Trip Feed | `rgba(24, 24, 28, 0.88)` | `blur(16px)` | 0.88 |
| Photo Wall | `rgba(24, 24, 28, 0.97)` | `blur(20px)` | 0.97 |
| Reopen Button | `rgba(24, 24, 28, 0.92)` | `blur(12px)` | 0.92 |

**Decision**: Lower opacities to 0.78–0.82 range (spec SC-001 says 0.7–0.85). Keep blur values as-is since they already work well.

**Rationale**: Current opacities (0.88–0.97) make panels nearly opaque — the map is barely visible through them. Lowering to ~0.80 lets map colors and movement show through, reinforcing the glassmorphism effect and map-centric design (Constitution VII).

**Alternatives considered**:
- Keep current values: Rejected because Photo Wall at 0.97 is functionally opaque, defeating the glassmorphism purpose.
- Go lower (0.65–0.70): Rejected because text readability suffers on busy map backgrounds. 0.78–0.82 balances visibility and legibility.

**Target values**:

| Panel | Target Background | Target Blur | Target Opacity |
|-------|--------------------|-------------|----------------|
| Control Panel | `rgba(24, 24, 28, 0.80)` | `blur(16px)` (unchanged) | 0.80 |
| Trip Feed | `rgba(24, 24, 28, 0.80)` | `blur(16px)` (unchanged) | 0.80 |
| Photo Wall | `rgba(24, 24, 28, 0.82)` | `blur(20px)` (unchanged) | 0.82 |

---

### Photo Wall Header Typography (FR-002 / SC-002)

**Current state** (`css/photo-wall.css`):
- Title: `font-size: 13px`, `font-weight: 700`, `letter-spacing: 0.06em`, `text-transform: uppercase`, color `#e8e6e3`
- Date label: `font-size: 12px`, color `rgba(232, 230, 227, 0.5)`, ellipsis overflow

**Decision**: Minor refinements only — the header is already well-styled.

**Changes**:
- Increase title `letter-spacing` from `0.06em` to `0.12em` for a more editorial feel
- Add a thin bottom border or subtle separator between header and grid
- Bump date label opacity from `0.5` to `0.6` for better readability

**Rationale**: The current typography is functional but generic. Wider letter-spacing on "PHOTOS" makes it feel more like a section title in a premium photo app. The date label at 0.5 opacity is too faint, especially with lowered panel opacity.

**Alternatives considered**:
- Custom font via @font-face: Rejected — constitution says no external resources, and adding a vendored font file is overkill for this change.
- Larger font size: Rejected — the header should be compact; letter-spacing achieves distinctiveness without taking more space.

---

### Grid Item Hover States (FR-003 / SC-003)

**Current state** (`css/photo-wall.css`):
- `.photo-wall-item` has `transition: transform 80ms` and `:active { transform: scale(0.97) }`
- NO `:hover` state exists for desktop

**Decision**: Add `:hover` with `scale(1.03)` and a subtle box-shadow glow.

**Rationale**: Desktop users get no feedback when mousing over photos. A slight scale-up (1.03x) with a soft shadow provides clear affordance without disrupting the grid layout. Using `@media (hover: hover)` ensures touch devices aren't affected.

**Implementation**:
```css
@media (hover: hover) {
  .photo-wall-item:hover {
    transform: scale(1.03);
    box-shadow: 0 2px 12px rgba(212, 168, 83, 0.15);
    z-index: 1;
  }
}
```

**Alternatives considered**:
- Overlay with metadata on hover: Rejected — too complex for a polish pass; better suited to a dedicated feature.
- Border highlight instead of scale: Rejected — border changes cause layout shifts; transform is GPU-composited and jank-free.
- scale(1.05): Rejected — too aggressive, causes overlap with neighbors in tight grids.

---

### Reopen Button Restyle (FR-004 / SC-004)

**Current state** (`css/photo-wall.css`):
- Pill shape: `border-radius: 20px`, `padding: 6px 14px`
- Dark background: `rgba(24, 24, 28, 0.92)`
- Border: `1px solid rgba(255, 255, 255, 0.08)`
- White text: `#e8e6e3`
- Position: `bottom: 12px; right: 60px`

**Comparison — existing toggle buttons** (`css/map.css`):
- Panel toggle: `44px` circle, `background: #d4a853`, no border, `border-radius: 50%`, `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3)`
- Feed toggle: `44px` circle, `background: #d4a853`, no border, `border-radius: 50%`, `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3)`

**Decision**: Restyle reopen button to match toggle pattern — gold circle with camera/photo icon.

**Target style**:
- Width/height: `44px`, `border-radius: 50%`
- Background: `#d4a853` (gold)
- Color: `#18181c` (dark text/icon on gold)
- Box-shadow: `0 2px 8px rgba(0, 0, 0, 0.3)`
- Remove border
- Keep `backdrop-filter: blur(12px)` for consistency
- Hover: `background: #e0b862` (slightly lighter gold)

**Rationale**: Visual consistency with Panel and Feed toggles. All three are "reopen a hidden panel" buttons — they should look identical in shape and accent color.

**Alternatives considered**:
- Keep pill shape but change to gold: Rejected — shape consistency matters as much as color. Users recognize the circular toggle pattern.
- Floating action button (FAB) with shadow: Considered but the existing toggles are flat circles with minimal shadow — matching is more important than introducing a new pattern.

---

### Transition Normalization (FR-005)

**Current timing spread**:
- 80ms: Grid item transform
- 150ms: Button hover backgrounds
- 200ms: Image opacity, drag handle
- 250ms: Panel entrance animations
- 300ms: Control panel keyframe duration
- 600ms: Photo wall panel slide

**Decision**: Normalize interactive element transitions to 200ms. Keep panel entrance animations at their current values (they feel good).

**Changes**:
- Grid item transform: 80ms → 200ms (currently too snappy, feels mechanical)
- Button hover backgrounds: 150ms → 200ms (minor bump for smoothness)
- Panel entrances: Keep 250ms (already good)
- Photo wall slide: Keep 600ms cubic-bezier (intentionally slow for drama)

**Rationale**: 200ms is the sweet spot for interactive feedback — fast enough to feel responsive, slow enough to perceive the animation. The spec says 200–300ms; we target 200ms for interactive elements.

**Alternatives considered**:
- 300ms everywhere: Rejected — feels sluggish for hover states.
- CSS custom property `--transition-speed`: Rejected — over-engineering for 3 files.
