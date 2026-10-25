# i18n 硬编码字符串改造 — 完成报告

> 日期：2026-10-25
> 对应计划：[i18n-hardcoded-strings-plan.md](./i18n-hardcoded-strings-plan.md)
> 分支：dev/translate（基于 v0.1.11）

## 1. 改造范围与成果

### 代码改造（约 90 个 `.tsx` 文件）
所有硬编码英文 UI 字符串已接入 `useTranslate() / t()` 翻译管道（namespace `webApp`），覆盖六大模块：

| 模块 | 主要文件数 | 说明 |
|---|---|---|
| P1 通用组件 | ~34 | 目录选择、筛选器、表格列配置、元数据编辑、EPUB/图片阅读器控件、导航、上传等 |
| P2 书籍/系列 | 11 | 详情页统计、动作菜单、删除确认、标签编辑、管理场景 |
| P3 图书馆 | 9 | 缩略图管理、扫描配置、分析、创建书库 |
| P4 设置页 | 16 | 用户管理、登录历史、API keys、调试设置、邮件 |
| P5 Book Club | 9 | 读书会列表、排期、角色、成员、确认弹窗（含 i18next 复数 `memberCount_one/_other`）|
| P6 收尾补漏 | ~11 | 筛选表单（Media/SeriesFilterForm）、PDF 查看器、智能列表 JSON、API key/设备删除等 |

不改项（按计划白名单）：品牌词（Stump、GitHub、Koreader Sync）、测试文件、注释代码。

### 翻译补充（en-US / zh-CN / zh-TW 三文件同步，共 190 个新词条）
- `webApp.common` 公共词条 34 个（nothingToShow、cannotBeUndone、goHome、clickHere 等）
- 各模块场景词条 156 个（术语对齐现有译法：thumbnail=缩略图/縮圖，metadata=元数据/元資料，session=会话/工作階段，library=书库/書庫，book club=读书会/讀書會）
- **修复预存在的中文翻译漂移**（此前"汉化不全"的根因之一）：zh-CN 补齐 35 个缺失 key（oneshots、homeArrangement、reader 设置、任务中心、用户统计、服务器配置等），zh-TW 补齐 6 个

### 关键数据
- en-US `webApp` 词条数：1353 → **1543**
- zh-CN / zh-TW 对 en-US 的缺失 key：**0**

## 2. 验证结果（全部通过）

| 验证项 | 结果 |
|---|---|
| 硬编码扫描复核（JSX 文本 + label/title/placeholder/aria props）| 0 处遗漏，仅剩白名单项 |
| locale key parity 校验 | zh-CN / zh-TW missing=0（其他 30 语种缺失自动回退英文，交 Weblate）|
| TypeScript 编译 | `packages/components` exit=0，`packages/browser` exit=0 |
| 单元测试 | @stump/browser：49 个测试文件 / **273 全部通过** |
| ESLint | 0 错误（17 个 warning 均为未触碰文件的预存在告警）|

## 3. 过程中的问题与处理

1. **依赖安装不完整导致误判**：初期 node_modules 残缺（registry 404），误判 `packages/components` 两处 `@ts-expect-error` 为失效并删除；完整 `yarn install` 后证实指令必需，已恢复。
2. **干净代码树对照**：对 stash 后的原始代码重跑 tsc，确认所有剩余编译告警（readium 导出、隐式 any、react-hooks 警告等）均为预存在/环境问题，本次改造引入 **0 个新错误**。
3. **workspace 链接缺失**：手动补建 `node_modules/@stump/*` junction 后 `@stump/i18n` 类型解析恢复。
4. **P4 任务中途限流失败**：已从断点恢复并完成。
5. **eslint import 排序**：7 个自动修复项已通过 `eslint --fix` 处理并复验。

## 4. 遗留事项

- **其他 30 种语言**：新增词条在切换到这些语言时回退英文显示（i18next fallback），译文需经项目既有 Weblate 流程持续补齐。
- **内容类文本不属 UI 翻译**：书籍标题、作者、内嵌标签等元数据保持原文。
- 预存在的编译告警（readium 依赖导出、若干隐式 any）建议另行处理，与本次改造无关。

## 5. 改动清单

- 代码：约 90 个 `.tsx`（`packages/browser/src/**`）
- 翻译：`packages/i18n/src/locales/{en-US,zh-CN,zh-TW}.json`
- 文档：`plans/i18n-hardcoded-strings-plan.md`（计划）、`plans/i18n-hardcoded-strings-report.md`（本报告）

> 注意：locale JSON 经脚本以 2 空格统一重新格式化（原文件含混合缩进/CRLF），diff 较大但内容语义不变；`.prettierignore` 已忽略 locale 文件，不影响后续格式化流程。
