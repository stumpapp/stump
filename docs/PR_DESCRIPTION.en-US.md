# PR Description (to the upstream repo stumpapp/stump)

> Suggested PR: `dev/llm-tag` → `upstream/main` (or `develop`)
> Suggested PR title: **feat: i18n coverage, EPUB reader location drawer, LLM settings & auto-tagging**

---

## Overview

Based on `v0.1.11` (`d0f51c8e`), this PR is 12 commits ahead of the `dev/translate` baseline, touching 181 files (+10373 / -628). It includes five major parts:

1. **Expanded i18n coverage**: large amounts of previously hardcoded page text moved to automatic translation (react-i18next), with complete zh-CN / zh-TW translations added
2. **EPUB reader panel rework**: the Table of Contents / Bookmarks / Annotations panel changed from a centered modal to a left-side drawer (Sheet)
3. **LLM settings**: a new server settings page supporting OpenAI-compatible endpoint URL, model name, and an encrypted API key
4. **LLM auto-tagging**: single-book automatic tagging plus library-wide batch tag recommendation, integrated with the scheduler and a manual review flow
5. **Browse books by tag**: a new tag filter drawer in libraries to show related books by tag

---

## Major Changes

### 1. Expanded i18n coverage

- Migrated hardcoded page text (~60+ components across settings, books, series, readers, book clubs, explorer, tables, dialogs, etc.) to `react-i18next` automatic translation
- Locale files expanded substantially: `en-US.json` +729 lines, `zh-CN.json` +800 lines, `zh-TW.json` +718 lines
- See `plans/i18n-hardcoded-strings-plan.md` and `plans/i18n-hardcoded-strings-report.md` for the migration plan and report

### 2. EPUB reader panel rework

- `LocationManager` (TOC / Bookmarks / Annotations) switched from a centered `Dialog` modal to a left-side `Sheet` drawer:
  - `SheetPrimitive.Content position="left" size="sm"` with built-in `slide-in-from-left` animation and full-height layout
  - Content area changed from fixed `300px` height to drawer-adaptive (`flex-1 overflow-y-auto`)
  - Uses the Sheet's built-in `closeIcon`; controlled `open`/`onOpenChange` semantics unchanged
- Translation keys updated in `EpubReaderHeader`, `TableOfContents`, `FontSizeControl`, `LineHeightControl`

### 3. LLM settings

- New server settings page `settings/server/llm` (`LLMSettingsScene.tsx`):
  - Configurable: LLM endpoint URL, model name, API key (password input, stored encrypted)
  - zod form validation, saved via the `updateLlmConfig` mutation
- `LlmTaggingConfigCard.tsx`: parameter configuration for auto-tagging jobs (batch size, triggering, etc.)
- New `server_config` migration columns: `llm_url`, `llm_model_name`, `llm_encrypted_api_key` (all nullable)
- New backend crate `crates/integrations/llm`: an OpenAI-compatible chat/completions client with exponential-backoff retries on 429/5xx and a governor-based rate limiter; the API key is decrypted only in memory

### 4. LLM auto-tagging

- Core implementation in `core/src/llm_tagging/`:
  - `job.rs` (620 lines): single-book auto-tagging job — reads book metadata/content summary and asks the LLM for tag suggestions
  - `library_job.rs` (648 lines): library-wide batch tag recommendation — scans the library in batches and produces tag suggestions and assignment drafts
  - `mod.rs`: shared service logic (suggestion dedup, confidence thresholds, draft management)
- Scheduler integration: `core/src/job/dispatch.rs` and `scheduler.rs` register the LLM tagging jobs for scheduled runs (reusing the `scheduled_job` mechanism)
- GraphQL layer: `mutation/llm_tagging.rs` (trigger jobs, review suggestions, apply/reject drafts), `query/llm_tagging.rs` (query suggestions and drafts), `object/llm_tagging.rs`
- Data model: new `llm_tag_suggestion` and `llm_library_tag_draft` entities plus migration `m20261026_000000_llm_tagging`
- Manual review UI (`components/metadata/llmTagging/`):
  - `LlmAutoTaggingSection`: single-book tagging entry point and job status
  - `LibraryTagAnalysisSection`: library-wide tag analysis results
  - `PendingTagSuggestionsTable` + `TagReviewDialog`: review, apply, or reject suggestions one by one
  - `useLlmTagActions` / `useLlmTagReviewStore`: action and review state management

### 5. Browse books by tag

- New `TagFilterDrawer` component (`components/filters/`): filter books by tag within a library
  - Queries `libraryTags(id/name/count)`; multi-select tags applied via `filters.tags.anyOf`
  - Responsive: full-width Sheet on mobile, side drawer on desktop
- `query/tag.rs` / `object/tag.rs` extended with tag counts and related queries
- Wired into book/series listing scenes (`LibraryBooksScene`, `SeriesBooksScene`, `MediaFilterForm`, `SeriesFilterForm`)

---

## Database Migrations (run automatically)

| Migration | Content |
| --- | --- |
| `m20261025_000000_add_llm_config` | `server_config` gains `llm_url`, `llm_model_name`, `llm_encrypted_api_key` |
| `m20261026_000000_llm_tagging` | New `llm_tag_suggestion` and `llm_library_tag_draft` tables |

Both include `down` rollbacks; all columns are nullable and non-destructive to existing data.

## Compatibility & Notes

- LLM features are **opt-in**: without a configured URL / API key, all LLM-related entry points stay hidden and existing behavior is unaffected
- API keys are encrypted at rest and decrypted only in memory at runtime
- GraphQL schema additions (`schema.graphql` +242); generated client code (`packages/graphql`) updated in sync
- `apps/web/.env.local` contains only a local server URL example, no secrets
- New documentation: `docs/docker-deployment-faq.md` (Docker deployment FAQ)

## Verification

- `tsc -b` typecheck passes (browser side)
- Rust side: `cargo` build / clippy pass (`core`, `crates/integrations/llm`, `crates/graphql`)
- Manual verification:
  - EPUB reader: TOC / Bookmarks / Annotations drawer slides out from the left; selecting an entry closes it automatically
  - After saving LLM settings, single-book tagging and library-wide recommendation jobs can be triggered; suggestions can be reviewed and applied
  - Tag filter drawer works on library and series pages

## Commits (`dev/translate..dev/llm-tag`)

```
2402f8ea location panel: centered modal -> left drawer
5a903d23 select tags to show books done
3a14160d llm add book tags
2cbc69ef library batch tag recommendation + single-book auto-tagging (AI done)
140586a5 library batch tag recommendation + single-book auto-tagging (in progress)
73d77835 backup llm and tag
(several debug/backup commits will be squashed on merge)
```

## Appendix: Design Documents

- `plans/llm-auto-tagging-plan.md` — single-book auto-tagging design
- `plans/llm-library-tag-recommendation-plan.md` — library-wide tag recommendation design
- `plans/server-llm-settings-plan.md` — LLM settings page design
- `plans/sidebar-tags-feature-plan.md` — tag filter drawer design
- `plans/i18n-hardcoded-strings-plan.md` / `plans/i18n-hardcoded-strings-report.md` — i18n migration plan and report
