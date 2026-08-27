# Image Reader Controls i18n Design

## Background

Closed PR #1318 attempted to localize web and mobile surfaces in one large change. The maintainer asked for smaller pull requests organized by app and component, and specifically noted that the former `readerUi` namespace mixed strings from multiple readers and components.

This change extracts one cohesive web-only slice: the three select controls used by the image reader. It is intentionally independent from PR #1347. Both branches modify `en-US.json`, and any resulting conflict will be resolved later rather than stacking the branches.

## Goal

- Localize the labels and options rendered by `ImageScalingSelect`, `ReadingDirectionSelect`, and `ReadingModeSelect`.
- Introduce a web image-reader namespace that does not mix EPUB and image-reader copy.
- Preserve each control's values, validation, callback behavior, DOM structure, and accessibility relationships.
- Add English source strings only; translations will be supplied through Weblate after merge.

## Scope

### Production components

- `packages/browser/src/components/readers/imageBased/container/ImageScalingSelect.tsx`
- `packages/browser/src/components/readers/imageBased/container/ReadingDirectionSelect.tsx`
- `packages/browser/src/components/readers/imageBased/container/ReadingModeSelect.tsx`

### Tests

- `packages/browser/src/components/readers/imageBased/container/__tests__/ImageScalingSelect.test.tsx`
- `packages/browser/src/components/readers/imageBased/container/__tests__/ReadingDirectionSelect.test.tsx`
- `packages/browser/src/components/readers/imageBased/container/__tests__/ReadingModeSelect.test.tsx`

### Locale source

- `packages/i18n/src/locales/en-US.json`

## Namespace

Add a top-level `imageReader` namespace. Keep copy grouped under the settings surface and then by the component concern:

```text
imageReader
  settings
    imageScaling
      label
      options
        auto
        height
        width
        original
    readingDirection
      label
      options
        leftToRight
        rightToLeft
    readingMode
      label
      options
        verticalScroll
        horizontalScroll
        paged
```

The source strings preserve the current UI copy exactly:

- Image scaling: `Image scaling`, `Auto`, `Height`, `Width`, `Original`
- Reading direction: `Reading direction`, `Left to right`, `Right to left`
- Reading mode: `Flow`, `Vertical scroll`, `Horizontal scroll`, `Paged`

Do not reuse `mobileApp.readerSettings` keys. The mobile strings have different labels and option wording, and coupling the web controls to mobile copy would make future product-specific changes unsafe. Do not add a broad `readerUi` namespace.

## Component behavior

Each component obtains `t` from `useLocaleContext` and replaces only its hard-coded label and option display text. The option values remain unchanged:

- Image scaling: `AUTO`, `HEIGHT`, `WIDTH`, `NONE`
- Reading direction: `LTR`, `RTL`
- Reading mode: `CONTINUOUS_VERTICAL`, `CONTINUOUS_HORIZONTAL`, `PAGED`

Existing guard functions continue to validate the selected value before calling `onChange`. No callback, state, select, label, or layout structure changes are part of this work.

## Test contract

Extend the existing component tests rather than creating a new integration suite.

- Mock `useLocaleContext` with a deterministic translator that returns distinctive text for each requested key.
- Verify that each real control renders its translated label and translated options.
- Preserve and rerun the existing valid and invalid selection tests to prove that localized display text does not alter enum values or callbacks.
- Follow TDD: add locale assertions first, observe failure against the current hard-coded components, then implement the translation calls and observe success.

## UI contract

- Copy changes source from hard-coded text to i18n while preserving the exact English wording.
- Label-to-select association remains unchanged.
- Option ordering remains unchanged.
- Select values and disabled behavior remain unchanged.
- No styles, layout, assets, motion, or responsive behavior change.

Because no visual structure changes, automated DOM assertions and source-diff inspection are the required UI checks. Authenticated reader rendering may be recorded separately if available, but it is not proof supplied by the component unit tests.

## Out of scope

- EPUB reader localization
- Other image-reader controls such as brightness, double-page behavior, settings dialogs, timer, or navigation
- Mobile, desktop, book-club, library, or thumbnail-selector localization
- `ko-KR.json` or any translated locale file
- `StumpRouter` provider changes
- Changes to option enums, settings persistence, callbacks, layout, or styling
- Conflict resolution with PR #1347

## Verification

- Run the three focused component test files.
- Run the complete browser test suite.
- Run browser and i18n type checks.
- Run browser lint and `git diff --check`.
- Search the three production components for the replaced hard-coded strings.
- Confirm the final diff contains only the three components, their three existing tests, and `en-US.json`.

## Completion criteria

- All three controls render their labels and options through `imageReader.settings.*` keys.
- English copy, option order, option values, validation, and callback behavior remain unchanged.
- No translated locale file is modified.
- Focused and full automated checks pass.
- Commit messages and the pull request are written in English.
- The pull request targets `nightly` and references closed PR #1318.
