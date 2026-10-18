# M3U 源集成 — 设计

日期: 2026-07-31
状态: 已确认

## 目标

支持 m3u 源导入（链接导入 + 文件导入）。m3u 源仅直播 + 分类，无点播/剧集/EPG。源模型扩展为多类型，UI 按源类型显隐。

## 数据层

### SourceEntity / XtreamSource 扩展

```kotlin
data class SourceEntity(
    val id: Long = 0,
    val name: String,
    val serverUrl: String,      // m3u 源复用：存 m3u 链接；文件导入存 "file://" 标记
    val port: Int = 25461,
    val username: String,       // m3u 默认空
    val password: String,       // m3u 默认空
    val type: String = "xtream", // "xtream" | "m3u"
    val isActive: Boolean = false
)
```

`XtreamSource` 同步加 `type` 字段。m3u 源 `port/username/password` 默认值。

### LiveStreamEntity / LiveStream 扩展

```kotlin
// LiveStreamEntity 加字段
val m3uUrl: String? = null    // m3u 频道的直接播放地址

// LiveStream domain 同步
val m3uUrl: String? = null
```

m3u 频道 `streamId` 用解析序号（1..N），`categoryId` 由 group-title 映射。复用 `live_streams` + `live_categories` 表。

## M3U 解析器（新文件）

`data/parser/M3uPlaylistParser.kt`

```kotlin
data class M3uChannel(
    val name: String,
    val logo: String?,
    val groupTitle: String?,
    val url: String
)

object M3uPlaylistParser {
    fun parse(content: String, baseUrl: String): List<M3uChannel>
}
```

- 解析 `#EXTM3U` / `#EXTINF` 行（`tvg-logo`、`group-title` 属性）+ 后续 URL 行
- 相对 URL 基于 `baseUrl`（m3u 所在地址）解析为绝对 URL
- 跳过空行/注释

## 同步流程

### SwitchSourceUseCase / 设置页同步按钮分支

- `type == "xtream"` → 现有 `refreshAll()`（live/vod/series 全量）
- `type == "m3u"` → `m3uRefreshAll()`：
  1. `serverUrl` 为 http(s) 链接 → 下载 m3u 文本
  2. `serverUrl` 为 `file://` → 从 app 内部存储读本地 m3u 文件
  3. 解析 → 构建 group-title → categoryId 映射 → `deleteBySource` + `insertAll` 覆盖 `live_categories` + `live_streams`
  4. 点播/剧集表不写入（m3u 无点播/剧集）

### 文件导入流程

1. 用户选本地文件（`OpenDocument`）→ 读取内容
2. 解析频道 → 存 DB
3. 复制 m3u 内容到 `filesDir/m3u/<sourceId>.m3u`，`serverUrl` 存 `file://m3u/<sourceId>.m3u` → 后续同步从本地文件重新解析

## 播放

`PlayStreamUseCase` 加 m3u 分支：源 type 为 m3u 时，返回频道存的 `m3uUrl`（不拼接 xtream URL）。VOD/Series 对 m3u 源不可用。

## 源类型状态（新文件）

`presentation/common/ActiveSourceState.kt`

```kotlin
@Singleton
class ActiveSourceState @Inject constructor(sourceRepository: SourceRepository) {
    val sourceType: StateFlow<String?>   // 监听 getActiveSource()，暴露 "xtream"/"m3u"/null
}
```

MainScreen / HomeScreen / AllItemsScreen 注入读取。

## UI 显隐

| 位置 | xtream | m3u |
|---|---|---|
| 底部导航 | 主页/直播/电影/剧集/设置 | 主页/直播/设置 |
| 主页统计卡 | 频道/电影/剧集 三卡 | 仅频道卡占满整行 |
| 最近添加查看全部 | tab 行：全部/直播/电影/剧集 | 隐藏 tab 行，仅显示直播 |

- 切到 m3u 时若当前停在电影/剧集 tab → 导航自动回主页
- 切回 xtream 恢复

## 添加源 UI

`SourceFormScreen` 重构：
- 顶部类型选择（Xtream / M3U segmented 切换）
- xtream 类型：现有表单
- m3u 类型：名称 + 链接输入框 + 「选择文件」按钮（`rememberLauncherForActivityResult(OpenDocument)`）
- 保存 m3u 链接源 → `addSource(type="m3u", serverUrl=链接)` → 触发同步解析
- 保存 m3u 文件源 → 读取文件 → 解析 → 复制本地 → 存源

## 错误处理

- m3u 下载失败 / 解析无频道 → 抛异常，同步显示错误（ErrorView 重试）
- 文件选择取消 → 不保存
- 无效 m3u 内容 → 报错不写 DB

## 明确不做

- m3u EPG（tvg-id 仅存字段不拉取）
- m3u 点播/剧集
- 定时自动刷新
