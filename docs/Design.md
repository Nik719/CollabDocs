# Design — CollabDocs frontend

Audience: designer + frontend dev. Scope: the React SPA (Phases 8–9). Keep it clean, minimal, document-tool feel (Notion-adjacent, not a clone).

## 1. Design principles

1. **Content first** — documents are the hero; chrome stays quiet.
2. **Obvious state** — versioning and roles are core concepts; always show "v3 · saved 2m ago by Priya" style context.
3. **No dead ends** — every list has an empty state with a primary action; every fetch has loading + error states.

## 2. Color palette (Tailwind tokens)

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#4F46E5` (indigo-600) | Primary buttons, links, active nav, focus rings |
| `primary-hover` | `#4338CA` (indigo-700) | Hover states |
| `ink` | `#111827` (gray-900) | Headings, body text |
| `ink-muted` | `#6B7280` (gray-500) | Secondary text, timestamps, metadata |
| `surface` | `#FFFFFF` | Cards, panels, editor |
| `bg` | `#F9FAFB` (gray-50) | App background |
| `border` | `#E5E7EB` (gray-200) | Card borders, dividers, inputs |
| `success` | `#059669` (emerald-600) | Published status, success toasts |
| `warning` | `#D97706` (amber-600) | Draft status |
| `neutral-badge` | `#6B7280` (gray-500) | Archived status |
| `danger` | `#DC2626` (red-600) | Errors, destructive actions |

Status badges: draft = amber tint (`amber-50` bg / `amber-700` text), published = emerald tint, archived = gray tint. Role badges: admin = indigo tint, editor = sky tint, viewer = gray tint.

Light mode only for v1.

## 3. Typography

| Use | Font | Size / weight |
|---|---|---|
| UI + headings | **Inter** (Google Fonts; fallback system-ui) | H1 24/semibold · H2 20/semibold · H3 16/semibold |
| Body | Inter | 14/regular, `ink` |
| Metadata / captions | Inter | 12/regular, `ink-muted` |
| Document editor content | Inter | 16/regular, line-height 1.7 |
| Code/IDs (UUIDs, audit log) | **JetBrains Mono** | 12/regular |

## 4. Layout & spacing

- App shell: fixed left sidebar 240px (nav: Workspaces, Documents, Audit Logs; acting-user card pinned at bottom) + topbar 56px (breadcrumb, page actions) + content max-width 960px, centered, 24px padding.
- Spacing scale: Tailwind default (4px base). Cards: `rounded-xl`, 1px `border`, subtle shadow (`shadow-sm`), 16–24px padding.
- Responsive: desktop-first; at <768px sidebar collapses to a hamburger drawer. Mobile polish is not a v1 goal.

## 5. Core components

| Component | Spec |
|---|---|
| Button | Primary (indigo, white text), Secondary (white, border, ink text), Danger (red). Height 36px, `rounded-lg`, disabled at 50% opacity |
| Input / Select / Textarea | 36px (textarea auto), `rounded-lg`, `border`, focus ring `primary` 2px |
| Badge | Pill, 12px text, tinted bg per §2 |
| Card | Per §4; list rows are cards or bordered rows with hover `bg-gray-50` |
| Modal | Centered, max-w 480px, overlay `black/40`; used for create workspace, add member, create user |
| Toast | Bottom-right; success (emerald) / error (red); auto-dismiss 4s |
| Avatar | Initials on indigo-100 bg, 28px circle |
| Empty state | Icon + one line + primary button |
| Skeleton | Gray shimmer blocks for lists while loading |

Icons: lucide-react, 16–20px, `ink-muted`.

## 6. Screens

**Select acting user** — centered card, user list (avatar, name, email) + "New user" modal. Selecting stores the acting user; banner in sidebar shows who you are with a "Switch" link.

**Workspaces** — grid of workspace cards: name, member count, doc count (from summary), created date, active badge. "New workspace" primary button (modal: name; owner = acting user).

**Workspace detail** — header (name, summary stats as 3 stat cards: documents / members / comments), members table (avatar, name, role badge, joined date) + "Add member" modal (user select + role select; 409 → inline error "Already a member"), documents list scoped to this workspace.

**Documents** — filter bar: workspace select, status select, tag select, search input (debounced 300ms, hits `?search=`). Table rows: title, workspace, status badge, tags, updated_at. "New document" button.

**Document editor** — the key screen. Title (inline editable), status select, tag chips (+ add). Large textarea (plain text) with **Save** button → toast "Version {n} saved". Right side panel with tabs: **Versions** (list: v{n}, saved_by, saved_at; click to view snapshot read-only, "current" pinned top) and **Comments** (thread: top-level comments with nested replies one level indented, reply inline, composer at bottom; author = acting user).

**Audit logs** — filter bar (actor select, date from/to), table: timestamp (mono), actor, action badge (created = emerald / updated = indigo), model, object_id (mono, truncated with copy button).

## 7. Interaction details

- Save is explicit (button + `Ctrl/Cmd+S`), never autosave — every save is a version, so make it deliberate. Dirty state: "Unsaved changes" dot next to Save.
- Destructive/none: v1 has no deletes in the API — don't design delete affordances.
- Errors: API `{"error": msg}` → toast with that message; field validation errors render under the input.
- All timestamps relative ("2m ago") with absolute on hover.
