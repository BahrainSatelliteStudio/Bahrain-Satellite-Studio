# EPG 集成 — 设计

日期: 2026-07-31
状态: 已确认

## 目标

完整集成 EPG 功能。用 `get_simple_data_table` 批量拉全频道 EPG 缓存到 Room，`get_short_epg` 做单频道增量更新。EPG 时间轴显示所有频道节目。入口在频道列表行和播放页。

## 架构

```
LiveScreen(频道行/播放页 EPG 按钮)
  └─ onOpenEpg(streamId) → MainScreen → Routes.epgRoute(streamId)
EpgTimelineScreen → EpgViewModel
  ├─ channels: 所有频道
  └─ epgData: Map<Int, List<EpgEntry>> 全量缓存（按频道分组）
     ├─ 缓存空 → RefreshAllEpgUseCase 全量拉取
     └─ selectChannel → refreshEpg(streamId) 单频道增量
```

## 数据层

| 文件 | 改动 |
|---|---|
| `XtreamApi.kt` | 加 `getSimpleDataTable`（action=get_simple_data_table，返回 `Map<String, List<EpgEntryDto>>`） |
| `EpgDao.kt` | 加 `getBySource(sourceId): Flow<List<EpgEntity>>` |
| `LiveTvRepository` | 加 `refreshAllEpg()`、`refreshEpg(streamId)`、`getAllEpg(): Flow<Map<Int, List<EpgEntry>>>` |
| `LiveTvRepositoryImpl` | 实现三者；`refreshAllEpg` = `getSimpleDataTable` → `deleteBySource` + `insertAll`；`getAllEpg` = `epgDao.getBySource` 分组 |

## UseCase

`RefreshAllEpgUseCase`（新）— `suspend operator fun invoke()` 包装 `refreshAllEpg()`。

## EpgViewModel 重构

- `epgData: StateFlow<UiState<Map<Int, List<EpgEntry>>>>`
- init：`getAllEpg()` 读缓存 → 空则 `RefreshAllEpgUseCase()` 全量拉取后重读
- `selectChannel(id)`：设选中 + `refreshEpg(id)` 增量更新
- 保留 `channels`、`selectedChannelId` 逻辑

## UI

| 文件 | 改动 |
|---|---|
| `EpgTimelineScreen.kt` | 所有频道渲染 EPG 块（不再只有选中频道）；`epgEntriesState` 类型改 `Map`；每频道用 `epgData[channel.id]` |
| `LiveScreen.kt` | `ChannelItem` 加 EPG 日历按钮（`onOpenEpg`）；`FullscreenPlayerView` 控件加 EPG 入口 |
| `MainScreen.kt` | `LiveScreen` 调用处传 `onOpenEpg` → `outerNavController.navigate(Routes.epgRoute(id))` |

## 错误处理

- 全量拉取失败 → `UiState.Error` + ErrorView 重试
- 单频道增量失败 → 忽略（缓存兜底）
- 频道无 EPG 数据 → 空行

## 明确不做

- Splash 不预拉 EPG（数据量大）
- 不改 6 小时时间轴窗口
- 不改 EPG 缓存过期/清理策略（切换源时 `deleteBySource` 已覆盖）
