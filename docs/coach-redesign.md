# Coach Experience Redesign

## Overview
- Introduced cohesive coaching theme tokens (`src/components/coach/coachingTheme.ts`) for gradients, badges, and chip styles.
- Added dedicated assistant coach subcomponents (hero, focus strip, practice board, momentum timeline, wins panel, service pulse) to keep the page structure modular.
- Practice data now flows through `buildSalesUiModel` / `buildSupportUiModel` in `src/utils/coachingInsights.ts`, producing hero metrics, focus chips, practice previews, wins, and momentum entries for both modes.

## Component Map
- `src/pages/AssistantCoach.tsx` orchestrates summaries, UI models, and practice modal state.
- Reusable view components live in `src/components/coach/`:
  - `CoachHero`, `FocusStrip`, `PracticeBoard`
  - `CoachMomentumTimeline`, `CoachWinsPanel`, `ServicePulse`
  - Sales/support recommendation panels and analytics dashboards share updated styling.
- Practice sessions open via `PracticeSessionModal`, which now presents prioritized headers, focus chips, action lists, strengths, and supporting metrics.

## Data Flow
1. `useDashboard` fetches recordings.
2. `buildSalesCoachingSummary` / `buildSupportCoachingSummary` prepare analytics.
3. `buildSalesUiModel` / `buildSupportUiModel` convert summaries + recording map into UI-friendly models consumed by the page and recommendation components.
4. Practice previews convert to `PracticeSessionPayload` before launching the modal, ensuring modal copy stays aligned with coaching tone.

## Testing
- Updated `PracticeSessionModal` tests to reflect the new guided practice copy.
- Added coverage for the practice board interaction to guard the new callback contract.
