# PAD UI 响应式适配设计

日期：2026-08-05
范围：横屏平板（expanded 窗口尺寸）为主，手机（compact）布局保持现状不动

## 目标

在现有单模块项目中，为横屏平板（≥840dp）提供自适应 UI，不新建项目、不动数据层。手机布局完全保留。

## 断点策略

- 零新依赖：`LocalConfiguration.smallestScreenWidthDp >= 600` 判定 tablet（`rememberIsTablet()`，`common/AppLayout.kt`；smallestScreenWidthDp 不随横竖屏变化，手机横屏不会误判为 PAD）
- 两档处理：
  - `<600dp`（手机、含横屏手机）：沿用手机布局，不做双栏
  - `≥600dp`（平板、折叠屏展开）：启用 PAD 布局
- `LocalConfiguration` 是 CompositionLocal，屏幕方向/宽度变化自动触发重组，布局即时切换

## 全局布局（MainScreen）

### 导航

- tablet：左侧 `NavigationRail`，5 个图标垂直排列，**设置图标固定在最底部**（其余 4 个在上方）
- 手机：现状底部 `NavigationBar` 不动
- 导航逻辑（route 切换、`hideBottomBar` 全屏隐藏）不变；tablet 时全屏逻辑隐藏 NavigationRail

### 顶部行（tablet 专用 TopAppBar）

- 最左侧：App logo
- 中间：全局搜索框（点击进入现有 `GLOBAL_SEARCH` 路由）
- 手机不显示此顶栏

## 各页面适配

设计基准：参考桌面端 `D:\study\WowIPTVDesktop\frontend\src\views\`（LiveView / MoviesView / SeriesView / MovieDetailView / SeriesDetailView），平板对齐桌面布局结构。

### 直播页（LiveScreen）

tablet：桌面式两栏 `左侧边栏 | 右侧播放区`

- **左侧边栏**（约 360dp 固定宽）：
  - 顶行工具栏：分类 Select（单选，含"全部"）+ 排序 Select（4 档：A-Z / Z-A / 最近 / 最早）并排
  - 下一行：搜索框
  - 下方：频道列表（复用 `ChannelList`，应用排序后数据）
- **右侧播放区**：
  - 上：播放器（16:9 比例，高度约 62%），复用现有内嵌 `PlayerView`（同一 `viewModel.player` 实例）
  - 下：EPG 条（当前频道今日节目横向滚动，当前节目高亮；toggle 显示/隐藏）
- 保留：播放控制条、`onFullscreenChanged`（隐藏导航）、频道点击播放、收藏、EPG 跳转
- 手机布局现状不动

### 电影 / 剧集页（MoviesScreen / SeriesScreen）

tablet 布局改为 `标题行 + 工具栏 + 网格`（对齐桌面）：

- **标题行**：页面标题（如"电影"/"剧集"）
- **工具栏**（一行）：
  1. 分类 Select：单选（含"全部"）
  2. 排序 Select：4 档（A-Z / Z-A / 最近 / 最早）——桌面 `nameAsc/nameDesc/newest/oldest`
  3. 密度单选 3 档（小 / 中 / 大），映射网格列数：小=8、中=6、大=4（写回现有 `contentGridColumns` 偏好）
  4. 搜索框
- **网格**：`LazyVerticalGrid`，列数按密度档位
- `SortMode` 扩展为 4 档枚举（AZ / ZA / NEWEST / OLDEST），`applySort` 扩展对应排序；排序仅 tablet 生效
- 手机布局现状不动

### 详情页（MovieDetailScreen / SeriesDetailScreen）

tablet：桌面式 `hero 背景 + 下窗左右布局`

- **上部 hero**（55% 高度）：
  - 背景：海报图模糊放大（`Modifier.blur` + Crop + 暗化 50%）铺满
  - 顶部覆盖条：返回钮 + 标题 + 收藏钮（居中标题）
  - 中央：大播放按钮（点击播放/继续观看）
- **下窗**（45% 高度）：
  - 左：竖版海报（约 240dp 宽，2:3）
  - 右：滚动内容：
    - 电影：简介 + 导演/演员头像圈（TMDB 头像复用）+ 播放 / 再看一次按钮 + 同类影片横向滚动（桌面 `related`）
    - 剧集：简介 + 演员/导演 + 季数 chips + 集数列表行（E# 图标 + 标题 + 进度条 + 继续/播放钮，复用 `SeriesEpisodesBlock`）+ 同类横向滚动
- 手机现状（纵向滚动）不动
- 不含桌面端"复制链接"按钮（移动端不适用）

### 设置页（SettingsScreen）

tablet：**两列布局**

- 第一列：分组导航列表（对应现有 SectionCard 分组）：
  - 常规、播放、首页、启动、数据、锁定、源管理、关于
- 第二列：当前选中分组的设置项，复用现有行组件（`LanguageRow`、`ThemeColorRow`、`PlaybackSpeedRow` 等）与 `SectionCard` 内容块
- 第一列点击切换第二列内容；"常规"为默认选中
- 手机现状（单列滚动）不动

### EPG 页（EpgTimelineScreen）

- tablet：时间轴全宽展开
- 手机现状不动

### 首页（HomeScreen）

- tablet：内容区 `maxWidth` 限宽居中，网格列数随宽度增多（`GridCells.Adaptive` 已具备）
- 手机现状不动

## 组件拆分

- 每个屏的 tablet 分支抽独立私有 composable，与手机分支互不干扰：
  - `TabletScaffold`（NavigationRail + 顶部 logo/搜索行）
  - `LiveTabletPane`（侧边栏 + 播放区，含 EPG 条 toggle）
  - `ContentToolbar`（分类 Select + 排序 Select + 密度单选 + 搜索，电影/剧集共用）
  - `SettingsTwoPane`（分组导航 + 设置项）
  - 详情页 `DetailHero` + 下窗布局（电影/剧集各一个私有 composable）
- `SortMode` 4 档枚举（AZ/ZA/NEWEST/OLDEST）与 `applySort` 扩展（UI 层排序，不进数据层）；排序仅 tablet 生效

## 不动部分

- 数据层（repository / DAO / parser）、domain 层、ViewModel 状态逻辑（除排序外）
- PlayerScreen 全屏播放器、PiP、分类锁定、i18n、更新检查
- 导航路由定义（`Routes.kt`）
- 手机端全部布局

## 错误处理与边界

- 折叠屏展开/折叠、横竖屏旋转时 `LocalConfiguration` 自动重组，布局即时切换
- m3u 源模式隐藏电影/剧集 tab 的逻辑对 NavigationRail 同样生效（复用 `visibleItems` 过滤）
- 排序对锁定分类隐藏规则无影响（排序在 UI 层过滤之后应用）

## 验证

1. `./gradlew :app:assembleDebug` 构建通过
2. 回归清单（手机模拟器 390x844）：5 个 tab、直播播放/切换、PiP、分类锁定、语言切换、设置页全部功能
3. PAD 验证（平板模拟器 1280x800 横屏，对照桌面端布局）：
   - NavigationRail 5 图标且设置在底部、顶部 logo+搜索
   - 直播：左侧边栏（分类+排序+搜索+频道）\| 右侧播放器+EPG 条；4 档排序生效
   - 电影/剧集：标题行+工具栏（分类/4档排序/密度/搜索）+ 网格，密度列数 8/6/4
   - 详情页：上部 hero 模糊背景+标题+大播放钮；下部海报左+内容右；剧集集数列表正常
   - 设置页两列、首页限宽、EPG 全宽
