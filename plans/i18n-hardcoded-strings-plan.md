# Web 端硬编码字符串 i18n 改造计划

> 目标：将 `packages/browser`（及 `apps/web`）中所有硬编码英文 UI 文本接入 `useTranslate() / t()` 翻译管道，并在各 locale 文件补充翻译，使中文等语言界面完整。

## 1. 背景

- 项目已内置 i18n（`packages/i18n`，i18next），Web 端通过 `useTranslate()`（`packages/browser/src/hooks/useTranslate.tsx`，namespace 固定为 `webApp`）取词。
- `packages/i18n/src/locales/zh-CN.json` 等翻译文件已相当完整，但网页中仍有大量**硬编码英文字符串**未走翻译管道，导致切换中文后界面中英混杂。
- 这类问题无法通过 Weblate 翻译解决（Weblate 只能翻译已提取为 key 的字符串），必须修改代码。

## 2. 改造范围与现状盘点

扫描方式（可重复执行，用于复核遗漏）：

```powershell
# JSX 文本节点（多词）
rg -n --glob '*.tsx' '>\s*[A-Z][a-z]+ [A-Za-z][A-Za-z ]{2,30}\s*<' packages/browser/src
# JSX 文本节点（单词）
rg -n --glob '*.tsx' '>\s*[A-Z][a-z]+(\x27[a-z]+)?\s*<' packages/browser/src
# 常见 props
rg -n --glob '*.tsx' '(label|title|placeholder|heading|description)="[A-Z][^"{]*"' packages/browser/src
# aria-label / toast / alert 文案
rg -n --glob '*.tsx' 'aria-label="[A-Z]|(toast|AlertTitle|Dialog\.Title)[^\n]*"[A-Z]' packages/browser/src
```

初步盘点（不含测试文件，约 150+ 处，分布在 80+ 文件）：

### A. 书籍 / 系列（book / series）
| 文件 | 示例 |
|---|---|
| `scenes/book/BookOverviewSceneHeader.tsx` | `Tags`、`Pages`、`Size`、`Format`、`Year`、`Progress` |
| `scenes/book/BookFileInformation.tsx` | "File Information" |
| `scenes/book/BookOverviewScene.tsx` | "Metadata" |
| `scenes/book/BooksAfterCursor.tsx` | "Next in series"、"Nothing to show" |
| `scenes/book/DeleteHistoryConfirmation.tsx` | "Delete reading history"、"This cannot be undone" |
| `scenes/book/BookActionMenu.tsx` | "Download" 等 |
| `scenes/book/settings/BookTagEditor.tsx` / `BookManagementScene.tsx` | "Tags"、"Analysis"、"Thumbnail" |
| `scenes/series/tabs/settings/*` | "Tags"、"Metadata"、"Analysis"、"Thumbnail"、SeriesSettingsScene 杂项 |
| `scenes/series/CompleteSeriesConfirmation.tsx` | "Mark series completed"、"This cannot be undone" |
| `components/series/StackedSeriesCard.tsx` | "Series Missing" |

### B. 图书馆（library）
| 文件 | 示例 |
|---|---|
| `scenes/library/tabs/settings/LibrarySettingsSidebar.tsx` | "Go home" |
| `.../options/thumbnails/*` | "Delete thumbnails"、"Regenerate thumbnails"、"Select thumbnail"、"Process thumbnail colors" |
| `.../options/scanner/customScan/ScanConfigForm.tsx` | "Rebuild metadata"、"Rebuild hashes" |
| `.../integrations/analysis/*` | "Work in progress"、"Analyze books" |
| `scenes/createLibrary/CreateLibraryScene.tsx` | "Failed to create library" |
| `components/library/createOrUpdate/sections/*` | "Enabled"、"Thumbnail colors"、描述文案 |
| `components/library/LastVisitedLibrary.tsx` | "Last visited" |

### C. 设置 - 用户与账号（settings/server/users、settings/app）
| 文件 | 示例 |
|---|---|
| `user-table/*` | "Existing accounts"、"Delete User Account"、"Inspect user"、"Hard Delete User"、"Sessions" |
| `create-or-update/*` | "Account details"、"Username"、"Password"、"Access control"、"Max sessions allowed" |
| `login-activity/*` | "Authentication history"、"No login activity" |
| `settings/app/apiKeys/*` | "API key"、"Name" |
| `settings/app/preferences/DebugSettings.tsx` | "Debug settings" |
| `settings/server/general/HelpfulLinks.tsx` | "GitHub" |

### D. Book Club
| 文件 | 示例 |
|---|---|
| `scenes/bookClub/UserBookClubsScene.tsx` | "Your clubs" |
| `tabs/settings/scheduler/*` | "Pick a book"、"Add an external book"、"Configure the dates"、"Title"、"Author" |
| `tabs/settings/roles/MemberSpecDisplay.tsx` | "Custom names"、"Role" |
| `components/bookClub/*` | "Delete book club"、"No books to display" |

