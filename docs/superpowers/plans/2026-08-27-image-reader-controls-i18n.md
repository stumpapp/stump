# Image Reader Controls i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the labels and options of the three web image-reader select controls while preserving their values, validation, callbacks, DOM structure, and English copy.

**Architecture:** Add a top-level `imageReader.settings` source namespace grouped by the three component concerns. Each existing select component consumes its own keys through `useLocaleContext`; existing component tests use a deterministic translator to prove key consumption while retaining enum/callback assertions.

**Tech Stack:** React, TypeScript, i18next, Vitest, Testing Library, Yarn 1/Lerna

---

### Task 1: Localize the image-reader select controls with TDD

**Files:**

- Modify: `packages/browser/src/components/readers/imageBased/container/ImageScalingSelect.tsx`
- Modify: `packages/browser/src/components/readers/imageBased/container/ReadingDirectionSelect.tsx`
- Modify: `packages/browser/src/components/readers/imageBased/container/ReadingModeSelect.tsx`
- Modify: `packages/browser/src/components/readers/imageBased/container/__tests__/ImageScalingSelect.test.tsx`
- Modify: `packages/browser/src/components/readers/imageBased/container/__tests__/ReadingDirectionSelect.test.tsx`
- Modify: `packages/browser/src/components/readers/imageBased/container/__tests__/ReadingModeSelect.test.tsx`
- Modify: `packages/i18n/src/locales/en-US.json`

- [ ] **Step 1: Add a deterministic locale mock to each existing test file**

Add this mock after imports and before each `describe` block:

```tsx
vi.mock('@stump/i18n', () => ({
	useLocaleContext: () => ({
		locale: 'en-US',
		t: (key: string) => `translated:${key}`,
	}),
}))
```

The components under test remain real. The locale hook is the only mocked dependency added by this task.

- [ ] **Step 2: Add failing translation assertions for ImageScalingSelect**

Add the following test and update existing `getByLabelText('Image scaling')` calls to use the translated label after the production implementation exists:

```tsx
it('renders its label and options through the locale context', () => {
	render(<ImageScalingSelect value={ReadingImageScaleFit.Height} onChange={vi.fn()} />)

	expect(
		screen.getByLabelText('translated:imageReader.settings.imageScaling.label'),
	).toBeInTheDocument()
	expect(
		screen.getByRole('option', {
			name: 'translated:imageReader.settings.imageScaling.options.auto',
		}),
	).toBeInTheDocument()
	expect(
		screen.getByRole('option', {
			name: 'translated:imageReader.settings.imageScaling.options.height',
		}),
	).toBeInTheDocument()
	expect(
		screen.getByRole('option', {
			name: 'translated:imageReader.settings.imageScaling.options.width',
		}),
	).toBeInTheDocument()
	expect(
		screen.getByRole('option', {
			name: 'translated:imageReader.settings.imageScaling.options.original',
		}),
	).toBeInTheDocument()
})
```

- [ ] **Step 3: Add failing translation assertions for ReadingDirectionSelect**

Import `screen` from Testing Library, add this test, and update existing label lookups after implementation:

```tsx
it('renders its label and options through the locale context', () => {
	render(<ReadingDirectionSelect direction={ReadingDirection.Ltr} onChange={vi.fn()} />)

	expect(
		screen.getByLabelText('translated:imageReader.settings.readingDirection.label'),
	).toBeInTheDocument()
	expect(
		screen.getByRole('option', {
			name: 'translated:imageReader.settings.readingDirection.options.leftToRight',
		}),
	).toBeInTheDocument()
	expect(
		screen.getByRole('option', {
			name: 'translated:imageReader.settings.readingDirection.options.rightToLeft',
		}),
	).toBeInTheDocument()
})
```

- [ ] **Step 4: Add failing translation assertions for ReadingModeSelect**

Import `screen`, add this test, and update the existing `getByLabelText('Flow')` lookup after implementation:

```tsx
it('renders its label and options through the locale context', () => {
	render(<ReadingModeSelect value={ReadingMode.Paged} onChange={vi.fn()} />)

	expect(
		screen.getByLabelText('translated:imageReader.settings.readingMode.label'),
	).toBeInTheDocument()
	expect(
		screen.getByRole('option', {
			name: 'translated:imageReader.settings.readingMode.options.verticalScroll',
		}),
	).toBeInTheDocument()
	expect(
		screen.getByRole('option', {
			name: 'translated:imageReader.settings.readingMode.options.horizontalScroll',
		}),
	).toBeInTheDocument()
	expect(
		screen.getByRole('option', {
			name: 'translated:imageReader.settings.readingMode.options.paged',
		}),
	).toBeInTheDocument()
})
```

- [ ] **Step 5: Run the three focused tests and verify RED**

Run:

