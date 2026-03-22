# Control Repo Layout

## Canonical shape

This repository now uses a single control-repo layout:

```text
sandunpack/
  HANDOFF.md
  fixtures/
  notes/
  scripts/
  vendor/
    sandpack/
```

`vendor/sandpack/` is the tracked source of truth for Sandpack code inside this repo.

## Why this shape

- Cloud agents only need write access to one repository.
- Fixtures, notes, and Sandpack edits can land in one branch and one PR.
- We can still prepare upstreamable Sandpack patches later by extracting changes from `vendor/sandpack/`.

## Optional scratch clone

An ignored sibling clone may still exist at `/sandpack/` for direct upstream operations, but it is optional and no longer required for day-to-day research.

## Working flow

1. Install vendored Sandpack dependencies:
   - `pnpm install:vendor`
2. Build vendored packages used by fixtures:
   - `pnpm build:vendor`
3. Build or run fixtures from the root repo:
   - `pnpm check:fixtures`
   - `pnpm build:fixtures`
   - `pnpm dev:minimal-race-react`

## Sync / export options

- Direct-control path:
  - edit `vendor/sandpack/` directly
  - validate through the local fixtures
  - keep everything in one repo/PR
- Patch-export path:
  - once a fix is valuable, extract the `vendor/sandpack/` delta into a dedicated Sandpack fork branch or patch series
  - use that smaller branch for upstream PR prep

## Current fixture dependency rule

All fixtures should link to:

- `../../vendor/sandpack/sandpack-client`
- `../../vendor/sandpack/sandpack-react`
- `../../vendor/sandpack/sandpack-themes`

Future generated fixtures should preserve that layout.
