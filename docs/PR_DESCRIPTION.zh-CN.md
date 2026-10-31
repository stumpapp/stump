# PR 描述(对原作者主仓库 stumpapp/stump)

> 建议提交方式:`dev/llm-tag` → `upstream/main`(或 `develop`)
> PR 标题建议:**feat: i18n coverage, EPUB reader location drawer, LLM settings & auto-tagging**

---

## 概述

本 PR 基于 `v0.1.11`(`d0f51c8e`),相对 `dev/translate` 基线共 12 个提交,改动 181 个文件(+10373 / -628),包含以下五个主要部分:

1. **国际化覆盖扩展**:大量原本硬编码的页面文本迁移至语言自动翻译(react-i18next),新增 zh-CN / zh-TW 完整翻译
2. **EPUB 阅读器浮窗改造**:目录 / 书签 / 注释浮窗由视口居中模态框改为左侧抽屉(Sheet)形式
3. **LLM 大模型设置**:新增服务器设置页,支持配置 OpenAI 兼容接口的 URL、模型名与加密存储的 API Key
4. **LLM 自动打标签**:单本书籍自动打标 + 全库分批标签推荐,含定时任务接入与人工审核流程
5. **按标签浏览书籍**:书库内新增标签筛选抽屉,按标签显示相关书籍

---

## 主要变更

### 1. 国际化覆盖扩展(i18n)

- 将大量硬编码的页面文本(设置、书籍、系列、阅读器、书友会、探索器、表格、对话框等约 60+ 组件)迁移至 `react-i18next` 自动翻译
- 语言文件大幅扩充:`en-US.json` +729 行、`zh-CN.json` +800 行、`zh-TW.json` +718 行
- 相关计划与报告文档见 `plans/i18n-hardcoded-strings-plan.md`、`plans/i18n-hardcoded-strings-report.md`

### 2. EPUB 阅读器浮窗改造

- `LocationManager`(目录 / 书签 / 注释)由 `Dialog` 居中模态框改为 `Sheet` 左侧抽屉:
  - `SheetPrimitive.Content position="left" size="sm"`,自带 `slide-in-from-left` 动画与全高布局
  - 内容区高度由固定 `300px` 改为随抽屉自适应(`flex-1 overflow-y-auto`)
  - 使用 Sheet 内置 `closeIcon`,受控 `open`/`onOpenChange` 语义保持不变
- 同步调整 `EpubReaderHeader`、`TableOfContents`、`FontSizeControl`、`LineHeightControl` 的翻译键

### 3. LLM 大模型设置

- 新增服务器设置页面 `settings/server/llm`(`LLMSettingsScene.tsx`):
  - 配置项:LLM 接口 URL、模型名、API Key(密码框输入,加密存储)
  - zod 表单校验,`updateLlmConfig` mutation 保存
- `LlmTaggingConfigCard.tsx`:自动打标签任务的参数配置(批次大小、触发方式等)
- 新增 `server_config` 迁移字段:`llm_url`、`llm_model_name`、`llm_encrypted_api_key`(均可空)
- 后端新增 `crates/integrations/llm`:OpenAI 兼容 chat/completions 客户端,429/5xx 指数退避重试 + governor 限流,API Key 仅在内存中解密持有

### 4. LLM 自动打标签

- 核心实现 `core/src/llm_tagging/`:
  - `job.rs`(620 行):单本书籍自动打标任务 —— 读取书籍元数据与内容摘要,调用 LLM 生成标签建议
  - `library_job.rs`(648 行):全库分批标签推荐 —— 分批扫描书库,批量生成标签建议与指派草稿
  - `mod.rs`:共享服务逻辑(建议去重、置信度阈值、草稿管理)
- 调度接入:`core/src/job/dispatch.rs`、`scheduler.rs` 注册 LLM 标签任务,支持定时执行(复用 `scheduled_job` 机制)
- GraphQL 层:`mutation/llm_tagging.rs`(触发任务、审核建议、应用/拒绝草稿)、`query/llm_tagging.rs`(查询建议与草稿)、`object/llm_tagging.rs`
- 数据模型:新增 `llm_tag_suggestion`、`llm_library_tag_draft` 实体及迁移 `m20261026_000000_llm_tagging`
- 人工审核 UI(`components/metadata/llmTagging/`):
  - `LlmAutoTaggingSection`:单本自动打标入口与任务状态
  - `LibraryTagAnalysisSection`:全库标签分析结果
  - `PendingTagSuggestionsTable` + `TagReviewDialog`:建议逐条审核、应用或拒绝
  - `useLlmTagActions` / `useLlmTagReviewStore`:动作与审核状态管理

### 5. 按标签显示相关书籍

- 新增 `TagFilterDrawer` 组件(`components/filters/`):书库内按标签筛选书籍
  - 查询 `libraryTags(id/name/count)`,多选标签后经 `filters.tags.anyOf` 过滤
  - 响应式:移动端全宽 Sheet,桌面端侧边抽屉
- `query/tag.rs` / `object/tag.rs` 扩展标签计数与关联查询
- 接入书籍 / 系列列表场景(`LibraryBooksScene`、`SeriesBooksScene`、`MediaFilterForm`、`SeriesFilterForm`)

---

## 数据库迁移(自动执行)

| 迁移 | 内容 |
| --- | --- |
| `m20261025_000000_add_llm_config` | `server_config` 新增 `llm_url`、`llm_model_name`、`llm_encrypted_api_key` |
| `m20261026_000000_llm_tagging` | 新增 `llm_tag_suggestion`、`llm_library_tag_draft` 表 |

均含 `down` 回滚,列可空,对现有数据无破坏。

## 兼容性与注意事项

- LLM 功能为**可选启用**:未配置 URL / API Key 时所有 LLM 相关入口隐藏,不影响既有功能
- API Key 经加密后落库,运行时解密仅存在于内存
- GraphQL schema 有新增字段(`schema.graphql` +242),生成的 client 代码(`packages/graphql`)已同步
- `apps/web/.env.local` 中仅含本地服务地址示例,无敏感信息
- 新增文档:`docs/docker-deployment-faq.md`(Docker 部署 FAQ)

## 验证情况

- `tsc -b` 类型检查通过(浏览器端)
- Rust 端:`cargo` 构建 / clippy 通过(`core`、`crates/integrations/llm`、`crates/graphql`)
- 手动验证:
  - EPUB 阅读器:目录 / 书签 / 注释抽屉左侧滑出,点条目自动关闭
  - LLM 设置保存后,单本打标与全库推荐任务可触发,建议可审核应用
  - 标签筛选抽屉在书库 / 系列页生效

## 提交列表(`dev/translate..dev/llm-tag`)

```
2402f8ea 修改目录 居中 变为 左侧抽屉
5a903d23 select tags to show books done
3a14160d llm add book tags
2cbc69ef 全库分批推荐tag 单本自动打标 AI-DONE
140586a5 全库分批推荐tag 单本自动打标 doing
73d77835 backup llm and tag
(另有数个 debug 备份提交,合并时将做 squash)
```

## 附:设计文档

- `plans/llm-auto-tagging-plan.md` — 单本自动打标设计
- `plans/llm-library-tag-recommendation-plan.md` — 全库标签推荐设计
- `plans/server-llm-settings-plan.md` — LLM 设置页设计
- `plans/sidebar-tags-feature-plan.md` — 标签筛选抽屉设计
- `plans/i18n-hardcoded-strings-plan.md` / `plans/i18n-hardcoded-strings-report.md` — i18n 迁移计划与报告
