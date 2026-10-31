## 说明

**要点**:本 PR 为阅读体验与新功能组合 —— ① 约 60+ 组件硬编码文本迁移至 i18n(三语言同步);② EPUB 阅读器目录 / 书签 / 注释浮窗由居中模态框改为左侧抽屉;③ 新增 LLM 服务器设置(OpenAI 兼容接口,API Key 加密存储);④ LLM 自动打标签(单本 + 全库分批,人工审核 + 置信度阈值 + 只增不删策略);⑤ 书库 / 系列页按标签筛选书籍。

本分支基于 `nightly` 历史上的 `v0.1.11`(`d0f51c8e`)分叉,并已合并上游 `nightly`(`76fd4531`,含 `#1488` 简体中文翻译更新)。未发现相关的现有 issue / PR;如需先讨论,我可以转成 issue 或 discussion。

> 大模型辅助披露:本 PR 的代码与 PR 文案在开发过程中使用了大模型工具辅助,已做人工审查与质量检查(tsc 类型检查、cargo clippy、手动功能验证)。提交信息未使用 LLM 工具签名。

以下按六个部分详细说明。

- **修改概要**

  1. **国际化覆盖扩展**
     - 约 60+ 组件中大量原本硬编码的页面文本迁移至 `react-i18next` 自动翻译,覆盖:设置(用户 / 服务器 / API Key / 任务 / 日志)、书籍与系列(概览、管理、缩略图、标签编辑器)、书友会、智能列表、探索器与上传、表格与过滤器、查询构建器、阅读器(EPUB / PDF / 图像)、各类确认对话框等
     - 语言文件扩充:`en-US.json` +729 行、`zh-CN.json` +800 行、`zh-TW.json` +718 行(三个语言同步补齐);合并 nightly 后保留其既有译名并补齐新增键
     - 迁移范围与遗漏项核对记录见 `plans/i18n-hardcoded-strings-plan.md`、`plans/i18n-hardcoded-strings-report.md`

  2. **EPUB 阅读器浮窗改造**
     - 目录 / 书签 / 注释浮窗 `LocationManager` 由 `Dialog`(视口居中模态框)改为 `Sheet`(`SheetPrimitive.Content position="left" size="sm"`),从左侧滑出
     - 内容区高度由固定 `300px` 改为随抽屉自适应(`flex-1 overflow-y-auto`),长目录 / 注释列表可全高滚动
     - 使用 Sheet 内置 `closeIcon`;`Sheet` 与 `Dialog` 同为 `@radix-ui/react-dialog`,可访问性语义一致,受控 `open` / `onOpenChange` 与"点条目自动关闭"逻辑保持不变
     - 同步调整 `EpubReaderHeader`、`TableOfContents`、`FontSizeControl`、`LineHeightControl` 的翻译键

  3. **LLM 大模型设置**
     - 新增服务器设置页 `settings/server/llm`(`LLMSettingsScene.tsx`):配置 OpenAI 兼容接口 URL、模型名、API Key(密码框输入);zod 表单校验;`updateLlmConfig` mutation 保存,API Key 加密落库、界面不回显
     - `LlmTaggingConfigCard.tsx`:自动打标签参数配置,对应 `LlmTaggingConfig`(以 JSON 存于 `server_config.llm_tagging_config`):
       - `enabled` 总开关(默认关闭,扫描后自动打标钩子据此触发)
       - `auto_apply_threshold`:置信度达到阈值的建议自动应用,否则等待人工审核(默认关闭)
       - `requests_per_second`(默认 0.5)、`concurrency`(单任务内并发请求数,默认 4)
       - `daily_request_limit`(每日请求上限,默认 2000,超出部分标记 `RateLimited` 留待次日重试)
       - `batch_size`(全库分析每请求书籍数,默认 200)、`max_summary_chars`(简介截断长度,默认 400)
       - `batch_scope`:`NewBooksOnly`(默认,仅无标签书籍)/ `AllBooks`
       - 用户输入经 `sanitized()` 归一到安全边界
     - 后端新增 `crates/integrations/llm`:OpenAI 兼容 chat/completions 客户端;429/5xx 指数退避重试(默认 3 次)+ governor 限流(支持小数 QPS);API Key 由调用方解密、仅内存持有
     - 数据库迁移 `m20261025_000000_add_llm_config`:`server_config` 新增 `llm_url`、`llm_model_name`、`llm_encrypted_api_key`(均可空)

  4. **LLM 自动打标签**
     - 核心实现 `core/src/llm_tagging/`:
       - `job.rs`(约 620 行):单本打标任务。按书籍元数据 + 截断后简介构建 `BookTaggingInput` 调用 LLM,建议写入 `llm_tag_suggestions`;任务内按批并发处理;输出统计 `total_processed / suggested / auto_applied / failed / rate_limited / skipped / tokens_used`;参数支持 `Media(ids)`、`MediaInLibrary(library_id)` 范围与 `force_refetch` 强制重新建议
       - `library_job.rs`(约 648 行):全库分批标签推荐。每批 `batch_size` 本书一次请求,产出标签清单与逐书指派草稿,进度记入 `llm_library_tag_drafts`(`books_analyzed / completed_batches / total_batches`),可中断续跑
       - `mod.rs`:共享逻辑 —— 配置加载与校验、API Key 解密、`normalize_tag_key / normalize_tag_name` 标签归一与去重、每日请求量统计(`count_requests_today`)与限额执行、扫描后自动打标钩子(`is_llm_tagging_enabled`,不解密 Key 的轻量检查)
     - 建议状态机:`Suggested / AutoApplied / Accepted / Failed / RateLimited`;已 settled(`Suggested/AutoApplied/Accepted/Failed`)的记录在后续运行中跳过,仅 `RateLimited` 会重试
     - 应用策略 `LlmApplyStrategy::MergeOnly`:只新增标签,绝不移除已有标签
     - GraphQL 层(`mutation/llm_tagging.rs`、`query/llm_tagging.rs`、`object/llm_tagging.rs`):`runLlmTagging`、`runLlmLibraryTagAnalysis`、`applyLibraryTagSuggestions`、`acceptLlmTagSuggestions` / `rejectLlmTagSuggestions`(逐条)、`acceptAllLlmSuggestions` / `rejectAllLlmSuggestions`(批量)、`updateLlmTaggingConfig`、`isLlmConfigured`
     - 数据库迁移 `m20261026_000000_llm_tagging`:新表 `llm_tag_suggestions`(media_id / status / suggested_tags JSON / applied_tags JSON + media_id、status 索引)与 `llm_library_tag_drafts`(library_id / status / final_tag_list JSON / assignments JSON / 进度字段 + library_id 索引);`server_config` 新增 `llm_tagging_config` JSON 列
     - 人工审核 UI(`components/metadata/llmTagging/`):`LlmAutoTaggingSection`(单本打标入口与任务状态)、`LibraryTagAnalysisSection`(全库分析结果与草稿进度)、`PendingTagSuggestionsTable` + `TagReviewDialog`(建议逐条查看、置信度展示、应用 / 拒绝)、`useLlmTagActions` / `useLlmTagReviewStore`(动作与审核状态管理)

  5. **按标签显示相关书籍**
     - 新增 `TagFilterDrawer` 组件:书库 / 系列页标签筛选抽屉,查询 `libraryTags(id/name/count)`,带标签搜索框、多选切换、底部「清除 / 应用」按钮;应用后经 `filters.tags.anyOf` 过滤;激活时触发按钮高亮
     - 响应式:移动端 `xl` 宽 Sheet,桌面端 `default` 侧边抽屉
     - 后端 `query/tag.rs` / `object/tag.rs` 扩展标签计数与关联查询;接入 `LibraryBooksScene`、`SeriesBooksScene`、`MediaFilterForm`、`SeriesFilterForm`

  6. **合并 upstream `nightly` 与回归修复**
     - 已合并 upstream `nightly`(`76fd4531`),解决全部合并冲突,并确认上述五项功能完整保留
     - 重新生成 GraphQL 客户端(`packages/graphql/src/client`),修复合并后 Document 类型丢失导致的全局类型错误
     - `LLMSettingsScene` 改用 `SceneContainer`,适配 upstream 删除 `ContentContainer` 的调整;安装 upstream 新增的 `@radix-ui/react-alert-dialog` 依赖
     - 恢复合并中被覆盖的 i18n:`EntityHeader` 的 Info / Settings 文案、系列设置页 Metadata 区块
     - 补齐合并后新增/遗漏的翻译:任务历史状态列、书库详情与文件夹标签、缩略图生成说明、书库路径校验消息、列表「每页」、添加元数据提供方弹窗、生成随机密码按钮等

