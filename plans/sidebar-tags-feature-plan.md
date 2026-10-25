# 改造计划：侧边栏新增【标签 Tags】列表项

> 日期：2026-10-25
> 目标：在 Web 左侧边栏新增【Tags】列表项，行为对齐现有【智能列表】和【读书俱乐部】——展示标签列表，点击某标签跳转到带该标签过滤的书籍列表页。

## 0. 调研结论（可行性）

**改造成本低，后端几乎不用动**：

- Tag 已是一等实体（`tags` 表 + `media_tags/series_tags/library_tags` 关联表，`crates/models/src/entity/tag.rs`）
- 列出所有标签的 GraphQL 查询**已存在**：`crates/graphql/src/query/tag.rs:21` `tags() -> Vec<Tag>`（`Tag { id, name }`，无 guard，任何已认证用户可查）
- 按标签过滤书籍**已存在**：`MediaFilterInput.tags: FieldFilterString`，后端 `crates/graphql/src/filter/media.rs:192-195` 经 `media_tag_name_subquery` 实现；前端现成入口 `paths.bookSearchWithFilter({ tags: { anyOf: [name] } })`（`packages/browser/src/paths.ts:83-86`），书籍搜索页 `BookSearchScene` 已能解析 `?filters=` URL 参数并渲染结果 —— **点击标签跳转后"看该标签书籍列表"零新代码**
- 权限：无 tag 相关权限项，也不需要新增（侧边栏对未知 variant 默认放行，`SideBar.tsx:83-84`）

**唯一的后端必改点**：侧边栏条目由服务端下发的 `me.preferences.navigationArrangement` 驱动，每个条目必须对应 `SystemArrangement` 枚举的一个 variant，因此要在 core 注册 `Tags` variant。

## 1. 后端改造（crates/）

### 1.1 注册导航 variant
文件：`crates/models/src/shared/arrangement.rs`
- L37-43：`SystemArrangement` 枚举新增 `Tags` variant（DB 中以 SCREAMING_SNAKE_CASE 字符串存储，serde/sea-orm 派生自动支持）
- L341-382：`Arrangement::default_navigation()` 在 SmartLists/BookClubs 旁追加 `SystemArrangement::Tags` section

### 1.2 存量用户兼容（重要）
⚠️ navigation arrangement **没有**类似 `HomeArrangement::new`（L231-247）的"缺失 section 用默认值补齐"逻辑。已自定义过侧边栏的存量用户，其已存 arrangement 不会自动出现 Tags section。两种策略二选一：
- **方案 A（推荐，最小改动）**：不做数据迁移；未显示 Tags 的用户可在 设置 → 侧边栏自定义（NavigationArrangement）中手动添加。前端设置页需同步加入 Tags 选项（见 2.6）。
- **方案 B**：仿照 `HomeArrangement::new` 增加"补齐缺失 section"的合并逻辑，或在下一版本迁移中重置 navigation arrangement。

### 1.3 schema 重新生成
```powershell
cargo run -p stump-graphql --bin dump-schema   # 更新 crates/graphql/schema.graphql（bin 入口 crates/graphql/bin/main.rs）
# 前端类型：
pnpm --filter @stump/graphql codegen           # packages/graphql/codegen.ts，扫描 ../browser/src/** 中的 documents
```
（本次后端不改 resolver，schema.graphql 中 `SystemArrangement` 枚举会因新增 variant 变化，仍需重新导出 + codegen。）

## 2. 前端改造（packages/browser）

### 2.1 路径
`packages/browser/src/paths.ts`：L31-129 与 L135-188 两处对象各加 `tags: () => '/tags'`。

### 2.2 标签场景页（新建 `scenes/tags/`）
- `TagRouter.tsx`：仿 `scenes/smartList/SmartListRouter.tsx`，**无权限守卫**（tags 无权限模型）；`path=""` → lazy `UserTagsScene`
- `UserTagsScene.tsx`：仿 `UserBookClubsScene.tsx` 骨架（`SceneContainer` + `Helmet` + `useSuspenseGraphQL(query, sdk.cacheKey('tags'))`）
  - 查询：`query TagsScene { tags { id name } }`（与 `TagTable.tsx:19-33` 同款）
  - 渲染：卡片网格（`DynamicCardGrid`）或 `divide-y` 行式列表；每项显示标签名 + 可选书籍计数（如需计数需后端补 query，列为可选项）
  - 点击项 → `navigate(paths.bookSearchWithFilter({ tags: { anyOf: [tag.name] } }))`，直接复用现有书籍搜索页呈现结果
  - 空态：复用 `GenericEmptyState`

### 2.3 路由注册
`packages/browser/src/AppRouter.tsx`（L40-41 旁）：
```tsx
<Route path="tags/*" element={<TagRouter />} />
```

### 2.4 侧边栏 section（新建 `components/navigation/sidebar/sections/tag/TagSideBarSection.tsx`）
仿 `sections/smartList/SmartListSideBarSection.tsx`（L14-21 的内嵌查询 + Accordion 结构）：
- 内嵌 `query TagSideBarSection { tags { id name } }`
- 列表项点击 → `bookSearchWithFilter({ tags: { anyOf: [name] } })`（或进入 `/tags` 详情页）
- `links` prop 支持 `ShowAll` → `paths.tags()`；空态 `SectionEmptyMessage`
- 注册到 `sections/index.ts`
- **两处 match 都要加**：
  - `SideBar.tsx` L92-133 `renderSystemSection` 加 `SystemArrangement.Tags` 分支（`checkSectionPermission` 默认 true，无需改）
  - `TopBar.tsx` L91-134（移动端顶栏）同款分支

### 2.5 i18n
`packages/i18n/src/locales/en-US.json` `webApp.sidebar.buttons` 增加：
```json
"tags": "Tags",
"noTags": "No Tags"
```
标题复用已有 `shared.common.tags`（"Tags"，zh-CN 已有"标签"）。同步 zh-CN/zh-TW（"标签"/"標籤"），其余语言由 Weblate 跟进。

### 2.6 侧边栏自定义设置页（可选但建议）
`scenes/settings/app/preferences/NavigationArrangement.tsx`（L319-335 权限守卫、L325-329 默认列表）加入 Tags 项（无权限守卫），保证设置页与实际渲染一致，同时为存量用户提供手动添加入口（对应 1.2 方案 A）。

## 3. 实施顺序与工作量估算

| 步骤 | 内容 | 规模 |
|---|---|---|
| 1 | arrangement.rs 加 variant + default_navigation + 兼容决策 | 后端 ~20 行 |
| 2 | dump-schema + codegen | 命令执行 |
| 3 | paths.ts + TagRouter + UserTagsScene + AppRouter | 新文件 3 个，~150 行 |
| 4 | TagSideBarSection + SideBar/TopBar match + sections/index | ~80 行 |
| 5 | i18n key + NavigationArrangement 可选项 | ~20 行 |
| 6 | 验证：`yarn check-types`、`yarn browser test`、手动走查 | — |

## 4. 风险与注意

- **存量 arrangement 兼容**是唯一需要产品决策的点（1.2 方案 A/B）
- 标签过滤键是 **name 而非 id**（`anyOf: [tag.name]`），标签重命名后旧 URL 过滤条件会失效——与现有书籍详情页标签链接行为一致，可接受
- `Tag` 类型目前只有 `{ id, name }`，若标签页想显示每标签书籍数/封面，需要后端新增 query（列入后续迭代，不在本计划最小范围）