```bash
corepack yarn workspace @stump/browser test \
  src/components/readers/imageBased/container/__tests__/ImageScalingSelect.test.tsx \
  src/components/readers/imageBased/container/__tests__/ReadingDirectionSelect.test.tsx \
  src/components/readers/imageBased/container/__tests__/ReadingModeSelect.test.tsx
```

Expected: the new tests fail because the components still render hard-coded labels such as `Image scaling`, `Reading direction`, and `Flow` instead of the `translated:imageReader.settings.*` values. Failures must be assertion failures, not import or setup errors.

- [ ] **Step 6: Add the English imageReader source namespace**

Add this top-level object to `packages/i18n/src/locales/en-US.json`:

```json
"imageReader": {
	"settings": {
		"imageScaling": {
			"label": "Image scaling",
			"options": {
				"auto": "Auto",
				"height": "Height",
				"width": "Width",
				"original": "Original"
			}
		},
		"readingDirection": {
			"label": "Reading direction",
			"options": {
				"leftToRight": "Left to right",
				"rightToLeft": "Right to left"
			}
		},
		"readingMode": {
			"label": "Flow",
			"options": {
				"verticalScroll": "Vertical scroll",
				"horizontalScroll": "Horizontal scroll",
				"paged": "Paged"
			}
		}
	}
}
```

Do not modify `mobileApp.readerSettings`, `epubReader`, or any translated locale file.

- [ ] **Step 7: Localize ImageScalingSelect**

Import `useLocaleContext`, initialize `t`, and replace only display copy:

```tsx
export default function ImageScalingSelect({ value, onChange }: Props) {
	const { t } = useLocaleContext()

	// Keep the existing handleChange implementation unchanged.

	return (
		<div className="gap-y-2 flex flex-col">
			<Label htmlFor="image-scaling-fit">
				{t('imageReader.settings.imageScaling.label')}
			</Label>
			<Select
				id="image-scaling-fit"
				options={[
					{
						label: t('imageReader.settings.imageScaling.options.auto'),
						value: 'AUTO',
					},
					{
						label: t('imageReader.settings.imageScaling.options.height'),
						value: 'HEIGHT',
					},
					{
						label: t('imageReader.settings.imageScaling.options.width'),
						value: 'WIDTH',
					},
					{
						label: t('imageReader.settings.imageScaling.options.original'),
						value: 'NONE',
					},
				]}
				onChange={handleChange}
				value={value}
			/>
		</div>
	)
}
```

- [ ] **Step 8: Localize ReadingDirectionSelect**

Import `useLocaleContext`, initialize `t`, and replace only display copy:

```tsx
<Label htmlFor="reading-direction">
	{t('imageReader.settings.readingDirection.label')}
</Label>
<Select
	id="reading-direction"
	options={[
		{
			label: t('imageReader.settings.readingDirection.options.leftToRight'),
			value: 'LTR',
		},
		{
			label: t('imageReader.settings.readingDirection.options.rightToLeft'),
			value: 'RTL',
		},
	]}
	onChange={handleChange}
	value={direction}
/>
```

- [ ] **Step 9: Localize ReadingModeSelect**

Import `useLocaleContext`, initialize `t`, and replace only display copy:

```tsx
<Label htmlFor="reading-mode">{t('imageReader.settings.readingMode.label')}</Label>
<Select
	id="reading-mode"
	options={[
		{
			label: t('imageReader.settings.readingMode.options.verticalScroll'),
			value: 'CONTINUOUS_VERTICAL',
		},
		{
			label: t('imageReader.settings.readingMode.options.horizontalScroll'),
			value: 'CONTINUOUS_HORIZONTAL',
		},
		{
			label: t('imageReader.settings.readingMode.options.paged'),
			value: 'PAGED',
		},
	]}
	onChange={handleChange}
	value={value}
/>
```

- [ ] **Step 10: Update existing test interactions to use translated labels**

Replace only Testing Library label queries; keep enum values and callback assertions unchanged:

```tsx
screen.getByLabelText('translated:imageReader.settings.imageScaling.label')
getByLabelText('translated:imageReader.settings.readingDirection.label')
getByLabelText('translated:imageReader.settings.readingMode.label')
```

- [ ] **Step 11: Run focused tests and verify GREEN**

Run the command from Step 5 again.

Expected: all three files pass, including the existing valid/invalid selection tests and the new locale assertions.

- [ ] **Step 12: Run source and patch checks**

Run:

```bash
if rg -n "Image scaling|Reading direction|Left to right|Right to left|Vertical scroll|Horizontal scroll|Paged|Original" \
  packages/browser/src/components/readers/imageBased/container/ImageScalingSelect.tsx \
  packages/browser/src/components/readers/imageBased/container/ReadingDirectionSelect.tsx \
  packages/browser/src/components/readers/imageBased/container/ReadingModeSelect.tsx; then
  exit 1
fi

jq empty packages/i18n/src/locales/en-US.json
git diff --check
```

