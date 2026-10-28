# Stump 项目启动指南（本机开发环境）

> 更新日期：2026-10-28（含本机踩坑修正：端口、VS 编译环境、PDFium、依赖安装）
> 适用：R:\_CODE_\RUST\stump（stump v0.1.11，monorepo）

## 1. 项目结构

- **后端**：Rust（Axum + SeaORM），入口 `apps/server`（二进制名 `stump_server`），核心逻辑在 `core/` 与 `crates/*`
- **Web 前端**：React（`packages/browser` + `apps/web`），由 Rust 服务器托管或以 Vite dev server 热更新运行
- **桌面端**：Tauri（`apps/desktop`）；**移动端**：Expo（`apps/expo`）
- **包管理**：前端 yarn 1.x workspaces（Node ≥ 20，本项目在 Node 24 验证），Rust 需要 rustup（rust-version 1.97.1）

## 2. 本机关键参数（与上游默认不同，务必先看）

| 项 | 本机实际值 | 说明 |
|---|---|---|
| 后端端口 | **10801**（非 8001）| 来自 `C:\Users\sky92\.stump\Stump.toml` 的 `port = 10801` |
| 前端 dev 端口 | **3000**（非 5173）| `apps/web/vite.config.mts` 的 `server.port = 3000` |
| 前端连后端地址 | `apps/web/.env.local` 的 `VITE_STUMP_SERVER_BASE_URL`（当前指向 http://127.0.0.1:10801）| 改后需重启 Vite |
| 数据/配置目录 | `C:\Users\sky92\.stump\`（Stump.toml、SQLite、日志 Stump.log、pdfium/）| |
| PDFium | `vendor/pdfium/bin/pdfium.dll`，已配置在 Stump.toml `pdfium_path` | PDF 扫描/阅读必需，缺失时 PDF 书报 "PDFium is not configured or available" |

## 3. 前置准备

### 3.1 前端依赖（跳过脚本 + 手动补丁）

```powershell
corepack yarn install --ignore-scripts   # 直接 install 会在 @stump/docs 的 postinstall (fumadocs-mdx hoisting) 报错
corepack yarn patch-package              # 补上 expo-router 等 3 个依赖补丁（--ignore-scripts 会跳过 postinstall）
corepack yarn husky                      # 如需 git hooks（可选）
```

> 依赖安装脚本报错的根因是 yarn hoisting 后 docs 包找不到 fumadocs-mdx；peer dependency warning（react@^16.8...）无害可忽略。

### 3.2 Rust 编译环境（每次新开终端都要，或写进 shell 配置）

`aws-lc-sys`（TLS 依赖）构建需要 MSVC 环境，直接 `cargo run` 会报
`NASM command not found` / `C1189 C atomics` / `Could not create named generator Visual Studio 18 2026`。
解法（已验证可用）：**加载 VS 开发环境 + 强制 Ninja 生成器 + 使用 VS 自带 ninja**。

PowerShell：
```powershell
& "C:\Program Files\Microsoft Visual Studio\18\Community\Common7\Tools\Launch-VsDevShell.ps1" -Arch amd64
$env:CMAKE_GENERATOR = "Ninja"
$env:PATH = "C:\Program Files\Microsoft Visual Studio\18\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\Ninja;" + $env:PATH
```

Git Bash：
```bash
cmd //c "\"C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat\" && set CMAKE_GENERATOR=Ninja && set PATH=C:\Program Files\Microsoft Visual Studio\18\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\Ninja;%PATH% && <你的命令>"
```

> 注：GitHub 下载走代理（本机 127.0.0.1:7890），如需下载 release 资产给 curl 加 `--proxy http://127.0.0.1:7890`。

### 3.3 GraphQL codegen

```powershell
corepack yarn graphql    # 已修复：原 lerna 写法缺参数报 "Not enough non-option arguments"
```
改动 `crates/graphql/schema.graphql` 或任何 `.graphql` 文档后必须执行。

## 4. 启动方式

### 4.1 Web 开发模式（推荐，前后端热更新）

开两个终端（或先修好 bacon 后用一条命令）：

终端 1 —— 后端（先完成 §3.2 环境准备）：
```powershell
cargo run -p stump_server
# 成功标志：日志 "Stump HTTP server starting on http://0.0.0.0:10801"
```

