# 改造计划：服务器设置新增【LLM】配置页

> 日期：2026-10-25
> 目标：在 Web 设置【管理(Server)】分组的【服务器】下新增【LLM】一栏（与 服务器信息/服务器配置 同级），内含 **URL（网址）**、**API Key（密钥）**、**Model Name（模型名）** 三个带 label 的文本输入框，样式与"公共网址（Public URL）"一致。

## 0. 调研结论（可行性）

改造成本低，`publicUrl`（公共网址）就是完整的现成模板（DB 字段 → GraphQL resolver → 前端输入框）。功能 = **DB 加 3 列 + 1 个 mutation + schema 重生成 + 前端新路由/新场景 + locale**。

**关键安全决策**：API Key 属敏感字段，必须沿用 SMTP 密码 / 元数据提供方 API Token 的既有先例——**DB 加密存储 + `#[graphql(skip)]` 永不回传前端**（写入后只能覆盖、不能查看明文）。`llmUrl`/`llmModelName` 为普通可回读列（同 `public_url`）。

**存储位置澄清**：运行时可编辑的 serverConfig 存在数据库 `server_config` 表（`crates/models/src/entity/server_config.rs`），而不是 `core/src/config/stump_config.rs`（那是以 TOML/env 加载的启动配置 `StumpConfig`）。

## 1. 后端改造（Rust）

### 1.1 数据库迁移（新文件）
- 新建 `crates/migrations/src/m<日期>_add_llm_config.rs`：`server_config` 表新增 3 列，均 `text().null()`：
  - `llm_url`
  - `llm_model_name`
  - `llm_encrypted_api_key`
- 范式参考：`crates/migrations/src/m20260220_000000_user_avatar_path.rs`（`Table::alter().add_column(...)`），down 反向 drop
- 注册：`crates/migrations/src/lib.rs`（mod 声明 + `Migrator::migrations()` vec 两处，L1-38）

### 1.2 实体字段
`crates/models/src/entity/server_config.rs` `Model`（L7-22）新增：
```rust
pub llm_url: Option<String>,
pub llm_model_name: Option<String>,
#[graphql(skip)] // 参考 L13-21 的 jwt_secret 先例：敏感字段永不出 GraphQL
pub llm_encrypted_api_key: Option<String>,
```

### 1.3 GraphQL Mutation
`crates/graphql/src/mutation/server_config.rs`（现有 `update_public_url` L12-33 旁）新增：

```graphql
updateLlmConfig(url: String, modelName: String, apiKey: String): ServerConfigModel!
```

要点：
- guard：`#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]`（同 `update_public_url`）
- `api_key` 非 None 且非空时：`core_ctx.get_encryption_key().await?` + `stump_core::utils::encryption::encrypt_string` 加密后存 `llm_encrypted_api_key`（加密流程模板：`crates/graphql/src/input/emailer.rs:20-46`、`crates/graphql/src/mutation/emailer/emailer.rs:33-52`；密钥获取在 `core/src/context.rs:190-201`）
- 传 `None` = 不修改该字段；传空字符串 = 清除（语义在 resolver 中明确）
- url/model_name 直接 `Set` 到 `into_active_model()` 后 `update(conn)`
- （可选）输入较多时新建 `crates/graphql/src/input/server_config.rs` 输入对象，仿 `input/emailer.rs`

注册位置不变（resolver 挂在既有 `server_config` mutation 类型下）。之后：

```powershell
cargo dump-schema        # 重新生成 crates/graphql/schema.graphql（bin: crates/graphql/bin/main.rs，别名见 .cargo/config.toml）
cargo check
cargo test -p graphql
```

> 说明：查询侧无需新增——前端直接从既有 `serverConfig { ... }` query（`crates/graphql/src/query/server_config.rs:10-22`，ManageServer guard）读取 `llmUrl`/`llmModelName`；api key 因 `#[graphql(skip)]` 不可读（符合安全预期）。

## 2. 前端改造（packages/browser）

### 2.1 GraphQL 类型重生成
仓库根目录执行：
```powershell
corepack yarn graphql    # = lerna run --scope @stump/graphql，codegen 产物 packages/graphql/src/client/{graphql,gql}.ts
```

### 2.2 设置路由与导航（改一处，三处生效）
- `packages/browser/src/scenes/settings/routes.ts`：Management 分组（L64-88 区域）新增条目：
  ```ts
  {
      icon: <Sparkles />, // lucide 图标自选
      label: 'LLM',
      localeKey: 'server/llm',
      permissions: [UserPermission.ManageServer],
      to: '/settings/llm',
  }
  ```
- `SettingsRouter.tsx`：L25 附近 lazy 导入 `LLMSettingsScene`；L54 附近 `{canManageServer && <Route path="llm" element={<LLMSettingsScene />} />}`
- 侧边栏（SettingsSideBar）、顶栏下拉（SettingsNavigation）、页头（SettingsHeader）均由 `useSettingsRoutes.ts` 驱动，**无需改动，自动出现 LLM 入口**

