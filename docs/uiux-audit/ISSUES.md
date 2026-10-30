# Comprehensive UI/UX Audit Issues Log

**Product:** Backend Visual Lab (`backend-visual-lab`)  
**Audit Pass:** Phase 1, 3, 4 & 5 — Audit, Root Cause Analysis, Fix Implementation & Verification  
**Date:** October 30, 2026  
**Status:** **RESOLVED & VERIFIED (All 10/10 Issues Fixed & Tested)**

---

## Issue Summary Matrix

| ID | Route | Component | Category | Severity | Status | Verification |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **ISSUE-01** | `/domains/:domainId/:moduleSlug` | `ModuleReaderPage` | Responsive / Layout | **High** | **Verified Fixed** | Playwright (0px overflow on 360/390px) |
| **ISSUE-02** | `/` | `CatalogPage` (`.domain-grid`) | Responsive / Layout | **High** | **Verified Fixed** | Playwright (0px overflow on 360/390px) |
| **ISSUE-03** | `/knowledge` | `KnowledgePage` | Responsive / Layout | **High** | **Verified Fixed** | Playwright (0px overflow on 360/390px) |
| **ISSUE-04** | `/progress` | `ProgressPage` | Responsive / Layout | **Medium** | **Verified Fixed** | Playwright (0px overflow on 360/390px) |
| **ISSUE-05** | `/domains/:domainId/:moduleSlug` | `InteractiveWorkbench` (`.view-mode-toolbar`, custom controls) | Responsive / Layout | **Medium** | **Verified Fixed** | Playwright (Custom controls stack cleanly) |
| **ISSUE-06** | Global (All Routes) | `tokens.css` (Light Theme) | Theme / Visual | **Medium** | **Verified Fixed** | Visual inspection (Screenshots in Light mode) |
| **ISSUE-07** | Global Topbar | `Topbar` (`.breadcrumb`) | Visual / Responsive | **Low** | **Verified Fixed** | Playwright (Title receives full width on <=640px) |
| **ISSUE-08** | `/domains/:domainId/:moduleSlug` | `InteractiveWorkbench` (Transport buttons) | Interaction / A11y | **Low** | **Verified Fixed** | Playwright & Vitest unit tests |
| **ISSUE-09** | Global Topbar | `Topbar` (Shortcuts HUD Modal) | Interaction / Keyboard | **Medium** | **Verified Fixed** | Playwright keyboard escape test |
| **ISSUE-10** | Global (Buttons & Tabs) | Shared Button & Tab Primitives | Interaction / A11y | **Low** | **Verified Fixed** | Axe-core WCAG audits (0 violations) |

---

## Detailed Root Cause Analysis & Verification

### ISSUE-01: Pedagogy Stepper, Long Technical Identifiers & Header View Toolbar Horizontal Overflow on Mobile
- **Route:** All 14 Lab Routes (`/domains/:domainId/:moduleSlug`)
- **Component:** `ModuleReaderPage.tsx`, `workbench.css`, `tokens.css`
- **Category:** Responsive / Layout
- **Severity:** **High**
- **Root Cause:**
  1. `.view-mode-toolbar` lacked `flex-wrap: wrap`, causing the "COCKPIT VIEWPORT MODE:" label and mode buttons to measure > 440px width.
  2. Long unspaced technical identifiers (such as `userCache.findUser(id).orElse(...)`, `kafka_server_GroupCoordinator_RebalanceRateAndTimeMs`) in `.question-stem` and `.stage-paragraph` did not wrap because default CSS is `overflow-wrap: normal`.
  3. `.pedagogy-stepper` lacked explicit `max-width: 100%; box-sizing: border-box; min-width: 0;` and smooth touch scrolling.
  4. `.inspector-tabs` lacked `overflow-x: auto` and tab buttons lacked `flex-shrink: 0; white-space: nowrap`.
- **Implementation Fix:**
  - In `workbench.css`, added `flex-wrap: wrap` to `.view-mode-toolbar` and responsive single-column layout on `@media (max-width: 640px)`.
  - Added `overflow-x: auto; max-width: 100%; box-sizing: border-box; -webkit-overflow-scrolling: touch; scrollbar-width: none;` to `.pedagogy-stepper` and `.inspector-tabs`.
  - Added `overflow-wrap: anywhere; word-break: normal;` to `.question-stem`, `.choice-text`, `.stage-paragraph`, and global paragraph tokens.
  - Constrained `.pedagogy-stage-card`, `.assessment-container`, and `.question-card` with `max-width: 100%; min-width: 0; box-sizing: border-box;`.
- **Verification:**
  - Automated Playwright audit across 360×800 and 390×844 viewports passed with **0 layout defects** and **0px horizontal overflow**.

---

### ISSUE-02: Catalog Domain Cards Grid Overflow on Small Viewports (360px)
- **Route:** `/`
- **Component:** `CatalogPage.tsx` (`.domain-grid`, `catalog.css`)
- **Category:** Responsive / Layout
- **Severity:** **High**
- **Root Cause:**
  - `catalog.css` specified `grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))`. On 360px screens with container padding, available width is only ~320px, forcing card overflow.
- **Implementation Fix:**
  - In `catalog.css`, updated grid to `repeat(auto-fill, minmax(min(100%, 300px), 1fr))`.
  - In `layout.css`, tightened `.main-content` padding on small mobile (`@media (max-width: 480px)` to `var(--space-4) var(--space-3) var(--space-8)`).
- **Verification:**
  - Verified on 360×800 and 390×844 viewports: 0 horizontal overflow, catalog cards stretch responsively.

---

