# 改造计划：标签 Tags 选择与浏览（v3）

> 日期：2026-10-28（v3 修订：弃用下拉框，改为独立抽屉）
> v1：侧边栏 Tags 栏目 → v2：顶栏多选下拉框 → **v3（当前）：顶栏新增【按tag标签筛选】小按钮，点击从右侧弹出筛选抽屉**

## 0. 需求（v3 最终形态）

1. **入口**：书库浏览页顶栏，在【配置URL筛选器】按钮（URLFilterDrawer 的触发按钮）**旁边**新增一个小按钮【按tag标签筛选】，样式/形态模仿该按钮（图标 icon button，如 lucide `Tags`/`Tag` 图标）
2. **抽屉**：点击后**从右侧弹出 Drawer**（与 URLFilterDrawer 同款交互）
3. **抽屉内容**：当前书库**扫描得到的 tags 列表**（不含其他书库的 tag），**顶部带搜索输入框**（输入即过滤列表项，纯前端 filter，不另发请求），列表项结构：
   - 左侧：**checkbox 可勾选**（多选）
   - 主体：**tag 名称**（被搜索词命中的部分可高亮，样式从简）
   - 名称右侧：**小数字 = 符合该 tag 的书籍数量**
   - 搜索无结果时显示空态提示（复用风格统一的空态文案）
   - 样式与项目整体风格统一：参照抽屉内现有表单/列表的间距、圆角、边框 token（border-border、text-muted-foreground 等），**不引入表格控件**，用轻量列表实现
4. **底部两按钮**：
   - 【清除筛选】（左）：清空勾选 + 清除已应用的 tag 过滤 → 主窗口显示全部书籍，抽屉收回
   - 【应用筛选】（右）：按勾选的 tags 过滤（任一匹配）→ 主窗口只显示带这些标签的书，抽屉收回

## 1. 现状与可复用

| 能力 | 现状 | 复用方式 |
|---|---|---|
| 右侧弹出抽屉 | `components/filters/URLFilterDrawer.tsx`（title/description + 内容 + onOpenChange）| **整体照抄结构**，新建 `TagFilterDrawer.tsx` |
| 顶栏 icon button 行 | `URLFilterContainer`/`FilterHeader` 中 sort、filter 按钮已存在（用户提供的 HTML 即此处）| 在 filter 按钮旁并列新增 tag 筛选按钮 |
| 多选勾选列表 | 项目内 checkbox 组件（`@stump/components` CheckBox，MediaFilterForm 已用）| 直接用 |
| 按标签过滤书籍 | `MediaFilterInput.tags.anyOf` + `useFilterScene`/`setFilters` + URL `?filters=` 同步 | 现成，零改动 |
| tags 列表查询 | `tags(libraryId)` **尚不支持按库过滤**（v2 设计的参数）| 需后端新增（§2）|
| **每 tag 书籍数量** | **无现成查询** | 需后端新增 count（§2，v3 新增需求）|

## 2. 后端改造（crates/）

### 2.1 新查询：按库取标签 + 数量
推荐新增专用 query（比扩展 `tags` 更干净，避免影响设置页 TagTable）：

```graphql
libraryTags(libraryId: ID!): [LibraryTag!]!

type LibraryTag {
    id: Int!
    name: String!
    count: Int!   # 该库下带此 tag 的书籍数量
}
```

实现（`crates/graphql/src/query/tag.rs` + `crates/graphql/src/object/`）：
- sea-orm：`tags JOIN library_tags（过滤 library_id）LEFT JOIN media_tags JOIN media（过滤 media.library_id）GROUP BY tag.id`，count 用 `COUNT(media_tags.media_id)`
- 简化实现：两步查询（库的 tags 全量 + 分组 count）后内存组装亦可，量级无压力
- 无需 guard（与 tags 一致）

### 2.2 schema 重生成
```powershell
cargo dump-schema
corepack yarn workspace @stump/graphql codegen
```

## 3. 前端改造（packages/browser）

### 3.1 触发按钮
- 位置：`URLFilterContainer`/`FilterHeader` 中【配置URL筛选器】按钮（lucide `ListFilter`，用户 HTML 中 `lucide-list-filter`）旁并列
- 样式：同款 icon button（`size-8` icon 按钮，hover/expanded 态一致），图标用 lucide `Tags`
- 点击 → `setTagDrawerOpen(true)`（本地 state，或并入现有 drawer 管理状态）

