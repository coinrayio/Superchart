# Feature flags

Superchart exposes a TradingView-style feature-flag system for opting UI
features and behaviors in or out without code changes. Each flag has a
documented default; consumers override per-instance via `enabledFeatures`
and `disabledFeatures` in `SuperchartOptions`, or at runtime via
`superchart.setFeatureEnabled(flag, enabled)`.

```typescript
import { Superchart, type FeatureFlag } from 'superchart'

new Superchart({
  // …
  enabledFeatures: ['crosshair_magnet'],
  disabledFeatures: ['drawing_bar', 'right_click_menu'],
  autoSaveDelay: 1500,  // companion option (number, not flag)
})
```

If a flag appears in both arrays, **`disabledFeatures` wins** — same as
TradingView.

## Runtime API

```typescript
superchart.isFeatureEnabled('drawing_bar')      // → boolean
superchart.setFeatureEnabled('drawing_bar', true)
```

Inside React components rendered under a Superchart instance:

```typescript
import { useFeature } from 'superchart'

function MyOverlay() {
  if (!useFeature('study_templates')) return null
  // …
}
```

`useFeature` re-renders the component when the flag is toggled — no chart
remount required.

## Flag catalog

### Toolbars / chrome

| Flag                | Default | Effect                                                             |
|---------------------|---------|--------------------------------------------------------------------|
| `drawing_bar`       | `false` | Show the left-side drawing toolbar.                                |
| `period_bar`        | `true`  | Show the top period/symbol toolbar. When `false`, the chart canvas reclaims the space. |
| `screenshot_button` | `true`  | Show the screenshot button in the period bar.                      |
| `fullscreen_button` | `true`  | Show the fullscreen button in the period bar.                      |
| `symbol_search`     | `true`  | Show the symbol-search button + modal.                             |
| `period_picker`     | `true`  | Show the period selector in the period bar.                        |
| `indicator_picker`  | `true`  | Show the indicator-modal launcher button.                          |

### Interaction

| Flag                | Default | Effect                                                             |
|---------------------|---------|--------------------------------------------------------------------|
| `right_click_menu`  | `true`  | Open the overlay context menu on right-click. When disabled, the browser context menu is still suppressed but our menu doesn't open — useful when you want to handle right-click via `onOverlayRightClick`. |
| `longpress_menu`    | `true`  | Same as `right_click_menu` but for mobile long-press.              |
| `crosshair_magnet`  | `false` | Enable magnet mode for drawing tools (snap to OHLC values).        |

### Persistence

| Flag                | Default | Effect                                                             |
|---------------------|---------|--------------------------------------------------------------------|
| `auto_save_state`   | `true`  | Auto-save chart state to the StorageAdapter on every mutation. When disabled, the consumer must call `superchart.saveState()` explicitly. |

**Companion option (numeric, not a flag):**

| Option            | Type     | Default | Effect                                                         |
|-------------------|----------|---------|----------------------------------------------------------------|
| `autoSaveDelay`   | `number` | `0`     | Debounce window in milliseconds. `0` saves on every mutation (current behavior). `>0` collapses rapid mutations into one save after N ms idle. Mirrors TradingView's `auto_save_delay`. |

`autoSaveDelay` lives on `SuperchartOptions` directly (not in the flag
union) because flags are strictly boolean. Set them together: turn off
`auto_save_state` for full manual control, or keep it on with a non-zero
`autoSaveDelay` to throttle.

On unmount, any pending debounced save is flushed best-effort
(last-write-wins) so closing a tab doesn't lose in-flight edits.

### Templates / browser (reserved for future tickets)

These flags exist now so consumers can pre-disable them, but the
underlying UIs land in [PERSISTENCE_ROADMAP.md](../PERSISTENCE_ROADMAP.md)
Tickets 4–7. Defaults are `true` so the UIs appear automatically when
shipped.

| Flag                  | Default | Effect (when wired)                              |
|-----------------------|---------|--------------------------------------------------|
| `study_templates`     | `true`  | "Save / Load template" submenu in indicator settings. |
| `drawing_templates`   | `true`  | "Save as default / Apply default" buttons in the floating overlay-style popup. |
| `chart_templates`     | `true`  | "Save layout as template / Apply template" entries in the period-bar settings menu. |
| `multi_chart_browser` | `true`  | "Open chart" UX listing all saved layouts.       |

### Chart visuals

| Flag                     | Default | Effect                                              |
|--------------------------|---------|-----------------------------------------------------|
| `volume_in_legend`       | `true`  | Show the volume figure in the candle legend.        |
| `last_close_price_line`  | `true`  | Show the dashed line marking the last close price.  |

## Flags vs visibility state — they're complementary

Flags answer **"is this feature available?"** (developer-controlled). The
existing `drawingBarVisible` / `periodBarVisible` options answer **"is it
currently visible?"** (user-toggleable at runtime). Both remain on
`SuperchartOptions`:

| Concept                 | Where it lives                                                    | Example                                          |
|-------------------------|-------------------------------------------------------------------|--------------------------------------------------|
| Feature available?      | `enabledFeatures` / `disabledFeatures` (per-flag boolean)         | `disabledFeatures: ['drawing_bar']` hides the toolbar AND the period-bar toggle that opens it. |
| Currently visible?      | `drawingBarVisible`, `periodBarVisible` (initial state, user-toggleable) | `drawingBarVisible: false` starts the toolbar collapsed; user can re-open via the period-bar menu (when the flag is on). |

Render rule: the drawing toolbar shows only when `drawing_bar` flag is on
**and** `drawingBarVisible` is `true`. Setting the flag to off hides both
the toolbar and the toggle button — the user has no entry point to a
disabled feature.

## Adding a new flag

1. Add it to the `FeatureFlag` union in `src/lib/features/types.ts`.
2. Set its default in `src/lib/features/defaults.ts` (the
   `Record<FeatureFlag, boolean>` shape enforces this — missing entries
   are a compile error).
3. Wire the consuming widget/hook to read it via `useFeature(flag)` or
   `store.isFeatureEnabled(flag)`.
4. Document it in this file with a one-line description of the effect.
5. Add it to `FLAG_CATEGORY` in `.storybook/api-stories/FeatureFlags.stories.tsx`
   so the storybook picks it up automatically.
