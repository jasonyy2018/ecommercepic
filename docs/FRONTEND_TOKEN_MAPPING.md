# Frontend Token Mapping

This maps Pencil design tokens to implementation classes in `frontend/src/app/globals.css`.

## Color Tokens

- `Primary #0F172A` -> `--carpet-primary`
- `Accent #E42313` -> `--carpet-accent`
- `Bg Soft #F7F8FC` -> `--carpet-bg-soft`
- `Border #E6E8EE` -> `--carpet-border`
- `Text #121420` -> `--carpet-text`
- `Text Muted #6B7285` -> `--carpet-text-muted`

## Spacing / Radius

- Spacing scale -> `--carpet-space-*` (`4/8/12/16/24/32`)
- Radius scale -> `--carpet-radius-*` (`0/6/10/14`)

## Reusable UI Classes

- Cards -> `.carpet-card`
- Panels -> `.carpet-panel`
- Inputs -> `.carpet-input`
- Primary button -> `.carpet-btn-primary`
- Accent button -> `.carpet-btn-accent`
- Secondary button -> `.carpet-btn-secondary`
- Tags -> `.carpet-tag` + variant classes:
  - `.carpet-tag-info`
  - `.carpet-tag-success`
  - `.carpet-tag-warning`

## Current Usage

- Create page: `src/app/create/page.tsx`
- Tasks page: `src/app/tasks/page.tsx`
- Task detail page: `src/app/tasks/[taskId]/page.tsx`

