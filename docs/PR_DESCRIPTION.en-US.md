## Description

**TL;DR**: a reading-experience and feature combo — ① hardcoded text in ~60+ components migrated to i18n (all three locales in sync); ② the EPUB reader TOC / Bookmarks / Annotations panel changed from a centered modal to a left-side drawer; ③ new LLM server settings (OpenAI-compatible endpoint, encrypted API key); ④ LLM auto-tagging (single-book + library-wide batches, manual review + confidence threshold + merge-only strategy); ⑤ filter books by tag on library/series pages.

This branch is forked from `v0.1.11` (`d0f51c8e`) on the `nightly` history. No related existing issues or PRs were found; if a discussion is preferred first, I'm happy to convert this into an issue or discussion.

> LLM-assistance disclosure: LLM tools were used to assist with the code and this PR description, with manual review and quality checks on my end (tsc typecheck, cargo clippy, manual feature verification). Commits are not signed with any LLM tool.

Details per area below.

- **Summary of changes**

  1. **Expanded i18n coverage**
     - Previously hardcoded page text in ~60+ components migrated to `react-i18next` automatic translation, covering: settings (users / server / API keys / jobs / logs), books & series (overview, management, thumbnails, tag editors), book clubs, smart lists, explorer & upload, tables & filters, query builder, readers (EPUB / PDF / image-based), and confirmation dialogs
     - Locale files expanded in sync: `en-US.json` +729 lines, `zh-CN.json` +800 lines, `zh-TW.json` +718 lines
     - Migration scope and gap-check records in `plans/i18n-hardcoded-strings-plan.md` and `plans/i18n-hardcoded-strings-report.md`

  2. **EPUB reader panel rework**
     - The TOC / Bookmarks / Annotations panel `LocationManager` switched from `Dialog` (viewport-centered modal) to `Sheet` (`SheetPrimitive.Content position="left" size="sm"`), sliding out from the left
     - Content area changed from fixed `300px` height to drawer-adaptive (`flex-1 overflow-y-auto`), so long TOC / annotation lists scroll full-height
     - Uses the Sheet's built-in `closeIcon`; `Sheet` and `Dialog` are both `@radix-ui/react-dialog`, so accessibility semantics are identical and the controlled `open` / `onOpenChange` and "close on entry click" logic are unchanged
     - Translation keys updated in `EpubReaderHeader`, `TableOfContents`, `FontSizeControl`, `LineHeightControl`

  3. **LLM settings**
     - New server settings page `settings/server/llm` (`LLMSettingsScene.tsx`): OpenAI-compatible endpoint URL, model name, API key (password input); zod validation; saved via the `updateLlmConfig` mutation, with the API key stored encrypted and never echoed back to the UI
     - `LlmTaggingConfigCard.tsx`: auto-tagging parameter configuration, mapped to `LlmTaggingConfig` (stored as JSON in `server_config.llm_tagging_config`):
       - `enabled` master switch (default off; consulted by the post-scan auto-tagging hook)
       - `auto_apply_threshold`: suggestions at or above this confidence are applied automatically, otherwise they await manual review (default off)
       - `requests_per_second` (default 0.5), `concurrency` (in-flight requests per job, default 4)
       - `daily_request_limit` (default 2000; excess work is marked `RateLimited` for a later retry)
       - `batch_size` (books per LLM request for library analysis, default 200), `max_summary_chars` (summary truncation, default 400)
       - `batch_scope`: `NewBooksOnly` (default, only untagged books) / `AllBooks`
       - User input normalized into safe bounds via `sanitized()`
     - New backend crate `crates/integrations/llm`: an OpenAI-compatible chat/completions client with exponential-backoff retries on 429/5xx (default 3) and a governor-based rate limiter (fractional QPS supported); the API key is decrypted by the caller and held only in memory
     - Migration `m20261025_000000_add_llm_config`: `server_config` gains `llm_url`, `llm_model_name`, `llm_encrypted_api_key` (all nullable)

  4. **LLM auto-tagging**
     - Core implementation in `core/src/llm_tagging/`:
       - `job.rs` (~620 lines): single-book tagging job. Builds a `BookTaggingInput` from book metadata + truncated summary, calls the LLM, and writes suggestions to `llm_tag_suggestions`; books processed concurrently in batches; job output stats: `total_processed / suggested / auto_applied / failed / rate_limited / skipped / tokens_used`; params support `Media(ids)` and `MediaInLibrary(library_id)` scopes plus `force_refetch`
       - `library_job.rs` (~648 lines): library-wide batch tag recommendation. `batch_size` books per LLM request, producing a tag list and per-book assignment drafts; progress tracked in `llm_library_tag_drafts` (`books_analyzed / completed_batches / total_batches`), resumable
       - `mod.rs`: shared logic — config loading & validation, API key decryption, tag normalization & dedup (`normalize_tag_key` / `normalize_tag_name`), daily request accounting (`count_requests_today`) and limit enforcement, and the post-scan auto-tagging hook (`is_llm_tagging_enabled`, a cheap check that does not decrypt the key)
     - Suggestion state machine: `Suggested / AutoApplied / Accepted / Failed / RateLimited`; settled records (`Suggested/AutoApplied/Accepted/Failed`) are skipped on subsequent runs, only `RateLimited` is retried
     - Apply strategy `LlmApplyStrategy::MergeOnly`: tags are only added, never removed
     - GraphQL layer (`mutation/llm_tagging.rs`, `query/llm_tagging.rs`, `object/llm_tagging.rs`): `runLlmTagging`, `runLlmLibraryTagAnalysis`, `applyLibraryTagSuggestions`, `acceptLlmTagSuggestions` / `rejectLlmTagSuggestions` (per-suggestion), `acceptAllLlmSuggestions` / `rejectAllLlmSuggestions` (bulk), `updateLlmTaggingConfig`, `isLlmConfigured`
     - Migration `m20261026_000000_llm_tagging`: new tables `llm_tag_suggestions` (media_id / status / suggested_tags JSON / applied_tags JSON + media_id & status indexes) and `llm_library_tag_drafts` (library_id / status / final_tag_list JSON / assignments JSON / progress fields + library_id index); `server_config` gains a `llm_tagging_config` JSON column
     - Manual review UI (`components/metadata/llmTagging/`): `LlmAutoTaggingSection` (single-book entry point and job status), `LibraryTagAnalysisSection` (library analysis results and draft progress), `PendingTagSuggestionsTable` + `TagReviewDialog` (per-suggestion review with confidence display, apply / reject), `useLlmTagActions` / `useLlmTagReviewStore` (action and review state management)

  5. **Browse books by tag**
     - New `TagFilterDrawer` component: a tag filter drawer on library/series pages, querying `libraryTags(id/name/count)` with a tag search box, multi-select toggles, and footer Clear / Apply buttons; applied via `filters.tags.anyOf`; the trigger button highlights when the filter is active
     - Responsive: `xl`-width Sheet on mobile, `default` side drawer on desktop
     - Backend `query/tag.rs` / `object/tag.rs` extended with tag counts and related queries; wired into `LibraryBooksScene`, `SeriesBooksScene`, `MediaFilterForm`, `SeriesFilterForm`

