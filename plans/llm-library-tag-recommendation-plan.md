# 改造计划：LLM 全库通览 · 分批推荐标签并关联书籍

> 日期：2026-10-26
> 目标：利用 LLM 通览库内所有书籍，**分批**（每批 100-300 本）生成/扩充推荐标签列表；每批判断时参照已有标签——已存在则复用不动，缺失的才新增；建立标签↔书籍关联；点击某标签即可查看带该标签的全部书籍（此能力已存在，零新代码）。
> 前置：LLM 设置（plans/server-llm-settings-plan.md）+ 建议先做 llm-auto-tagging-plan.md 的 §1 LLM 客户端 crate（本计划复用）

## 0. 核心设计

与"单本打标"（llm-auto-tagging-plan.md，逐本书独立判断）不同，本功能是**库级聚合分析**：

```
[分批读库: 每批 200 本 title/summary/writers/genres]
        ↓
[每批一次 LLM 调用:
   输入 = 本批书籍清单 + 当前全局标签词表
   输出 = ① 更新后的全局标签词表(只增不改不删)
          ② 每本书 → 标签名[] 的关联映射]
        ↓ (批间传递累积的标签词表)
[全部批次完成 → 建议结果入库(草稿态)]
        ↓
[人工确认 / 或达到阈值自动应用]
        ↓
[ensure_tags_linked 批量关联 → tags/media_tags 落库]
        ↓
[前端点击标签 → bookSearchWithFilter({tags:{anyOf:[name]}}) 查看书籍]
```

**Token 控制的关键**：批间只传递**标签词表**（几十~几百个短词）而非书籍历史；单批输入 = 200 本 ×（title+summary 截断 200 字）≈ 可控。几万本书 = 几十~几百次调用，走 job 分批 + 限速。

## 1. 后端

### 1.1 Job：`LlmLibraryTagJob`（或复用 LlmTagJob 加 scope=LibraryAnalysis）

注册模式同 llm-auto-tagging-plan.md §2.1（`StumpJob` variant + dispatch 分支）。执行逻辑：

- **init**：
  1. 读 LLM 配置 + 解密 key（`JobContext::get_encryption_key` + `decrypt_string`，core/src/job/context.rs:160-171）
  2. 读当前全局标签词表：`tags::Entity::find()` 全量
  3. 分批物化任务：`media::Entity::find()...offset/limit`（模板 core/src/metadata/provider/job.rs:339-367），每批 `BATCH_SIZE=200`（配置可调 100-300），每本携带 `media_id, title, summary(截断), writers, genres`
- **execute_task（每批）**：
  1. 组 prompt：本批书籍 JSON 清单 + 当前词表；指令 = "复用已有标签优先；新概念才新增标签；返回 `{new_tags: string[], assignments: {media_id: string[], tags: string[]}}`"
  2. 调 LLM（复用 llm crate 的 `build_client_with_retry` + `RateLimiter`）
  3. **合并词表**：`new_tags` ∪ 当前词表 → 下一批输入（**只增不改不删**，满足"已存在不动"要求；名字归一化 trim/小写比对，防 LLM 大小写变体产生重复）
  4. 本批 assignments 暂存内存/草稿表；`report_progress(批次 x/y)`
  5. 429/超限 → 标 RateLimited，剩余批交 cron 重试（沿用 MetadataRetry 模式）
- **finalize**：把全部 assignments + 最终词表写入草稿表（§1.2），状态 `AwaitingReview`（或达自动应用阈值时直接应用，见 §3）

### 1.1.1 并发与吞吐（速度问题）

书很多时（几万本 = 几十~几百次调用）串行太慢，采用**分段串行、段内并发**：

```
1 万本 = 10 段 × 5 批（并发 buffer_unordered(concurrency=4~8)）
每段跑完 → 合并该段词表 → 启动下一段（保证词表合并语义安全）
```

- `llm_tagging_config` 增加 `concurrency: u32`（默认 4，可调 8）字段；RateLimiter 升级为"并发槽 + RPM 计数"，429 退避兜底（真正的天花板是 API 提供方限额，不是本地代码）
- **断点持久化（必做）**：每批完成即把该批 assignments **增量写入草稿表**（草稿行 status=InProgress），job 中断/超限/重启后 skip 已完成批次，只跑剩余部分，不浪费已花 token
- 触发后用户可离开页面：JobOverlay 实时显示"批次 x/y 完成"，`ctx.is_canceled()` 可中途取消
- 每批完成时**刷新全局词表**：并发段内以"段启动时的词表快照"为基准，段结束合并（乐观策略），避免并发写冲突

### 1.2 结果草稿表（新 migration）

新表 `llm_library_tag_drafts`（或复用 llm-auto-tagging 的 `llm_tag_suggestions` 表加 `scope: book|library` 列——推荐独立表，结构更简单）：

| 列 | 类型 | 说明 |
|---|---|---|
| id | i32 PK | 一行 = 一次分析运行 |
| status | 字符串 | AwaitingReview/Applied/Failed/RateLimited |
| final_tag_list | JSON | 最终全局标签词表 |
| assignments | JSON `#[graphql(skip)]` | `[{media_id, tags: string[]}]` 全量关联建议 |
| books_analyzed | i32 | 统计 |
| completed_batches | i32 | 断点续跑游标（已完成的批次数）|
| created_at | timestamp | |

配套 entity/query/mutation（guard：query `MetadataFetchRecordRead`，mutation `EditMetadata`/`ManageLibrary`）。

### 1.3 应用 mutation

