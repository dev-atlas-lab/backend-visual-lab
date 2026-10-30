---
name: react-engineering
description: >-
  Guides React 19, TypeScript 5.9, Vite 6, React Router 7, and Zustand 5 frontend
  implementation for Backend Visual Lab. Activate this skill when building UI components,
  layout shells, state stores, routes, or interactive lab workbenches in frontend/.
---

# React Engineering Skill

## 1. Clear Purpose
Ensure all frontend code in `frontend/` is built with strict TypeScript 5.9, accessible semantic HTML, token-driven CSS variables, deterministic Zustand playback stores, and responsive React 19 patterns.

## 2. When to Use It
- Implementing or refactoring pages, layout navigation, module readers, playback controls, or state inspector panels in `frontend/src/`.
- Managing simulation playback state (Play, Pause, Step Forward, Step Back, Reset, Preset Switching) via Zustand or React hooks.
- Implementing Dark / Light / System theme support and responsive desktop/mobile drawers.

## 3. Required Technical Knowledge
- **React 19**: Functional components, `useMemo`, `useCallback`, `useId`, `useSyncExternalStore`, `React.lazy` route code-splitting.
- **TypeScript 5.9 Strict Mode**: Discriminated unions, generics (`SimulationStepFrame<TState, TEvent>`), `noImplicitAny`, `strictNullChecks`, and `zod` type inference (`z.infer<typeof schema>`).
- **React Router 7**: `createBrowserRouter`, URL search parameter synchronization (`useSearchParams`) for deep-linking simulation presets (`?preset=rebalance-eager`).
- **Accessibility (WCAG 2.1 AA)**: Landmark roles (`<main>`, `<nav>`, `<aside>`), `aria-current="page"`, `aria-live="polite"` for step narrations, visible `:focus-visible` rings, keyboard operation, and `prefers-reduced-motion`.

## 4. Step-by-Step Workflow
1. **Inspect Existing Tokens & Primitives**: Check `frontend/src/styles/tokens.css` and `frontend/src/components/ui/` before creating new styles or components.
2. **Type-First Component Design**: Define explicit TypeScript prop interfaces. Never use `any` or untyped event payloads.
3. **Connect Pure Engines via Controllers**:
   - Read curriculum data from validated registries in `frontend/src/content/`.
   - Drive simulations through the pure simulation runner hook/store (`useSimulationController`), keeping timer side effects (`useEffect` playback intervals) cleanly separated from pure step reducers.
4. **Enforce Responsive & Theme Ergonomics**:
   - Use only CSS custom properties (`var(--surface-1)`, `var(--text-primary)`, `var(--border-subtle)`) so Dark and Light themes remain 100% consistent.
   - Verify layout at `1440px` (desktop workbench), `768px` (tablet), and `390px` (mobile viewport).
5. **Run Verification Gates**: Execute `npm --prefix frontend run typecheck`, `lint`, `test`, and `build`.

## 5. Engineering Constraints
- **No Next.js or SSR Frameworks**: Keep the Vite 6 SPA architecture.
- **No Dead Controls**: Every button, tab, filter chip, or slider rendered in the UI must have a working handler and observable state effect.
- **Safe Storage Access**: Always wrap `localStorage` reads/writes in `try/catch` with in-memory fallback so private browsing or restricted storage never crashes the app.

## 6. Common Mistakes
- **Mistake 1**: Hardcoding hex/RGB colors in component CSS or inline SVG attributes instead of referencing theme tokens in `tokens.css`.
- **Mistake 2**: Forgetting to clear playback `setInterval` timers when unmounting a lab component or switching simulation presets.
- **Mistake 3**: Mutating state arrays (`state.partitions.push(...)`) inside React state or Zustand stores instead of producing immutable updates.

## 7. Validation Checklist
- [ ] `npm --prefix frontend run typecheck` passes with 0 errors.
- [ ] `npm --prefix frontend run lint` passes with 0 warnings/errors.
- [ ] All interactive controls have accessible labels (`aria-label` or visible text) and keyboard focus styles.
- [ ] Both `data-theme="dark"` and `data-theme="light"` render legible contrast (WCAG AA).

## 8. References to Authoritative Documentation
- React 19 Official Documentation: https://react.dev/reference/react
- React Router v7 Documentation: https://reactrouter.com/
- WAI-ARIA Authoring Practices Guide (APG): https://www.w3.org/WAI/ARIA/apg/
- Zod Documentation: https://zod.dev/
