# Storybook — Superchart Overlay Showcase

## Running

```bash
pnpm storybook   # http://localhost:6007
```

## Structure

- **`overlay-stories/*.stories.tsx`** — Storybook stories. Each story renders a `SuperchartCanvas` and demonstrates one overlay/API feature.
- **`overlay-stories/overlays/*.ts`** — Stub API files. These define the contract (interfaces + functions) that the Superchart dev implements. Stories import from here.
- **`helpers/`** — Shared utilities (`SuperchartCanvas`, `useCurrentPrice`, etc.) used by stories.

## Adding a new overlay

1. Create the stub in `overlay-stories/overlays/my-feature.ts` — export the interface and function signatures with empty/noop implementations.
2. Create the story in `overlay-stories/MyFeature.stories.tsx` — import from the stub, wire up controls and a HUD to visualize the behavior.
