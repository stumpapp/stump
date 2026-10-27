# 改造计划：LLM 单本书籍自动打标（扫描钩子 + 审核队列 + 成本控制）

> 日期：2026-10-26
> 前置：LLM 设置已落地（`server_config.llm_url/llm_model_name/llm_encrypted_api_key`，`/settings/llm` 页面，见 plans/server-llm-settings-plan.md）
> 模板来源：metadata fetching job 管线 + metadata matching 审核机制

## 0. 设计原则

- **全面复用现有模式**：Job 骨架照抄 `MetadataFetchJob`，审核队列照抄 `metadata_fetch_records` + PendingMatches 前端结构，HTTP 客户端复用 `build_client_with_retry` + `RateLimiter`
- **安全**：API Key 沿用"加密存储 + 只写不读"，job 内解密使用后即弃
- **成本可控**：限速（governor RPS）+ 429/5xx 指数退避 + RateLimited 状态 + cron 重试 + 每日调用上限

## 1. 新建 LLM 客户端模块（crates/integrations/llm/）

仿 `crates/integrations/metadata/` 新建 crate：

```
crates/integrations/llm/
  src/
    lib.rs          // LlmClient::new(url, model, api_key, rate_limit)
    client.rs       // build_client_with_retry 复用（integrations/metadata/src/client.rs:49-61 的模式）
    types.rs        // ChatRequest/ChatResponse（OpenAI 兼容 /v1/chat/completions 协议）
    tagging.rs      // suggest_tags(book: BookTaggingInput, existing_tags: &[String]) -> LlmTagResult
```

- 调用：`client.post(format!("{url}/chat/completions")).bearer_auth(key).json(&body)`（模板 hardcover.rs:64-96）
- Prompt：输入 = 书籍元数据（title/summary/writers/genres/year）+ **已有标签封闭词表**；输出 = JSON 数组的标签建议 + 置信度/理由；要求模型优先复用已有标签，无合适时才提新标签
- 解密：构造 client 前由调用方 `decrypt_string(llm_encrypted_api_key, &get_encryption_key())`（模式：core/src/metadata/provider/cache.rs:40-46）

## 2. Job：`LlmTagJob`

### 2.1 注册
- `core/src/job/dispatch.rs`：`StumpJob` 加 variant（L73-97）、`name()`(L101)、`description()`(L113)、构造函数(L133-158)、`dispatch_job` match(L245-280)、`CoreJobOutput` union(L33-42)
- 参数复用 scope 设计：`LlmTagJobParams { scope: MetadataFetchScope, force_refetch: bool }`（复用 `core/src/metadata/provider/job.rs:32-42` 的枚举）

### 2.2 执行逻辑（照抄 MetadataFetchJob 结构，core/src/metadata/provider/job.rs）
- **init**（参考 L211-380）：按 scope 查库物化 `VecDeque<Task>`；非 force_refetch 时跳过已有建议记录的书（对应 L440-459 的 skip 逻辑）
- **execute_task**（参考 L382-772）：
  1. 读 `server_config` LLM 配置，未配置 → job 直接 fail 并提示
  2. 每 task：取书籍 metadata → 调 LLM → 写建议记录（见 §3）→ `report_progress`
  3. 状态机：`Suggested`（进审核）/ `AutoApplied`（达阈值时）/ `Failed` / `RateLimited`
- **Auto-apply**（可选开关）：置信度 ≥ 阈值时直接调 `ensure_tags_linked` 应用并标记，否则留审核（阈值配置见 §5）

## 3. 审核队列表（新 migration）

新表 `llm_tag_suggestions`（完全照抄 `metadata_fetch_records` 结构，crates/models/src/entity/metadata_fetch_record.rs:11-36）：

| 列 | 类型 | 说明 |
|---|---|---|
| id | i32 PK | |
| media_id | String | 关联书籍 |
| status | 枚举字符串 | Suggested/AutoApplied/Accepted/Rejected/Failed/RateLimited |
| suggested_tags | JSON `#[graphql(skip)]` | `Vec<{name, confidence, reason}>` |
| applied_tags | JSON | 实际应用的标签名 |
| created_at/updated_at | timestamp | |

配套：
- entity：`crates/models/src/entity/llm_tag_suggestion.rs`
- query：`pendingLlmTagSuggestions`（guard `MetadataFetchRecordRead`，查 status=Suggested）——照抄 `crates/graphql/src/query/metadata_provider.rs:68-83`
- mutation 族（guard `EditMetadata`）：
  - `acceptLlmTagSuggestions(mediaId)` → `ensure_tags_linked` 应用（core/src/scan/utils/media.rs:148-214 的增量语义）
  - `rejectLlmTagSuggestions(mediaId)`
  - `acceptAllLlmSuggestions` / `rejectAllLlmSuggestions`（照抄 metadata_provider.rs:99-200 的批量事务）
- migration 文件 + `crates/migrations/src/lib.rs` 注册

## 4. 扫描钩子 + 手动触发

### 4.1 扫描后自动
`core/src/scan/library.rs` 的 `LibraryScanJob::finalize`，在现有 metadata fetch 自动触发块（L390-418）旁追加：
- 条件：LLM 配置已填写（url+key+model 三者非空）**且** LLM 打标开关开启（见 §5）**且** `did_create_media`
- 动作：`ctx.enqueue(StumpJob::llm_tag(LlmTagJobParams::media_in_library(id)))`