### E. 通用组件（components）
| 文件 | 示例 |
|---|---|
| `components/DirectoryPickerModal.tsx` | "Select a Directory"、"Show Hidden Directories"、"Cancel"、"Confirm" |
| `components/ServerStatusOverlay.tsx` | "Server is not connected" |
| `components/MultiRowHorizontalCardList.tsx` / `HorizontalCardList.tsx` | "Nothing to show" |
| `components/table/TableFilterInput.tsx` / `EntityTableColumnConfiguration.tsx` | "Filter data"、"Configure columns"、"Visible"、"Hidden" |
| `components/filters/*` | "Filter"、"Filter options"、"Search"、"Genre"、"Writer"、"Publisher" 等 MediaFilterForm 全部字段 |
| `components/metadata/*` | "Delete metadata"、"No Metadata"、"Review match"、"Missing" |
| `components/readers/epub/controls/*` | "Font size"、"Line height" 及 aria-label |
| `components/readers/imageBased/container/ReaderSettings.tsx` | "Experimental animated reader"、"Brightness" |
| `components/navigation/topbar/*` | "No libraries"、"Create library"、"See all"、"Notifications" |
| `components/markdown/MarkdownEditor.tsx` | "Write"、"Preview" |
| `components/book/BookSearchOverlay.tsx` / `BookSearch.tsx` | "Search for a book" |
| `components/explorer/*` | "No files"、"This folder is empty"、"Series name"、"Add books" |
| `scenes/error/FourOhFour.tsx` | "Go home" |
| `scenes/smartList/items/table/TableColumnsBottomDrawer.tsx` | "Table configuration"、"Group columns"、"Book columns"、"Cancel" |

### 不改造的项（明确排除）
- 品牌词/专有名词：`Stump`（`<title>`）、`GitHub`、`JSON`、`PDF`、API key 示例 placeholder（"Koreader Sync"）。
- 测试文件、注释中的英文。
- 俄语等第三方组件内部文案。

## 3. 改造方法与规范

### 3.1 Key 命名约定
沿用项目现有模式：以**场景路径**为前缀（参考 `settingsScene.app/preferences.sections.fontSelect.label`）：

- 场景组件：`<sceneKey>.<section>.<element>`，如 `bookScene.fileInformation.heading`
- 通用组件：`components.<componentName>.<key>`，如 `components.directoryPicker.title`
- 复用公共词（见 3.3），避免重复翻译同一单词到多个 key。

### 3.2 代码改法
1. 组件内引入 `const { t } = useTranslate()`（注意：部分组件目前未用 hook，需确认在 React 组件函数体内调用）。
2. JSX 文本：`<Heading size="sm">Tags</Heading>` → `<Heading size="sm">{t('common.tags')}</Heading>`
3. Props：`label="Username"` → `label={t('...')}`；`aria-label` 同理（aria-label 也应翻译，屏幕阅读器本地化）。
4. 带变量的文案用 i18next 插值：`t('key', { count })`，不要字符串拼接。
5. 含复数的英文（如 "{n} books"）用 i18next 复数 key（`key_one` / `key_other`），中文只保留一种形式。

### 3.3 公共 key 抽取
新建/扩充 `common` 命名空间（zh-CN 中已有部分公共词条可复用），高频词统一收敛：
`common.cancel`、`common.confirm`、`common.search`、`common.filter`、`common.save`、`common.delete`、`common.tags`、`common.metadata`、`common.thumbnail`、`common.nothingToShow`、`common.cannotBeUndone`、`common.goHome`、`common.sections.analysis` 等。

### 3.4 locale 文件更新
- **必须人工补充**：`en-US.json`（作为源语言）、`zh-CN.json`、`zh-TW.json`。
- **其他语言**（ja-JP、ko-KR、fr-FR 等 30 个）：将英文原样填入占位，标注待翻译，交给 Weblate 流程（与项目现有翻译协作方式一致）。
- 注意 `.prettierignore` 已忽略 locale JSON，不需要额外格式化；保持现有 JSON 嵌套结构与字母序习惯。

## 4. 实施阶段

| 阶段 | 内容 | 产出 |
|---|---|---|
| P0 准备 | 在 `common` 命名空间补充公共词条（en/zh-CN/zh-TW）；盘点脚本固化到 `scripts/` 或文档 | 公共词条 + 完整清单 |
| P1 通用组件 | 第 2.E 节全部组件（影响面最广、复用最多） | 组件改造 + 翻译 |
| P2 书籍/系列 | 第 2.A 节 | 同上 |
| P3 图书馆 | 第 2.B 节 | 同上 |
| P4 设置页 | 第 2.C 节 | 同上 |
| P5 Book Club | 第 2.D 节 | 同上 |
| P6 收尾 | 全量扫描复核为 0 处遗漏；其他语言占位提交 Weblate；更新 CHANGELOG | 验收报告 |

每阶段独立成一个 commit/PR，便于 review 与回滚。

## 5. 验证方式

1. `yarn workspace @stump/browser lint` / `tsc`（i18n 包有 TS 类型校验 key，改错 key 会编译报错——这是天然的防呆）。
2. 运行现有测试：`yarn workspace @stump/browser test`；受影响的 snapshot/测试文案需同步更新。
3. 手工验收：切换 locale 为 zh-CN，逐页面走查（书籍详情、系列、图书馆设置、用户管理、Book Club、阅读器、筛选器）确认无英文残留。
4. 复核扫描脚本输出为 0（排除白名单品牌词）。

## 6. 风险与注意事项

- **类型安全**：`@stump/i18n` 对 key 有类型约束，新增 key 需同时改 `en-US.json`，否则 TS 报错——按"先加 key 后改组件"的顺序操作。
- **动态文本**：`EmailerSendHistoryTable.tsx` 的 "Unknown"/"None" 这类状态词、`StackedSeriesCard` 条件文案，注意在三元分支里分别用 `t()`。
- **`textCase: 'sentenceCase'`**：`useTranslate` 默认对英文做句首大写处理，中文不受影响，无需担心大小写逻辑。
- **不要机翻**：zh-CN/zh-TW 文案保持与现有 locale 文件术语一致（如"媒体/书籍/系列/图书馆"的既有译法）。
- **范围控制**：只改字符串接入，不重构组件逻辑，避免与上游 nightly 分支冲突。