### 2.3 新场景页（新建 `scenes/settings/server/llm/`）
`LLMSettingsScene.tsx` —— 页面骨架仿 `GeneralServerSettingsScene.tsx`（SceneContainer + Helmet + ContentContainer + NewCard 分组），表单采用 **ProfileForm 模式**（`scenes/settings/app/general/ProfileForm.tsx`）：

- 读初值：`useSuspenseGraphQL(query ServerConfigLlm { serverConfig { llmUrl llmModelName } }, ['serverConfig'])`（api key 不可读，输入框留空表示"不修改"）
- 表单：`Form`（react-hook-form `useForm` + `zodResolver`）+ 三个输入框，均带 `label` + `description`：
  | 字段 | 组件 | 说明 |
  |---|---|---|
  | URL | `Input` | zod 校验：可选合法 URL（参考 `shared.common.invalidUrl` 文案）|
  | API Key | `PasswordInput` | 留空提交 = 不修改；有"已设置"状态提示（可选）|
  | Model Name | `Input` | 可选字符串 |
- 提交：`useGraphQLMutation(updateLlmConfig)`；onSuccess 更新 query cache（`client.setQueryData(['serverConfig', ...])`）+ `toast.success`；onError `toast.error(t('...updateFailed'))`
- 保存按钮：参照 ProfileForm 的 disabled 逻辑（值未变化时禁用）
- UI 组件来源：`NewCard`（`packages/components/src/card/NewCard.tsx`）、`Input`（`packages/components/src/input/Input.tsx`）、`PasswordInput`、`Form`——与公共网址设置完全同款
- 另一个更简模式（可选）：完全复制 `ServerPublicURL.tsx` 的"防抖自动保存、无按钮"交互；本计划默认采用带保存按钮的表单模式（三个字段一次提交）

### 2.4 i18n
`packages/i18n/src/locales/en-US.json`：
- `settingsScene.sidebar.management` 加 `"llm": "LLM"`（侧边栏/下拉菜单 key 为 label 小写，SettingsSideBar.tsx:53-54）
- 新增块（页头/Helmet 用 `settingsScene.{localeKey}.title|.description|.helmet`）：
  ```json
  "server/llm": {
      "helmet": "LLM Settings",
      "title": "LLM",
      "description": "Configure an LLM provider for AI-powered features",
      "sections": {
          "llm": {
              "url":       { "label": "URL",        "description": "Base URL of the LLM API endpoint" },
              "apiKey":    { "label": "API Key",    "description": "Stored encrypted, write-only" },
              "modelName": { "label": "Model Name", "description": "e.g. gpt-4o, deepseek-chat" },
              "updateFailed": "Failed to update LLM configuration",
              "updateSuccess": "LLM configuration updated"
          }
      }
  }
  ```
- 同步补 `zh-CN` / `zh-TW`（`"llm": "LLM"`、网址/密钥/模型名等），其余语言走 Weblate

## 3. 实施顺序与工作量估算

| 步骤 | 内容 | 规模 |
|---|---|---|
| 1 | 迁移文件 + lib.rs 注册 | ~40 行 |
| 2 | server_config 实体 3 字段 | ~5 行 |
| 3 | `update_llm_config` resolver（含加密） | ~60 行 |
| 4 | `cargo dump-schema` + `cargo check/test` | 命令 |
| 5 | `yarn graphql` codegen | 命令 |
| 6 | routes.ts + SettingsRouter 注册 | ~15 行 |
| 7 | LLMSettingsScene 场景 + 表单 | ~150 行 |
| 8 | i18n（en + zh-CN + zh-TW） | ~30 行 |
| 9 | 验证：`yarn check-types`、`yarn lint`、`cargo dump-schema --check`、手动走查 | — |

## 4. 风险与注意

- **API Key 安全**：严格遵循"只写不读"先例（SMTP 密码、metadata provider token），前端不可回显明文；如未来需要"是否已配置"状态，可让 `serverConfig` 暴露布尔字段 `llmApiKeyConfigured: Boolean!`（在 resolver 里 `is_some()` 判断，仍不暴露值）
- **schema 同步**：忘记 `cargo dump-schema` 会导致 CI panic（提示 "Please run 'cargo dump-schema'"），务必在提交前执行并连同 `packages/graphql` codegen 产物一起提交
- **迁移幂等**：迁移文件命名与注册顺序遵循现有时间戳约定，避免与 `crates/migrations/src/lib.rs` 中已注册列表冲突
- **权限**：页面与 mutation 均 `ManageServer` 门控，普通用户在设置导航中不可见（`useSettingsRoutes` 自动过滤）
- **与"公共网址"同级关系**：LLM 条目放在 Management 分组 `server/general`（服务器）条目之后即可呈现为同组并列项；若希望严格作为"服务器设置内的子栏"，也可做成 `server/general` 的 `subItems`（参考 routes.ts 中 Email 条目的 `subItems` + `matcher` 写法，L128-155）——默认方案采用独立条目，与"服务器信息/服务器配置"页面同级，符合需求描述