### 4.2 手动触发
- mutation：`fetchLibraryMetadata`（crates/graphql/src/mutation/library.rs:1209-1251）旁加 `runLlmTagging(libraryId, forceRefetch)`（guard `MetadataFetchRecordManage`）
- 前端：库设置页 `LibraryMetadataScene` 加 "AI Tagging" 区块（照抄 `InitFetchJob.tsx` 的按钮 + 未配置 Alert 模式）

## 5. 配置与成本控制

### 5.1 配置存储
方案：在 `server_config` 表再加一列 `llm_tagging_config: JSON`（新 migration，与功能 B 共用），内容：
```json
{
  "enabled": true,
  "auto_apply_threshold": 0.9,
  "requests_per_second": 0.5,
  "concurrency": 4,
  "daily_request_limit": 2000,
  "batch_scope": "new_books_only"
}
```
- 前端在 `/settings/llm` 页（LLMSettingsScene）加"自动打标"配置卡（NewCard + Form，模式已熟）
- 读：扩展 `serverConfig` query 的返回；写：`updateLlmTaggingConfig(config: JSON)` mutation（ManageServer guard）

### 5.2 成本控制实现
- 限速：`RateLimiter::new(requests_per_second)`（integrations/metadata/src/rate_limit.rs 模式）
- 退避重试：`build_client_with_retry`（429/5xx 重试 3 次；持续 429 → 标 RateLimited）
- 每日上限：`llm_tag_suggestions` 按天计数查询，超限后剩余 task 直接标 RateLimited，交由 cron 重试 job（照抄 `JobScheduler` 的 MetadataRetry 模式，scheduler.rs:129-134，`scheduled_jobs` 加 kind）
- Job 输出统计 tokens 用量（`CoreJobOutput` 加 `LlmTag { tasks, tokens_used }`，无先例、需新增）

### 5.3 并发与吞吐（速度问题）

书多时串行调用太慢，解法组合（按优先级）：

1. **任务级并发**：功能 A 的书与书完全独立，用 `futures::stream::buffer_unordered(N)` 并发执行；`llm_tagging_config` 增加 `concurrency: u32`（默认 4）字段。真正的天花板是 API 提供方 RPM/TPM 限额，RateLimiter 从"RPS 限速"升级为"并发槽 + RPM 计数"，429 退避兜底
2. **后台异步掩盖延迟**：LLM 打标是 apalis Job，触发后用户可离开页面，JobOverlay 实时显示"已完成 x/N"；`ctx.is_canceled()` 支持中途取消
3. **断点续跑（必做）**：每本书的建议记录**写完即持久化**（逐条 upsert `llm_tag_suggestions`），job 中断/超限/重启后重跑只处理无记录的书（skip 逻辑天然支持），不浪费已消耗 token
4. **减少调用量**：`force_refetch=false` 时跳过已有标签的书；summary 截断；大量存量书优先用功能 B（批处理，调用数省 200 倍），A 只做增量新书

## 6. 前端审核队列 UI

照搬 metadata matching 结构（packages/browser/src/components/metadata/metadataMatching/）：
- 新组件目录 `components/metadata/llmTagging/`：
  - `PendingTagSuggestionsTable.tsx`（列表：书名 + 建议标签芯片 + 置信度）
  - `TagReviewDialog.tsx`（逐条：勾选采纳哪些建议标签 → accept）
  - `useLlmTagReviewStore.ts`（zustand）+ `useLlmTagActions.ts`（四个 mutation document + invalidate）
- 挂载点：
  - 库设置页 `LibraryMetadataScene`（与 PendingMatchesSection 并列）
  - 触发区块：`InitFetchJob.tsx` 旁的 "AI Tagging" 卡片（开始/取消按钮 + JobOverlay 进度自动显示，无需额外开发）

## 7. 实施顺序

| 步骤 | 内容 | 依赖 |
|---|---|---|
| 1 | LLM 客户端 crate（协议调用 + prompt + 解析） | 无 |
| 2 | 建议表 migration + entity + query/mutation | 无 |
| 3 | LlmTagJob + StumpJob 注册 | 1、2 |
| 4 | 扫描钩子 + 手动触发 mutation + 配置列 | 3 |
| 5 | 前端审核 UI + 触发/配置卡 + codegen | 4 |
| 6 | 验证：cargo test、dump-schema --check、yarn graphql、check-types、browser test | 5 |

## 8. 风险与注意

- **worker 并发=1**（apps/server/src/http_server.rs:145）：LLM job 是长任务，会独占队列阻塞扫描/缩略图 job。缓解：LLM job 每批间 sleep 让出、或后续评估提高 worker 并发数（独立列出，不在本计划强改）
- **prompt 逃逸/注入**：书籍元数据是用户可控文本，作为 content 传入即可，不拼入 system prompt；响应强制 JSON schema 解析，解析失败重试一次后标 Failed
- **幻觉标签**：默认进人工审核（auto-apply 默认关闭），且 prompt 优先复用已有标签词表
- **保密**：书籍元数据发送给外部 LLM API 属用户自主行为，配置页需加免责说明文案
