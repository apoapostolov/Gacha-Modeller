# AGENTS.md: Gacha-Modeller

Project contract. Wins over `/mnt/c/git/defaults/AGENTS.md`.

## Identity

- **Name:** Gacha Modeller
- **Domain:** gacha / lootbox / random-pick simulation, pity, spark, social and marketing mechanics
- **Stack:** Vite 6 + React 19 + TypeScript. Engine is pure TS, UI is a thin lab around it.
- **Path:** `/mnt/c/git-public/Gacha-Modeller`
- **Port:** Vite default **3018**. Not on the 10001+ managed band yet (hold).

## Source hierarchy

1. Explicit user instruction
2. This file
3. `/mnt/c/git/defaults/AGENTS.md`
4. `README.md`, `TODO.md`, `docs/methodology.md`, `CHANGELOG.md`
5. `src/engine/`, then `src/presets/`, then `src/App.tsx`

## Rules

- Reader-facing copy (README, changelog, `docs/`, preset `blurb`/`notes`, UI chrome) uses **warm Human**: direct you, contractions, no em dash, no fake first person, no performative empathy. Numbers and citations stay exact.
- The engine is the product. Presets are data. Do not hide probability logic in React.
- Studied presets are like-models. Cite the shape in `source`. Never paste a licensed live drop table. Never name a preset as the live game without `-like`.
- Original mechanics stay `family: 'original'` with `source: 'original'`.
- Pity, capturing, spark, and mean windows need a vitest. If you change `pull.ts`, run `npm test`.
- Seeded RNG only (`mulberry32`). No `Math.random` in the engine.
- Local-only. No accounts, no telemetry, no remote banners.
- `/mnt/c` watchers poll. Vite already polls at 300ms.
- Do not onboard a systemd unit on 10001+ unless Apo asks for daily use.

## Work loop

```bash
npm test
npm run typecheck
npm run dev
```

Dev is http://127.0.0.1:3018/. After UI edits, confirm HMR; do not assume `/mnt/c` inotify.

## Learning

Reusable pieces: pity-state machines, capturing 50/50, spark-as-cap, shared-pity vs fragmented cycles. Promote those to notes here or a skill only after they have been used twice.