终端 2 —— 前端：
```powershell
corepack yarn workspace @stump/web dev
# 成功标志：VITE ready，访问 http://localhost:3000
```

> ⚠️ `corepack yarn dev:web` 依赖 bacon（未安装会报 "'bacon' 不是内部或外部命令"）。要么 `cargo install bacon --locked`，要么把根 package.json 的 `dev:web` 脚本里 bacon 换成 `cargo run -p stump_server`。

### 4.2 仅启动后端（生产形态）

```powershell
# 先构建 web（一次性或前端改动后）
corepack yarn workspace @stump/web build
# 在 VS 环境下启动（见 §3.2）
cargo run -p stump_server
```
访问：**http://127.0.0.1:10801**（服务器托管已构建的前端）。

### 4.3 桌面端（Tauri）

```powershell
corepack yarn start:desktop   # 后端 + 桌面 shell（同样受 bacon 影响）
corepack yarn dev:desktop
```

### 4.4 移动端（Expo）

```powershell
corepack yarn dev:expo
```

### 4.5 Docker（部署用，非开发）

官方镜像 `aaronleopold/stump`。

## 5. 数据与配置

- 配置文件：`C:\Users\sky92\.stump\Stump.toml`（端口、pdfium_path 等都在这里，直接改后重启后端生效）
- 数据库：SQLite，`db_path` 未配置时在用户数据目录 `.stump` 下
- 日志：`C:\Users\sky92\.stump\Stump.log`
- 登录：数据库已有账号时显示登录页（401 Unauthorized 日志属未登录探测，正常）；全新库才会进初始化流程

## 6. 常用开发命令

| 命令 | 作用 |
|---|---|
| `corepack yarn graphql` | 重新生成 GraphQL 类型（改 .graphql 后必须）|
| `node node_modules\typescript\bin\tsc -b packages\browser` | 前端类型检查（需先 `tsc -b packages\components`）|
| `corepack yarn --silent workspace @stump/browser test` | web 前端 vitest |
| `corepack yarn --silent workspace @stump/browser eslint src` | 前端 lint |
| `cargo test -p graphql` | GraphQL 层测试 |
| `cargo dump-schema` | 重导出 schema.graphql（改 Rust resolver/枚举后必须，`cargo dump-schema -- --check` 校验）|
| `corepack yarn check-types` / `lint` / `test` | 全工作区（部分走 lerna，可能踩 lerna 参数问题，建议用 workspace 级命令）|

## 7. 常见问题速查

| 症状 | 原因/解法 |
|---|---|
| `yarn install` 在 @stump/docs 报 fumadocs-mdx 找不到 | 用 `--ignore-scripts` + 手动 `patch-package`（§3.1）|
| cargo 报 NASM/C1189/VS 18 generator 错误 | 未加载 VS 环境，见 §3.2 |
| 页面 "Failed to connect" / 401 日志 | 后端未启动，或端口不是 8001——本机是 10801（§2），确认 `.env.local` |
| 访问 5173 打不开 | 前端端口是 **3000**（§2）|
| PDF 书扫描报 "PDFium is not configured or available" | `vendor/pdfium/bin/pdfium.dll` 已配置好，确认 Stump.toml `pdfium_path` 并重启后端 |
| `corepack yarn graphql` 报 lerna 参数错误 | 已修复（workspace codegen 写法）；若回退代码需用 `corepack yarn workspace @stump/graphql codegen` |

## 8. 功能验证清单（历次改造）

1. **i18n 中文**：Settings → General → Language 切换 zh-CN，走查书籍详情/设置/Book Club 等页面（见 i18n-hardcoded-strings-report.md）
2. **LLM 设置**：Settings → 管理 → 服务器 → **LLM**（URL/API Key/模型名 + 自动打标配置卡），保存按钮应显示"保存"
3. **LLM 打标**：库设置 → **Metadata** 页签 → AI Tagging（单本）/ AI 标签分析（全库），结果在待审核列表确认
4. 相关方案/报告：`plans/server-llm-settings-plan.md`、`plans/llm-auto-tagging-plan.md`、`plans/llm-library-tag-recommendation-plan.md`、`plans/sidebar-tags-feature-plan.md`（侧边栏 Tags 栏目，尚未实施）
