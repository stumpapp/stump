# Stump 工程分析简报

> 生成日期：2026-10-25 · 版本：0.1.11（beta，2026-10 刚发布）

## 一、项目定位

**Stump** 是一个自托管漫画/电子书媒体服务器（类 Komga/Kavita），Rust 后端 + React 19 前端 + Tauri 桌面 + Expo 移动端四端一体的 monorepo。仓库整体 MIT 许可（`apps/expo` 为 GPL-3.0-only）。

- Cargo workspace（`Cargo.toml`，Rust 1.97.1）+ Yarn/Lerna 前端 workspace（`lerna.json`）
- 规模：Rust ≈ 82k 行，TS/TSX ≈ 90k 行

## 二、架构总览

### Rust 侧

| Crate | 职责 | 规模 |
|---|---|---|
| `core` (stump_core) | 业务核心：配置、数据库、扫描、任务、OPDS、媒体处理（epub/pdf/rar/zip）、readium EPUB 生成、kobo、图像、元数据 | ~26.5k 行 |
| `apps/server` | Axum 0.8 HTTP 层：REST `/api/v2`、GraphQL、OPDS v1.2/v2.0、Kobo、KoReader、SPA 托管 | ~9k 行 |
| `crates/graphql` | async-graphql 7.2 schema：query/mutation/subscription/12 个 DataLoader/depth limit 15 | ~24.2k 行（最大） |
| `crates/models` | SeaORM 1.1 实体（40+：media/series/library/user/book_club/smart_list/reading_session…） | ~9.9k 行 |
| `crates/migrations` | sea-orm-migration，33+ 迁移；testcontainers PG 冒烟测试 | ~11.9k 行 |
| `crates/cli` | 管理员 CLI（账户/系统管理） | — |
| `crates/email` | lettre 推书邮件 | — |
| `crates/integrations/metadata` | 元数据刮削：AniList、ComicVine、Hardcover（governor 限流、匹配评分） | — |
| `crates/integrations/notification` | Discord / Telegram 通知 | — |
| `crates/macros/filter-gen` | 过程宏，自动生成 SeaORM filter/ordering | — |
| `crates/tests` | 测试基建（fake_data/fixtures） | — |
| `apps/desktop/src-tauri` | Tauri 2 桌面壳，可内嵌 server（bundled-server feature）、keyring、Discord Rich Presence | ~340 行 |

### 前端

- **`packages/browser`**（~53.7k 行）：全部 UI —— scenes（library/series/book/bookClub/smartList）、Readium Web 阅读器（`ReadiumWebReader.tsx` 904 行）、漫画 paged/continuous 阅读器、PDF 查看器、EPUB 注释系统；50+ vitest 测试
- **`packages/client`**：TanStack Query 5 + zustand + axios，GraphQL 客户端封装 + WebSocket
- **`packages/sdk`**：纯 TS API SDK + OPDS XML 解析
- **`packages/components`**：自研组件库（含 stories）
- **`packages/graphql`**：graphql-codegen 生成物（~14k 行）
- **`packages/i18n`**：i18next，32 语言（含 zh-CN/zh-TW，Weblate 持续更新）
- **`apps/web`**：Vite 8 + PWA SPA 壳，Playwright e2e
- **`apps/expo`**：React Native 移动端（readium/streamer/volumeListener/wifi-ssid 原生模块、drizzle 本地库）
- **`docs`**：Fumadocs 文档站

技术栈：React 19 + Vite 8 + TanStack Query 5 + react-router 8 + Tailwind 4 + zod + ts-pattern。

## 三、服务器关键能力