```graphql
applyLibraryTagSuggestions(draftId: Int!, mediaIds: [ID!], strategy: ApplyStrategy): Int!
```
- `strategy: MergeOnly`（推荐，默认）：**只增不删**——对每本书执行 `ensure_tags_linked` 语义（增量连接，不动已有标签；core/src/scan/utils/media.rs:148-214），缺失的 tag 自动创建（`TagCache` 模式，core/src/scan/tag_cache.rs:19-65）
- `strategy: ReplaceLlmManaged`（可选）：仅覆盖上次 LLM 打的标签（需记录来源，列为后续迭代）
- 支持 `mediaIds` 子集应用（用户只勾选部分书籍）；单事务批量执行
- 也可简单实现为循环调用现有 `setMediaTags`——但那是全量 set 语义会**删除**未提及标签，**不推荐**；必须用增量语义

### 1.4 触发方式

- mutation `runLlmLibraryTagAnalysis(libraryId: ID, forceRefetch: Boolean)`（guard `MetadataFetchRecordManage`；校验 LLM 已配置）
- 前端入口（二选一，建议都要）：
  1. 库设置页 `LibraryMetadataScene` 加 "AI 标签分析" 区块（照抄 InitFetchJob.tsx 模式：按钮 + 未配置 LLM 的 Alert）
  2. 侧边栏书库菜单 `LibraryOptionsMenu.tsx`（components/navigation/sidebar/sections/library/，现有 scanLibrary 项旁）加快捷项

## 2. 前端

### 2.1 触发 + 进度
- `LibraryMetadataScene` 的 AI 区块：触发按钮 + JobOverlay 自动显示批次进度（`report_progress` 已推送，前端 useCoreEvent 零开发）

### 2.2 结果确认页（建议与 sidebar-tags-feature-plan 的 `/tags` 页合并建设）
- 显示：`final_tag_list` 全量标签词表（新增的标签高亮"AI 新增"）+ 每标签书籍数（可先只显示数量需后端补 count query，最小版可省略）
- 书籍级明细：`assignments` 表格（书名 + 建议标签），支持勾选子集 → `applyLibraryTagSuggestions`
- 一键"全部应用"（MergeOnly 语义说明文案：不会移除已有标签）

### 2.3 点击标签看书籍（已存在，零开发）
- `paths.bookSearchWithFilter({ tags: { anyOf: [tag.name] } })`（packages/browser/src/paths.ts:83-86）→ BookSearchScene 已解析 URL filter 并调 `media(filter:)` 渲染
- 若按 sidebar-tags-feature-plan 建了 `TagSideBarSection`/`/tags` 页，标签点击统一走此跳转

### 2.4 i18n
`settingsScene`/`libraryScene` 相应块 + en/zh-CN/zh-TW（"AI 标签分析"/"开始分析"/"应用建议"/"只增不删说明"等），其余语言 Weblate。

## 3. 与功能 A（单本打标）的关系

| | A 单本打标 | B 全库推荐（本计划）|
|---|---|---|
| 粒度 | 每本书独立一次 LLM 调用 | 每批 200 本书一次调用 |
| 触发 | 扫描新增书后自动 / 手动 | 用户显式触发（全库一次性）|
| 输出 | 单书建议标签 | 全局词表 + 全量关联 |
| 成本 | 高（每书 1 调用）| 低（每 200 书 1 调用，几万本 ≈ 百次内）|
| 共用 | LLM 客户端 crate、限速/退避、cron 重试、codegen | 同左 |

**共用基建**（在 A 中先行建设）：LLM 客户端 crate、`llm_tagging_config` 配置列（B 增加字段 `batch_size`/`max_summary_chars`）、RateLimited 重试 cron、schema/codegen 流程。若 A 未实施，本计划需自带 §A-1 客户端部分。

## 4. 实施顺序

| 步骤 | 内容 | 依赖 |
|---|---|---|
| 1 | LLM 客户端 crate（若 A 未建） | 无 |
| 2 | `llm_tagging_config` 加 `batch_size` 等字段；`llm_library_tag_drafts` 表 migration + entity + query/mutation | 无 |
| 3 | `LlmLibraryTagJob`（分批 + 词表累积合并 + 草稿落库） | 1、2 |
| 4 | `runLlmLibraryTagAnalysis` / `applyLibraryTagSuggestions` mutation | 3 |
| 5 | 前端：触发区块 + 确认页 + codegen + i18n | 4 |
| 6 | 验证：cargo test、dump-schema --check、yarn graphql、check-types、browser test、小库实测 | 5 |

## 5. 风险与注意

- **worker 并发=1**：全库分析是长 job，运行期间会阻塞其他 job（扫描/缩略图）；文档提示用户错峰触发，长期可评估多 worker。缓解：分段并发已压缩总时长（1 万本约几十分钟级而非数小时），且支持断点续跑/随时取消
- **LLM 输出漂移**：assignments 中的 media_id 必须在批内校验存在；标签名做 trim/长度上限（如 50 字符）/去重归一，防止 LLM 产生 "Sci-Fi" 与 "sci-fi" 两条
- **词表膨胀**：批数多时词表可能线性膨胀；可在 prompt 中加"合并同义标签"指令，并在 finalize 时做一次可选的"词表整理"调用（后续迭代）
- **token 估算**：200 本 ×（title 50 + summary 200 + authors 30 + genres 20 字符）≈ 60KB/批输入 ≈ 1.5 万 token，加词表与指令 < 2 万 token/批，主流模型均可承载；summary 超长截断
- **只增不删语义**：严格使用 `ensure_tags_linked`（增量），绝不用 `setMediaTags` 全量 set 语义，避免误删用户手工标签
- **点击标签看书籍**：依赖现有 `bookSearchWithFilter` 链路（按标签 name 过滤），标签重命名后旧链接失效——与现有行为一致