### 3.2 抽屉：`TagFilterDrawer.tsx`（新建，放 `components/filters/`）
- 骨架照抄 `URLFilterDrawer.tsx`（title "按标签筛选" + SlideOver/Drawer 从右弹出 + onOpenChange）
- 数据：`useSuspenseGraphQL(query LibraryTags($libraryId: ID!), ['libraryTags', libraryId])`
- **搜索框**：抽屉顶部 `Input`（带放大镜图标 placeholder "搜索标签"），纯前端 `useMemo` 按名称包含匹配过滤（大小写不敏感），不另发请求；每次打开抽屉时清空搜索词
- 列表渲染（轻量列表，非表格控件，风格与抽屉内现有表单元素统一）：
  ```tsx
  <ul className="divide-y">
      {filteredTags.map(tag => (
          <li className="flex items-center gap-2 py-2 px-1">
              <CheckBox checked={selected.has(tag.name)} onClick={toggle(tag.name)} />
              <span className="flex-1 truncate">{highlight(tag.name)}</span>
              <span className="text-xs text-muted-foreground">{tag.count}</span>
          </li>
      ))}
  </ul>
  ```
- 搜索无结果 → 空态提示（"没有匹配的标签"）
- 选中状态：本地 `useState<Set<string>>`，初始值 = 当前已应用的 `filters.tags.anyOf`（回显）
- 底部固定操作条：
  - 【清除筛选】：`setSelected(空)` + `setFilters({...filters, tags: undefined})` + `onClose()`
  - 【应用筛选】：勾选非空 → `setFilters({...filters, tags: { anyOf: [...selected] }})`；勾选为空 ≡ 清除 → `onClose()`
- 两个按钮点击后均 `onClose()` 收回抽屉
- 已应用过滤的回显：抽屉打开时若有 `filters.tags.anyOf`，对应 checkbox 自动勾选（用户能看到当前生效的筛选）

### 3.3 顶栏过滤态提示（小细节，建议）
- 有生效 tag 过滤时，触发按钮高亮（如 `text-brand`/dot 徽标），提示当前列表被 tag 过滤中——与 URLFilterDrawer 按钮行为对齐即可，实现从简

### 3.4 i18n
- `按tag标签筛选 / 按tag標籤篩選`、`清除筛选 / 清除篩選`（或复用 shared.common.clear）、`应用筛选 / 套用篩選`、`该书库暂无标签`、按钮 aria-label/title
- 挂在 `webApp.mediaFilterForm`（或新建 `webApp.tagFilter`）下，三语同步

## 4. 实施顺序

| 步骤 | 内容 | 规模 |
|---|---|---|
| 1 | `libraryTags` query + `LibraryTag` object（Rust，含 count）| ~60 行 |
| 2 | cargo dump-schema + codegen | 命令 |
| 3 | `TagFilterDrawer.tsx`（搜索框 + 列表 + 勾选 + 底部按钮 + 回显 + 空态） | ~140 行 |
| 4 | 顶栏按钮集成（URLFilterContainer 旁）+ 过滤联动 + 生效高亮 | ~40 行 |
| 5 | i18n 三语 | ~15 行 |
| 6 | 验证：cargo check / dump-schema --check / codegen / tsc / browser test / 手动走查 | — |

## 5. 风险与注意

- **count 语义**：统计的是"当前库内带此 tag 的书籍数"（media JOIN library 过滤），不是系列数；如与用户预期不符再调整
- **anyOf = OR 语义**：勾选多个标签时显示"带任一所选标签"的书；不支持 AND，文档/UI 文案不必特别说明（符合直觉）
- **与其他筛选叠加**：tags 过滤写入同一 `filters` 状态，与搜索/排序/其他 URL filter 天然叠加（AND 组合），抽屉只管 tags 字段，不清除其他筛选
- **未进入具体书库时**（Explore 全库视图）：无 libraryId，按钮隐藏（推荐）
- **过滤键是 tag name**：重命名标签后已应用的 URL 过滤失效——与现有行为一致
- **v1 侧边栏方案 / v2 下拉框**：均弃用，留档备查；若日后需要侧边栏 Tags 栏目，v1 §1-2 依然可执行（后端 `libraryTags` 查询可复用）