Expected: no targeted hard-coded copy remains in the three production components, JSON parsing succeeds, and `git diff --check` prints nothing.

- [ ] **Step 13: Commit the implementation in English**

```bash
git add \
  packages/browser/src/components/readers/imageBased/container/ImageScalingSelect.tsx \
  packages/browser/src/components/readers/imageBased/container/ReadingDirectionSelect.tsx \
  packages/browser/src/components/readers/imageBased/container/ReadingModeSelect.tsx \
  packages/browser/src/components/readers/imageBased/container/__tests__/ImageScalingSelect.test.tsx \
  packages/browser/src/components/readers/imageBased/container/__tests__/ReadingDirectionSelect.test.tsx \
  packages/browser/src/components/readers/imageBased/container/__tests__/ReadingModeSelect.test.tsx \
  packages/i18n/src/locales/en-US.json

git commit -m "feat(i18n): localize image reader controls"
```

### Task 2: Verify the complete branch

**Files:**

- Verify the seven Task 1 files and the final `origin/nightly...HEAD` diff.

- [ ] **Step 1: Run the complete browser test suite**

```bash
corepack yarn workspace @stump/browser test
```

Expected: all browser Vitest files and tests pass.

- [ ] **Step 2: Run browser and i18n type checks**

```bash
corepack yarn lerna run check-types --scope @stump/browser --scope @stump/i18n --stream
```

Expected: both workspace type-check targets succeed.

- [ ] **Step 3: Run browser lint**

```bash
corepack yarn workspace @stump/browser lint
```

Expected: exit code 0 with no errors. Existing warnings outside the changed files must be reported separately.

- [ ] **Step 4: Inspect the UI contract in the final diff**

Confirm from `git diff origin/nightly...HEAD` that labels, selects, option order, values, change handlers, and wrapper structure are unchanged apart from `t(...)` display calls. Record automated DOM verification separately from unperformed authenticated browser rendering.

- [ ] **Step 5: Remove internal planning artifacts from the final PR diff**

Delete only these two files and commit the removal in English:

```bash
git rm \
  docs/superpowers/specs/2026-08-27-image-reader-controls-i18n-design.md \
  docs/superpowers/plans/2026-08-27-image-reader-controls-i18n.md

git commit -m "chore: exclude internal planning artifacts"
```

- [ ] **Step 6: Confirm final scope and English commit history**

```bash
git diff --name-status origin/nightly...HEAD
git diff --check origin/nightly...HEAD
if git log --format='%s%n%b' origin/nightly..HEAD | LC_ALL=C.UTF-8 rg '[가-힣]'; then
  exit 1
else
  echo 'commit-text-scan: no Korean'
fi
```

Expected: final diff contains only the three production controls, their three tests, and `en-US.json`; diff check passes; the commit-text scan prints `no Korean`.

### Task 3: Publish the independent pull request

**Files:**

- Review the final `origin/nightly...HEAD` diff and GitHub metadata.

- [ ] **Step 1: Verify no existing PR uses the branch**

```bash
gh pr list --repo stumpapp/stump --head devy1540:feat/i18n-image-reader-controls --state all
```

Expected: no existing pull request.

- [ ] **Step 2: Push the independent branch**

```bash
git push -u fork feat/i18n-image-reader-controls
```

- [ ] **Step 3: Create an English pull request against nightly**

Use this exact title:

```text
feat(i18n): localize image reader controls
```

Use an English body while preserving the required repository section headers:

```text
## 목적
Localize the three image-reader select controls as an independent, focused follow-up to closed PR #1318.

## 내용(의도 포함)
- Add a web-specific `imageReader.settings` namespace for image scaling, reading direction, and reading mode.
- Replace hard-coded labels and option text in the three existing select controls.
- Extend the existing component tests to verify locale-context usage while preserving enum values and callbacks.
- Add English source strings only; translations can be supplied through Weblate after merge.

This PR is intentionally independent from #1347. Both branches modify `en-US.json`, and any conflict will be resolved after one of them merges.

## 성공기준
- The three focused component test files pass.
- The complete browser test suite passes.
- Browser and i18n type checks pass.
- Browser lint and `git diff --check` pass.
- Labels, option order, option values, validation, callbacks, and DOM structure remain unchanged apart from localized display text.
- Commit history and PR text are written in English.
```

- [ ] **Step 4: Verify GitHub metadata**

Confirm the PR is open, non-draft, targets `nightly`, uses head `devy1540:feat/i18n-image-reader-controls`, references #1318 and #1347, contains exactly seven changed files, and has an English-only commit history.