- **设计思路 / 改动理由**
  - i18n:硬编码文本不利于维护与本地化,统一迁移到翻译键后,新增语言只需补充 locale 文件,不再改组件代码
  - EPUB 抽屉:居中模态框遮挡阅读区中央,打断阅读;左侧抽屉符合主流阅读器交互,且不动阅读区布局
  - LLM 设置与打标:LLM 功能完全可选启用 —— 未配置 URL / 模型 / API Key 时 `load_llm_settings` 返回 `None`,所有 LLM 入口隐藏,不影响既有功能;API Key 加密落库、运行时仅内存解密;限流、并发、每日限额、批次大小均可配置,防止 API 费用失控;置信度阈值 + 人工审核 + `MergeOnly` 策略三重防护避免误标;标签建议与草稿独立成表,不污染既有 `media_tag` 关联
  - 标签浏览:复用既有 filters 体系与 GraphQL 查询,不引入新状态管理

- **补充背景信息**
  - 规模:相对上游 `nightly`(`76fd4531`)共 15 个提交、163 个文件(+21739 / -11451);合并提交本身涉及 498 个文件(+28621 / -25409)
  - 新增文档:`docs/docker-deployment-faq.md`(Docker 部署 FAQ)
  - 设计文档见 `plans/`:`llm-auto-tagging-plan.md`、`llm-library-tag-recommendation-plan.md`、`server-llm-settings-plan.md`、`sidebar-tags-feature-plan.md`、`i18n-hardcoded-strings-plan.md` / `i18n-hardcoded-strings-report.md`
  - 验证:合并后 `tsc -b packages/browser` 类型检查通过、ESLint 通过、相关 Vitest 用例通过、`vite build`(apps/web)构建成功;Rust 端 `cargo` 构建 / clippy 通过;手动验证 EPUB 抽屉交互、LLM 设置保存与打标任务触发、建议审核应用、标签筛选生效
  - 格式化:代码已按仓库配置(Prettier `prettier.config.js` 与 Rustfmt `rustfmt.toml`)格式化
  - 合并说明:已合并 upstream `nightly`(`76fd4531`)并解决冲突;locale 文件以本分支的结构化翻译键与新增键为准,同时保留 nightly 的既有译名;`crates/graphql/schema.graphql` 以本分支新增字段为准

贡献指南:https://github.com/stumpapp/stump/blob/main/.github/CONTRIBUTING.md

## 截图

本 PR 包含界面改动(EPUB 阅读器左侧抽屉、LLM 设置页、标签筛选抽屉、标签审核界面),截图 / 录屏待补充:

<!-- 在此粘贴截图或录屏 -->

## 准备就绪？

请阅读下面每一项,并勾选:

- [x] 我已阅读【贡献指南】
- [x] 我搜索过是否存在相关的现有issue或PR
- [x] 本PR的目标分支是 `nightly`,而不是 `main`
- [x] 如适用,我已为改动补充测试用例和/或文档
- [x] 如适用,我已说明本次PR是否使用了大模型辅助开发

## Stump 贡献者许可协议

向 Stump 提交代码,即代表你同意你的贡献遵循以下许可(按场景区分):

- Expo 移动端应用:遵循 GPL-3.0 协议
- 仓库内其余所有代码:遵循 MIT 协议
