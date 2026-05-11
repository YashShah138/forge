# Design System

Lime / zinc. Two modes: dark (default) and light.

---

## Color Tokens

### Dark Mode

| Token | Value | Usage |
|---|---|---|
| Page bg | `#09090b` | App background |
| Surface | `#111113` | Sidebar, cards |
| Border | `#27272a` | All borders |
| Primary text | `#fafafa` | Headings, values |
| Secondary text | `#a1a1aa` | Labels, subtitles |
| Tertiary text | `#71717a` | Hints |
| Muted text | `#52525b` | Units, stat suffixes |
| Accent | `#a3e635` | CTA buttons, active nav, progress fills |
| Accent mid | `#d9f99d` | Secondary progress bars |
| Accent light | `#ecfccb` | Tertiary progress bars |
| Active nav bg | `#1a2600` | Active sidebar item background |
| Track | `#27272a` | Progress bar / ring unfilled tracks |
| Success | `#4ade80` | Weight loss, positive deltas |

### Light Mode

| Token | Value | Usage |
|---|---|---|
| Page bg | `#f4f4f5` | App background |
| Surface | `#e4e4e7` | Sidebar, cards |
| Border | `#d4d4d8` | All borders |
| Primary text | `#09090b` | Headings, values |
| Secondary text | `#3f3f46` | Labels, subtitles |
| Tertiary text | `#71717a` | Hints |
| Muted text | `#a1a1aa` | Units, stat suffixes |
| Accent | `#65a30d` | CTA buttons, active nav, progress fills |
| Accent mid | `#84cc16` | Secondary progress bars |
| Accent light | `#bef264` | Tertiary progress bars |
| Active nav bg | `#ecfccb` | Active sidebar item background |
| Track | `#d4d4d8` | Progress bar / ring unfilled tracks |
| Success | `#15803d` | Weight loss, positive deltas |

---

## CSS Variables

Defined in `globals.css`. Dark is the default (`:root`). Light overrides apply under `.light`:

```css
:root {
  --bg: #09090b;
  --surface: #111113;
  --border: #27272a;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-tertiary: #71717a;
  --text-muted: #52525b;
  --accent: #a3e635;
  --accent-mid: #d9f99d;
  --accent-light: #ecfccb;
  --active-nav-bg: #1a2600;
  --track: #27272a;
  --success: #4ade80;
}

.light {
  --bg: #f4f4f5;
  --surface: #e4e4e7;
  --border: #d4d4d8;
  --text-primary: #09090b;
  --text-secondary: #3f3f46;
  --text-tertiary: #71717a;
  --text-muted: #a1a1aa;
  --accent: #65a30d;
  --accent-mid: #84cc16;
  --accent-light: #bef264;
  --active-nav-bg: #ecfccb;
  --track: #d4d4d8;
  --success: #15803d;
}
```

---

## Typography

- **Font:** Geist Sans (variable font via `next/font/google`)
- **Logo / brand:** `text-2xl font-medium tracking-widest uppercase`
- **Section labels:** `text-xs uppercase tracking-widest` (secondary color)
- **Stat values:** `text-2xl font-medium`
- **Body:** `text-sm`
- **Hints / units:** `text-xs`

---

## Spacing & Shape

| Property | Value |
|---|---|
| Card border radius | `rounded-lg` |
| Input / badge radius | `rounded-md` |
| Card padding | `p-4` |
| Card gap | `gap-2.5` (10px) |
| Sidebar width (expanded) | `w-[200px]` |
| Sidebar width (collapsed) | `w-14` (56px) |
| Topbar height | `h-10` (40px) |
| All borders | `border border-[--border]` |

---

## Components

### Sidebar

- Fixed left, transitions between 200px (expanded) and 56px (collapsed)
- **Top:** FORGE logo (expanded) / "F" (collapsed)
- **Nav items:** dot indicator + label (expanded), dot only (collapsed)
- **Active state:** lime bg (`--active-nav-bg`), lime text, 2px right border (`--accent`)
- **Bottom:** streak counter, theme toggle pill, user avatar + name + level
- Collapsed: bottom section hidden except avatar dot

### Topbar

- 40px tall, sits at top of content area (right of sidebar)
- **Left:** hamburger/collapse button (3-line icon)
- **Center-left:** page title (uppercase, secondary color, wide tracking)
- **Right:** 🔥 streak count, then avatar circle

### Stat Cards

- 4-column grid on dashboard
- Structure: label (uppercase, muted) → large value → colored sub-line
- Sub-line uses accent color except weight delta which uses success green

### Progress Bars (Macros)

- Three bars: Protein (accent), Carbs (accent-mid), Fat (accent-light)
- Track background: `--track` token
- Label left, value right, bar spanning full width below

### Progress Ring (Daily Goal)

- SVG donut, `stroke-width` 6
- Track: `--track` token
- Fill: `--accent`
- Center: percentage + "of daily goal"

### Weekly Tracker

- 7 circles (M–S) with day label above
- Done: lime bg, dark checkmark
- Rest: track bg, muted dash
- Today: lime border, lime dot

### Theme Toggle

- 36×20px pill track
- 14px white thumb
- Off state (light mode): track bg
- On state (dark mode): accent track

### Buttons

- **Primary:** `bg-[--accent] text-black font-semibold rounded-lg`
- **Secondary:** `bg-[--surface] border border-[--border] text-[--text-primary] rounded-lg`

### Inputs

- `bg-[--surface] border border-[--border] text-[--text-primary] rounded-md`
- Focus: `focus:border-[--accent] focus:outline-none`