- **媒体格式**：EPUB、PDF（PDFium）、CBZ/ZIP、CBR/RAR（oneshot 自动转 ZIP，近期新增转换时重复媒体检测）—— `core/src/media/processor/`
- **API**：REST `/api/v2`、GraphQL `/api/graphql`（guard 权限 + 动态 schema subscription）、OPDS v1.2 + v2.0（已升级至 **v2 stable progression API**，`routers/opds/v2_0.rs` 1410 行）、Kobo 与 KoReader 同步
- **新功能（v0.1.11 前后）**：阅读时间线（reading timeline）基础 + 基础日志/journal 支持（PR #1460、#1472）、series 书籍位置排序改进（#1473）
- **数据库**：SeaORM 1.1，SQLite（默认，强制 WAL）或 PostgreSQL（`core/src/database.rs`）；加密密钥与 JWT secret 存 `server_config` 表
- **任务系统**：apalis 0.7 + croner 调度（`core/src/job/scheduler.rs`）：库扫描、缩略图、placeholder、元数据抓取、媒体分析；notify 文件监视自动扫描（`core/src/scan/watcher.rs`）
- **认证**：bcrypt(cost 12)、JWT 双 token、tower-sessions + SeaORM Session Store、API Key、OIDC、多用户权限/年龄限制
- **配置**：schematic，`Stump.toml` + `STUMP_` 环境变量（默认端口 10801），近期改进了配置解析失败的错误提示（#1468）

## 四、部署与 CI

- **Docker**（`docker/Dockerfile`）：4 阶段构建 → distroless/cc-debian12 最终镜像；PDFium sha1 校验；node:24 构建前端 + rust:1.97 编译后端；发布至 ghcr / Docker Hub
- **CI**（`.github/workflows/`）：paths-filter 按路径分流 —— Rust 走 fmt/clippy `-D warnings`/schema 校验/`cargo test`（含 PG tests）；前端 lint+test；另有 nightly、release（docker/binary/desktop）、cve_check（含误报 allowlist 扩充）、nix 工作流；codecov 上传

## 五、近期活跃度（v0.1.10 → v0.1.11）

- 553 文件变更（近 25 次提交窗口），节奏稳定
- 功能演进：OPDS v2 stable progression、阅读时间线/日志、expo 系统主题、i18n 多语言持续合入（Weblate）
- 修复类：oneshot 转换重复媒体、库删除后残留 mtime、无封面 EPUB 404、OPDS 2.0 分页不完整
- 安全：CVE 检查工作流有维护，漏洞修复 + 误报 allowlist 管理

## 六、代码质量评估

**亮点**
- 工程化程度高：workspace 依赖集中管理（按字母序）、cargo 别名、bacon、husky + lint-staged
- filter-gen 过程宏消除 SeaORM 查询样板
- thiserror 错误链 + `#[tracing::instrument]` 全覆盖；前端 zod schema 校验
- 测试资产：Rust 60+ `#[cfg(test)]` 模块、migrations testcontainers PG 测试、core 基准（library_scanner、epub_search）、前端 50+ vitest + Playwright e2e
- 发布纪律好：版本号前后端一致、release 工作流完善、CVE 扫描常态化

**短板 / 风险**
1. 测试覆盖率门槛仅 10%（`.github/codecov.yml`），核心逻辑（扫描、任务）覆盖明显不足
2. 依赖锁死：`zip =1.1.3` 精确锁定、epub 用 stumpapp fork 分支（`Cargo.toml` 注明上游阻塞）
3. 个别文件体量过大：`crates/graphql` library mutation ~1457 行、migrations init 4147 行
4. 加密 key 初始化存在 TODO 自认不安全（`core/src/lib.rs:148`）
5. 部分测试被注释（`crates/graphql/src/filter/media.rs:202`）
6. Rust CI 跑在 self-hosted runner，可持续性依赖个人基础设施

## 七、结论

Stump v0.1.11 是一个成熟度较高的 beta 项目：架构分层清晰（core/graphql/models/server + 前端多包），生态兼容完善（OPDS/Kobo/KoReader/Readium），迭代活跃且发布纪律良好。下一阶段优先事项建议：提升测试覆盖门槛、解除 zip/epub 依赖锁死、修复加密 key 初始化 TODO、拆分超大 GraphQL 文件。
