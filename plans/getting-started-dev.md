# Stump 项目启动指南（本机开发环境）

> 日期：2026-10-25
> 适用：R:\_CODE_\RUST\stump（stump v0.1.11，monorepo）

## 1. 项目结构

- **后端**：Rust（Axum + SeaORM），入口 `apps/server`（二进制名 `stump_server`），核心逻辑在 `core/` 与 `crates/*`
- **Web 前端**：React（`packages/browser` + `apps/web`），由 Rust 服务器托管或以 Vite dev server 热更新运行
- **桌面端**：Tauri（`apps/desktop`）；**移动端**：Expo（`apps/expo`）
- **包管理**：前端 yarn 1.x workspaces（Node ≥ 20，本项目在 Node 24 验证），Rust 需要 rustup（rust-version 1.97.1）

## 2. 前置准备（一次性）

```powershell
# 前端依赖（在仓库根目录）
corepack yarn install
# 或系统已装 yarn 1.x 时直接：yarn install

# GraphQL codegen 产物（若 packages/graphql 未生成，先执行）
corepack yarn graphql
```

> 本机注意：`yarn` 未加入 PATH 时用 `corepack yarn` 代替；浏览器访问前需至少构建一次 web 资源或使用 dev 模式。

## 3. 启动方式

### 3.1 Web 开发模式（推荐日常开发，前后端热更新）

```powershell
corepack yarn dev:web
```

等价于并行执行：
- 后端：`bacon run-server --headless`（等价 `cargo run -p stump_server`，需安装 [bacon](https://github.com/Canop/bacon)；没有 bacon 时直接用 `cargo run -p stump_server`）
- 前端：`yarn web dev`（Vite dev server）

访问：浏览器打开 Vite 输出的地址（默认 http://localhost:5173），API 代理到后端（默认 http://localhost:8001）。

### 3.2 仅启动后端（生产形态，托管已构建的 web 资源）

```powershell
corepack yarn setup      # = yarn install + yarn web build（首次或前端改动后）
cargo run -p stump_server
```

访问：http://localhost:8001 —— 首次启动会进入初始化页面创建管理员账户。

### 3.3 桌面端（Tauri）

```powershell
corepack yarn start:desktop   # 后端 + 桌面 shell
corepack yarn dev:desktop     # 开发模式
```

### 3.4 移动端（Expo）

```powershell
corepack yarn dev:expo
```

### 3.5 Docker（部署用，非开发）

官方镜像 `aaronleopold/stump`，挂载数据目录与书籍目录、映射 8001 端口即可。

## 4. 数据与配置

- 首次运行 `cargo run` 会自动创建 SQLite 数据库（默认位于用户数据目录下的 `.stump`，可在启动参数/环境变量中调整）
- 初始化：首次访问 Web 界面创建服务器管理员账号，然后添加书库（Library）指向本地漫画/书籍目录并扫描

## 5. 常用开发命令

| 命令 | 作用 |
|---|---|
| `corepack yarn check-types` | 全工作区类型检查 |
| `corepack yarn lint` | 全工作区 lint |
| `corepack yarn test` | 全工作区测试 |
| `corepack yarn browser test` | 仅 web 前端 vitest（当前 49 文件 / 273 用例）|
| `corepack yarn format` | 格式化 |
| `corepack yarn graphql` | 重新生成 GraphQL 类型（改动 `.graphql` 文件后必须执行）|

## 6. 验证本次 i18n 改造效果

1. 按 3.1 或 3.2 启动
2. 登录后进入 **Settings → General → Language** 切换为 **简体中文 (zh-CN)**
3. 走查此前硬编码英文的区域：书籍详情统计/菜单、删除确认弹窗、图书馆缩略图设置、用户管理、Book Club、筛选器、阅读器控件等，应全部显示中文
4. 其余语言缺失词条回退英文属预期，译文经 Weblate 持续补齐

详细改造内容见 [i18n-hardcoded-strings-report.md](./i18n-hardcoded-strings-report.md)。