### ISSUE-03: Knowledge Page Two-Column Question Layout & Term Grid Overflow
- **Route:** `/knowledge`
- **Component:** `KnowledgePage.tsx`
- **Category:** Responsive / Layout
- **Severity:** **High**
- **Root Cause:**
  - Inline grid styles in `KnowledgePage.tsx` used hardcoded minimum widths (`minmax(320px, 1fr)` and `minmax(260px, 320px) 1fr`), forcing two rigid columns on narrow mobile screens.
- **Implementation Fix:**
  - Updated Question Practice layout to `repeat(auto-fit, minmax(min(100%, 300px), 1fr))` with vertical stacking on narrow viewports.
  - Updated Key Terms and Sources grids to `repeat(auto-fill, minmax(min(100%, 280px), 1fr))`.
  - Added horizontal touch scrolling (`overflowX: "auto"`) to the knowledge category navigation tabs.
- **Verification:**
  - Verified in Playwright audit: 0 horizontal overflow across all tabs on mobile viewports.

---

### ISSUE-04: Progress Page Competency Cards Hardcoded Minimum Width
- **Route:** `/progress`
- **Component:** `ProgressPage.tsx`
- **Category:** Responsive / Layout
- **Severity:** **Medium**
- **Root Cause:**
  - Competency domain cards grid used `repeat(auto-fit, minmax(320px, 1fr))`.
- **Implementation Fix:**
  - Updated grid to `repeat(auto-fit, minmax(min(100%, 280px), 1fr))`.
- **Verification:**
  - Verified on 360×800 viewport: 0 horizontal overflow, cards stack cleanly.

---

### ISSUE-05: Simulation Custom Action Controls Toolbar Mobile Wrapping
- **Route:** `/domains/:domainId/:moduleSlug`
- **Component:** `InteractiveWorkbench.tsx` (`renderCustomControls`, `workbench.css`)
- **Category:** Responsive / Layout
- **Severity:** **Medium**
- **Root Cause:**
  - Action button container lacked responsive wrapping and padding on small screens.
- **Implementation Fix:**
  - Added `.workbench-mutation-toolbar` class with `flex-wrap: wrap; max-width: 100%; box-sizing: border-box;`.
  - Added mobile media query styles for `.lane-block` and `.cards-container` to stack cleanly on `< 640px`.
- **Verification:**
  - Verified across all 14 simulation workbenches: buttons wrap and remain fully interactive without clipping.

---

### ISSUE-06: Light Theme Surface Contrast & Border Definition Refinement
- **Route:** Global (All Routes)
- **Component:** `tokens.css` (`[data-theme="light"]`)
- **Category:** Theme / Visual
- **Severity:** **Medium**
- **Root Cause:**
  - Light theme borders (`#dcd7ce`) had low delta-E contrast against paper background (`#f6f5f1`).
- **Implementation Fix:**
  - Calibrated border tokens:
    - `--border-subtle: #d3cec4`
    - `--border-bold: #bfb8aa`
    - `--border-strong: #a9a293`
- **Verification:**
  - Verified through automated screenshot capture of all 18 routes in Light Mode: cards and panels display distinct, legible borders.

---

### ISSUE-07: Topbar Breadcrumbs Truncation on Mobile Viewports (< 640px)
- **Route:** Global Topbar
- **Component:** `Topbar.tsx` (`layout.css`)
- **Category:** Visual / Responsive
- **Severity:** **Low**
- **Root Cause:**
  - Static prefix `"Backend Visual Lab /"` consumed over 50% of header width on mobile screens, leaving the actual topic title truncated.
- **Implementation Fix:**
  - In `layout.css`, added `@media (max-width: 640px) { .breadcrumb-prefix, .breadcrumb-sep { display: none; } }`.
  - Added `@media (max-width: 440px) { .engine-badge { display: none; } }` to eliminate header button crowding.
- **Verification:**
  - Verified in Playwright audit on 390px and 360px: lab title receives full remaining Topbar width.

---

### ISSUE-08: Transport Control Reset Button Accessible Name Compliance
- **Route:** All 14 Labs
- **Component:** `InteractiveWorkbench.tsx`
- **Category:** Interaction / A11y
- **Severity:** **Low**
- **Root Cause:**
  - Visible button text was `"Reset"`, `aria-label` was `"Reset to initial state"`.
- **Implementation Fix:**
  - Standardized `aria-label="Reset simulation to initial state [R]"` and `title="Reset simulation to initial state [R]"`.
- **Verification:**
  - Tested in Playwright E2E and Vitest unit suite: 100% passing.

---

### ISSUE-09: Shortcuts HUD Dialog Missing Keyboard Escape Listener
- **Route:** Global Topbar
- **Component:** `Topbar.tsx`
- **Category:** Interaction / Keyboard
- **Severity:** **Medium**
- **Root Cause:**
  - Modal did not listen for `Escape` key events to dismiss.
- **Implementation Fix:**
  - Added `useEffect` in `Topbar.tsx` listening for `e.key === "Escape"` when `showShortcutsModal` is open.
- **Verification:**
  - Verified via keyboard automation in Playwright E2E: modal dismisses immediately on `Escape`.

---

### ISSUE-10: Consistent Keyboard Focus Visible Indicator for Controls
- **Route:** Global
- **Component:** Shared Button & Tab Primitives (`layout.css`, `workbench.css`)
- **Category:** Interaction / A11y
- **Severity:** **Low**
- **Root Cause:**
  - Custom buttons and tab items lacked an explicit, accessible `:focus-visible` ring.
- **Implementation Fix:**
  - Added global `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`.
  - Added explicit focus ring styles for `.pedagogy-stepper-btn`, `.inspector-tab-btn`, and `.filter-chip`.
- **Verification:**
  - Tested with axe-core in Playwright E2E: 0 accessibility violations.
