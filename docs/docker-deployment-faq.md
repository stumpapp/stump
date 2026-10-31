# Docker 部署问答（本工程定制版）

> 更新日期：2026-10-31
> 适用：R:\_CODE_\RUST\stump（含全部本地改造：i18n、LLM 设置、LLM 自动打标、标签筛选抽屉）
> 工程自带 `docker/Dockerfile`（三阶段：下载 PDFium → 构建 Web 前端 → 编译 release 后端），所有本地改动都会打进镜像。
>
> 提供两种完整部署流程，**二选一**即可：
> - **流程 A：`docker run`**——一条命令直给，适合快速上手
> - **流程 B：`docker compose`**——参数文件化，适合长期生产运行与日常运维

## 通用前置知识（两种流程都涉及）

- **代理**：构建时容器内要访问 GitHub（下载 PDFium）与 crates/npm 仓库，本机直连 GitHub 不通，需走本机 Clash 代理（127.0.0.1:7890）。容器内访问宿主机代理用 `host.docker.internal`（Windows Docker Desktop 开箱即用；Linux 宿主机需加 `extra_hosts: ["host.docker.internal:host-gateway"]`）
- **构建时长**：首次构建含 Rust release 全量编译，约 30-60 分钟；Docker 有层缓存和 cargo/yarn 缓存挂载，二次构建快很多
- **PDFium**：由 Dockerfile 内置（`PDFIUM_PATH` 自动设置），PDF 支持开箱即用
- **数据隔离**：容器部署使用独立配置目录（如 `C:\Users\sky92\.stump-docker`），与本机 dev 模式的 `C:\Users\sky92\.stump` 互不影响
- **镜像内是干净环境**：不会遇到本机的 docs 包 hoisting / VS 环境等问题

---

## 流程 A：`docker run` 完整流程

### A1. 构建镜像（仓库根目录执行）

```powershell
docker build --network host `
  --build-arg HTTP_PROXY=http://host.docker.internal:7890 `
  --build-arg HTTPS_PROXY=http://host.docker.internal:7890 `
  -f docker/Dockerfile -t stump:local .
```

### A2. 运行容器

```powershell
docker run -d --name stump `
  -p 10801:10801 `
  --restart unless-stopped `
  -v C:\Users\sky92\.stump-docker:/config `
  -v R:\_BOOK_:/data/books `
  stump:local
```

- `-v C:\Users\sky92\.stump-docker:/config`：持久化数据库与配置（LLM 配置也在这里，重启不丢）。**不要复用本机的 `.stump` 目录**（本机是 Windows 环境路径，容器是 Linux，用独立新目录）
- `-v R:\_BOOK_:/data/books`：把书库根目录挂进容器
- `--restart unless-stopped`：开机自启/崩溃自动重启（生产建议）

### A3. 访问与初始化

- 打开 **http://127.0.0.1:10801**
- 全新数据库，需重建管理员账号
- 添加书库时路径填**容器内路径**：`/data/books/未分类`（不是 R:\ 路径）
- LLM 设置（URL/API Key/模型名/自动打标配置）在新库里重新填一次

### A4. 日常运维

```powershell
docker logs -f stump                        # 实时日志
docker logs --tail 100 stump                # 最近 100 行
docker restart stump                        # 重启
docker stop stump; docker rm stump          # 停止并删除容器（数据在卷里，不丢）
```

### A5. 代码更新后重新部署

```powershell
docker stop stump; docker rm stump
# 重新执行 A1（有缓存，比首次快很多）→ A2
```

### A6. 端口修改

`-p 宿主机端口:10801`，宿主机端口随意（如 `-p 8080:10801`），容器端口保持 10801（与镜像内 `STUMP_PORT` 一致）。

---

## 流程 B：`docker compose` 完整流程

### B1. 创建 `docker-compose.yml`（仓库根目录）

```yaml
services:
  stump:
    build:
      context: .
      dockerfile: docker/Dockerfile
      args:
        HTTP_PROXY: http://host.docker.internal:7890
        HTTPS_PROXY: http://host.docker.internal:7890
    image: stump:local
    container_name: stump
    restart: unless-stopped
    ports:
      - "10801:10801"
    volumes:
      - C:\Users\sky92\.stump-docker:/config
      - R:\_BOOK_:/data/books
    # 如 LLM API 需走代理再打开：
    # environment:
    #   HTTP_PROXY: http://host.docker.internal:7890
    #   HTTPS_PROXY: http://host.docker.internal:7890
```

- `build.args` 即构建代理参数（对应流程 A1 的 `--build-arg`）
- Linux 宿主机需额外加：
  ```yaml
      extra_hosts:
        - "host.docker.internal:host-gateway"
  ```

### B2. 首次部署 / 代码更新

```powershell
docker compose up -d --build
```

（一条命令完成构建 + 启动；有缓存时更新很快）

### B3. 访问与初始化

与流程 A3 相同：http://127.0.0.1:10801 → 建管理员 → 书库路径填 `/data/books/未分类` → 重填 LLM 设置。

### B4. 日常运维

```powershell
docker compose logs -f stump     # 实时日志
docker compose ps                # 运行状态
docker compose restart stump     # 重启
docker compose down              # 停止（数据在卷里，不丢）
```

### B5. 端口修改

改 `ports` 的宿主机侧（如 `"8080:10801"`），然后 `docker compose up -d`。

---

## 两种流程怎么选？

| | 流程 A（docker run）| 流程 B（compose）|
|---|---|---|
| 上手速度 | 快，无额外文件 | 需先写 yaml |
| 参数管理 | 全在命令行/文档里 | 集中在 yaml，可进 git |
| 升级 | stop/rm/build/run 重复 | `up -d --build` 一条 |
| 生产建议 | 单机自用、局域网访问 | 长期运行、需 HTTPS 反代/多服务编排 |

**结论**：不强制用 compose（Stump 是单体应用，一个容器即全部）。家庭服务器长期运行建议流程 B。

---

## 常见问题

- **构建时 GitHub 下载失败**：没加代理参数，见通用前置知识 / 流程 A1
- **容器启动后页面打不开**：检查 `-p` 端口映射和 Windows 防火墙；`docker logs stump` 看启动日志
- **添加书库时找不到书**：书库路径必须填**容器内路径**（`/data/books/...`），确认 `-v` 挂载正确
- **PDF 报 PDFium 错误**：正常不会发生（镜像内置）；如出现，确认用的是本工程 Dockerfile 构建的镜像而非官方 `aaronleopold/stump`
- **数据存哪里？如何备份？**：SQLite/Stump.toml/日志在 `/config` 卷（宿主机 `.stump-docker`），备份该目录即可；书籍本体在宿主机 `R:\_BOOK_`。⚠️ `/config` 卷路径一旦确定就不要换，否则数据库会"消失"（数据还在旧卷里，挂回去即可）
- **LLM API 在容器内连不上**：运行/编排时加 `HTTP_PROXY`/`HTTPS_PROXY` 环境变量（见流程 B yaml 注释）
- **与本机 dev 模式的区别**：dev 模式（cargo run + Vite）改代码热更新、数据库在 `core/dev.db`；Docker 改代码需重建镜像、数据库在 `/config` 卷——两套完全独立