- **Design rationale / reasons for changes**
  - i18n: hardcoded text is hard to maintain and localize; after migrating to translation keys, adding a language only requires new locale files, no component changes
  - EPUB drawer: the centered modal obscured the middle of the reading area and interrupted reading; a left-side drawer matches mainstream reader interactions and leaves the reading layout untouched
  - LLM settings & tagging: LLM features are fully opt-in — when URL / model / API key are unset, `load_llm_settings` returns `None` and every LLM entry point stays hidden, leaving existing behavior unaffected; API keys are encrypted at rest and decrypted only in memory; rate limit, concurrency, daily limit, and batch size are all configurable to keep API costs under control; confidence threshold + manual review + the `MergeOnly` strategy provide triple protection against mislabeling; suggestions and drafts live in dedicated tables and never pollute existing `media_tag` links
  - Browse by tag: reuses the existing filters system and GraphQL queries, no new state management

- **Additional background**
  - Scale: 12 commits ahead of the `dev/translate` baseline, touching 181 files (+10373 / -628)
  - New documentation: `docs/docker-deployment-faq.md` (Docker deployment FAQ)
  - Design documents in `plans/`: `llm-auto-tagging-plan.md`, `llm-library-tag-recommendation-plan.md`, `server-llm-settings-plan.md`, `sidebar-tags-feature-plan.md`, `i18n-hardcoded-strings-plan.md` / `i18n-hardcoded-strings-report.md`
  - Verification: `tsc -b` typecheck passes; Rust `cargo` build / clippy pass; manually verified the EPUB drawer interaction, LLM settings save + tagging job trigger, suggestion review & apply, and the tag filter behavior
  - Formatting: code is formatted per the repo configs (Prettier `prettier.config.js` and Rustfmt `rustfmt.toml`)
  - Merge note: `nightly` is 26 commits ahead of this branch's fork point (including `#1488` Simplified Chinese translation updates), so a rebase before merge is recommended; `packages/i18n` locale files (zh-CN / en-US / zh-TW) and `crates/graphql/schema.graphql` may conflict — on conflict, keep this branch's structured translation keys and new schema fields while preserving `nightly`'s existing translations

Contributing guide: https://github.com/stumpapp/stump/blob/main/.github/CONTRIBUTING.md

## Screenshots

This PR includes UI changes (EPUB reader left drawer, LLM settings page, tag filter drawer, tag review UI). Screenshots / recording to be added:

<!-- Paste screenshots or a recording here -->

## Ready?

Please read each item below and check:

- [ ] I have read the [contributing guide](https://github.com/stumpapp/stump/blob/main/.github/CONTRIBUTING.md)
- [ ] I searched for existing issues or PRs related to this change
- [ ] This PR targets the `nightly` branch, not `main`
- [ ] If applicable, I have added tests and/or documentation for my changes
- [x] If applicable, I have disclosed whether LLM tools were used in developing this PR

## Stump Contributor License Agreement

By submitting code to Stump, you agree your contributions are licensed as follows (per component):

- Expo mobile app: GPL-3.0
- All other code in the repository: MIT
