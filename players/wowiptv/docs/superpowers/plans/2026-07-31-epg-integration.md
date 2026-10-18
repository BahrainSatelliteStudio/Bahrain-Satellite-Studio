# EPG 集成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 集成完整 EPG 功能：`get_simple_data_table` 批量拉全频道 EPG 缓存到 Room，`get_short_epg` 单频道增量更新，时间轴显示全部频道节目，Live 频道行/播放页加入口。

**Architecture:** 数据层加批量 EPG 接口与缓存查询；EpgViewModel 全量加载（缓存空触发全量拉取，选中频道增量刷新）；EpgTimelineScreen 全频道渲染；LiveScreen 两处入口 → 导航到 EPG 页。

**Tech Stack:** Kotlin, Jetpack Compose, Retrofit, Room, Hilt

**验证方式:** 无单元测试基础设施，每任务以 `./gradlew compileDebugKotlin` 编译通过验证。

---

### Task 1: 数据层 — API/DAO/模型/mapper 扩展

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/data/remote/xtream/XtreamApi.kt`
- Modify: `app/src/main/java/com/dream/wowiptv/data/local/dao/EpgDao.kt`
- Modify: `app/src/main/java/com/dream/wowiptv/domain/model/EpgEntry.kt`
- Modify: `app/src/main/java/com/dream/wowiptv/data/mapper/DtoMappers.kt`

- [ ] **Step 1: XtreamApi 加 getSimpleDataTable**

在 `XtreamApi.kt` 的 `getShortEpg` 方法后加：

```kotlin
    @GET("player_api.php")
    suspend fun getSimpleDataTable(
        @Query("username") username: String,
        @Query("password") password: String,
        @Query("action") action: String = "get_simple_data_table"
    ): Map<String, List<EpgEntryDto>>
```

`EpgEntryDto` 已 import（ShortEpgResponseDto.kt 同包，无需新增 import）。

- [ ] **Step 2: EpgDao 加 getBySource**

在 `EpgDao.kt` 的 `getByStream` 前加：

```kotlin
    @Query("SELECT * FROM epg_entries WHERE sourceId = :sourceId")
    fun getBySource(sourceId: Long): Flow<List<EpgEntity>>
```

- [ ] **Step 3: EpgEntry 加 streamId 字段**

`EpgEntry.kt` 数据类改为：

```kotlin
data class EpgEntry(
    val streamId: Int,
    val title: String,
    val description: String?,
    val startTime: Long,
    val endTime: Long,
    val isNowPlaying: Boolean
)
```

- [ ] **Step 4: mapper 同步 streamId**

`DtoMappers.kt` 三处修改：

`ShortEpgResponseDto.toDomain(streamId)` 内 `it.toDomain()` 改为 `it.toDomain(streamId)`：

```kotlin
fun ShortEpgResponseDto.toDomain(streamId: Int): List<EpgEntry> {
    return epgListings?.map { it.toDomain(streamId) } ?: emptyList()
}
```

`EpgEntryDto.toDomain()` 改为：

```kotlin
fun EpgEntryDto.toDomain(streamId: Int): EpgEntry {
    return EpgEntry(
        streamId = streamId,
        title = title.orEmpty(),
        description = description,
        startTime = startTimestamp ?: 0L,
        endTime = stopTimestamp ?: 0L,
        isNowPlaying = nowPlaying == 1
    )
}
```

`EpgEntity.toDomain()` 加 streamId：

```kotlin
fun EpgEntity.toDomain(): EpgEntry {
    return EpgEntry(
        streamId = streamId,
        title = title.orEmpty(),
        description = description,
        startTime = startTimestamp ?: 0L,
        endTime = stopTimestamp ?: 0L,
        isNowPlaying = nowPlaying
    )
}
```

`EpgEntry.toEntity(streamId, sourceId)` 不变（外部传 streamId）。

- [ ] **Step 5: 编译验证**

Run: `./gradlew compileDebugKotlin -q`
Expected: 无输出（成功）

- [ ] **Step 6: 提交**

```bash
git add app/src/main/java/com/dream/wowiptv/data/remote/xtream/XtreamApi.kt app/src/main/java/com/dream/wowiptv/data/local/dao/EpgDao.kt app/src/main/java/com/dream/wowiptv/domain/model/EpgEntry.kt app/src/main/java/com/dream/wowiptv/data/mapper/DtoMappers.kt
git commit -m "feat: EPG 数据层扩展 get_simple_data_table 与全量查询"
```

---

### Task 2: LiveTvRepository 接口 + 实现

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/domain/repository/LiveTvRepository.kt`
- Modify: `app/src/main/java/com/dream/wowiptv/data/repository/LiveTvRepositoryImpl.kt`

- [ ] **Step 1: 接口加三个方法**

`LiveTvRepository.kt` 加：

```kotlin
    suspend fun refreshAllEpg()
    suspend fun refreshEpg(streamId: Int)
    fun getAllEpg(): Flow<Map<Int, List<EpgEntry>>>
```

- [ ] **Step 2: Impl 实现**

`LiveTvRepositoryImpl.kt` 现有 `refreshEpg` 前面加 `override` 关键字（它当前是普通 `suspend fun refreshEpg(streamId: Int)`，line 86）。在 `refreshEpg` 后加两个方法：

```kotlin
    override suspend fun refreshAllEpg() {
        val source = sourceRepository.getActiveSource().first() ?: return
        configureBaseUrl(source.serverUrl, source.port)

        val table = api.getSimpleDataTable(source.username, source.password)
        val all = table.entries.flatMap { (streamIdStr, entries) ->
            val sid = streamIdStr.toIntOrNull()
            if (sid != null) entries.map { it.toDomain(sid).toEntity(sid, source.id) } else emptyList()
        }
        epgDao.deleteBySource(source.id)
        epgDao.insertAll(all)
    }

    override fun getAllEpg(): Flow<Map<Int, List<EpgEntry>>> = flow {
        val source = sourceRepository.getActiveSource().first()
        if (source == null) {
            emit(emptyMap())
            return@flow
        }
        emitAll(
            epgDao.getBySource(source.id).map { entities ->
                entities.map { it.toDomain() }.groupBy { it.streamId }
            }
        )
    }
```

确认 imports 已有：`epgDao` 注入存在（构造函数有），`toDomain`/`toEntity` 已 import（line 6-7）。`flow`、`emitAll`、`map`、`first` 已有。

- [ ] **Step 3: 编译验证**

Run: `./gradlew compileDebugKotlin -q`
Expected: 无输出（成功）

- [ ] **Step 4: 提交**

```bash
git add app/src/main/java/com/dream/wowiptv/domain/repository/LiveTvRepository.kt app/src/main/java/com/dream/wowiptv/data/repository/LiveTvRepositoryImpl.kt
git commit -m "feat: LiveTvRepository 全量/增量 EPG 刷新与分组查询"
```

---

### Task 3: RefreshAllEpgUseCase

**Files:**
- Create: `app/src/main/java/com/dream/wowiptv/domain/usecase/RefreshAllEpgUseCase.kt`

- [ ] **Step 1: 创建 use case**

```kotlin
package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.domain.repository.LiveTvRepository
import javax.inject.Inject

class RefreshAllEpgUseCase @Inject constructor(
    private val repository: LiveTvRepository
) {
    suspend operator fun invoke() = repository.refreshAllEpg()
}
```

- [ ] **Step 2: 编译验证**

Run: `./gradlew compileDebugKotlin -q`
Expected: 无输出（成功）

- [ ] **Step 3: 提交**

```bash
git add app/src/main/java/com/dream/wowiptv/domain/usecase/RefreshAllEpgUseCase.kt
git commit -m "feat: RefreshAllEpgUseCase"
```

---

### Task 4: EpgViewModel 重构为全量加载

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/epg/EpgViewModel.kt`

- [ ] **Step 1: 重写 ViewModel**

整个文件替换为：

```kotlin
package com.dream.wowiptv.presentation.epg

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dream.wowiptv.domain.model.EpgEntry
import com.dream.wowiptv.domain.model.LiveStream
import com.dream.wowiptv.domain.repository.LiveTvRepository
import com.dream.wowiptv.domain.usecase.GetLiveStreamsUseCase
import com.dream.wowiptv.domain.usecase.RefreshAllEpgUseCase
import com.dream.wowiptv.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class EpgViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val liveTvRepository: LiveTvRepository,
    private val refreshAllEpgUseCase: RefreshAllEpgUseCase,
    private val getLiveStreamsUseCase: GetLiveStreamsUseCase
) : ViewModel() {

    private val streamId: Int? = savedStateHandle.get<Int>("streamId")?.takeIf { it > 0 }

    private val _selectedChannelId = MutableStateFlow(streamId)
    val selectedChannelId: StateFlow<Int?> = _selectedChannelId.asStateFlow()

    private val _epgData = MutableStateFlow<UiState<Map<Int, List<EpgEntry>>>>(UiState.Loading)
    val epgData: StateFlow<UiState<Map<Int, List<EpgEntry>>>> = _epgData.asStateFlow()

    val channels: StateFlow<UiState<List<LiveStream>>>

    init {
        val channelsFlow = getLiveStreamsUseCase(null)

        channels = if (streamId != null) {
            channelsFlow
                .map { list -> UiState.Success(list.filter { it.id == streamId }) as UiState<List<LiveStream>> }
                .catch { emit(UiState.Error(it.message ?: "Failed to load channels")) }
                .onStart { emit(UiState.Loading) }
                .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), UiState.Loading)
        } else {
            channelsFlow
                .map { UiState.Success(it) as UiState<List<LiveStream>> }
                .catch { emit(UiState.Error(it.message ?: "Failed to load channels")) }
                .onStart { emit(UiState.Loading) }
                .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), UiState.Loading)
        }

        loadEpg()

        if (streamId == null) {
            viewModelScope.launch {
                val state = channels.first { it is UiState.Success<*> }
                if (state is UiState.Success && state.data.isNotEmpty()) {
                    _selectedChannelId.value = state.data.first().id
                }
            }
        }
    }

    private fun loadEpg() {
        viewModelScope.launch {
            val cached = runCatching { liveTvRepository.getAllEpg().first() }.getOrNull()
            if (cached != null && cached.isNotEmpty()) {
                _epgData.value = UiState.Success(cached)
                return@launch
            }
            _epgData.value = UiState.Loading
            runCatching { refreshAllEpgUseCase() }
                .onSuccess {
                    val refreshed = liveTvRepository.getAllEpg().first()
                    _epgData.value = UiState.Success(refreshed)
                }
                .onFailure { e ->
                    _epgData.value = UiState.Error(e.message ?: "EPG 加载失败")
                }
        }
    }

    fun selectChannel(id: Int) {
        if (_selectedChannelId.value != id) {
            _selectedChannelId.value = id
        }
        viewModelScope.launch {
            runCatching { liveTvRepository.refreshEpg(id) }
            val updated = runCatching { liveTvRepository.getAllEpg().first() }.getOrNull()
            if (updated != null) {
                _epgData.value = UiState.Success(updated)
            }
        }
    }
}
```

注意：删除了 `getShortEpgUseCase` 注入和旧 `epgEntries`，改用 `liveTvRepository` + `epgData`。检查是否有其他地方引用 `viewModel.epgEntries`（EpgTimelineScreen 会改，Task 5）。

- [ ] **Step 2: 编译验证**

Run: `./gradlew compileDebugKotlin -q`
Expected: 可能报错 —— EpgTimelineScreen 还在用旧 `epgEntries`。若报错，暂时忽略，Task 5 同步修复。

- [ ] **Step 3: 提交**

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/epg/EpgViewModel.kt
git commit -m "refactor: EpgViewModel 全量 EPG 加载与增量刷新"
```

---

### Task 5: EpgTimelineScreen 全频道渲染

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/epg/EpgTimelineScreen.kt`

- [ ] **Step 1: 数据源改为 epgData Map**

`EpgTimelineScreen` 内 `val epgEntriesState by viewModel.epgEntries.collectAsState()` 改为：

```kotlin
    val epgDataState by viewModel.epgData.collectAsState()
```

`EpgGrid` 调用处 `epgEntriesState = epgEntriesState` 改为 `epgDataState = epgDataState`。

- [ ] **Step 2: EpgGrid 签名与全频道渲染**

`EpgGrid` 签名改为：

```kotlin
@Composable
private fun EpgGrid(
    channels: List<LiveStream>,
    epgDataState: UiState<Map<Int, List<EpgEntry>>>,
    selectedChannelId: Int?,
    onSelectChannel: (Int) -> Unit,
    onProgramClick: (EpgEntry) -> Unit
)
```

函数体内 `val epgData = when (epgDataState) { is UiState.Success -> epgDataState.data else -> emptyMap() }`，并把 `channels.forEachIndexed { index, channel -> if (channel.id == selectedChannelId) {...} else {...} }` 整块改为：

```kotlin
                        Column {
                            channels.forEach { channel ->
                                ChannelTimelineRow(
                                    epgEntries = epgData[channel.id].orEmpty(),
                                    currentTimeMs = currentTimeMs,
                                    timelineStartMs = timelineStartMs,
                                    onClick = onProgramClick
                                )
                            }
                        }
```

`ChannelTimelineRow` 组件本身不变。

- [ ] **Step 3: 编译验证**

Run: `./gradlew compileDebugKotlin -q`
Expected: 无输出（成功）

- [ ] **Step 4: 提交**

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/epg/EpgTimelineScreen.kt
git commit -m "feat: EPG 时间轴全频道渲染"
```

---

### Task 6: LiveScreen 频道行 EPG 按钮

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/live/LiveScreen.kt`

- [ ] **Step 1: 顶层 LiveScreen 加 onOpenEpg 参数**

`LiveScreen` 签名（line 92-97）加参数：

```kotlin
fun LiveScreen(
    pendingStreamId: Int? = null,
    onStreamPlayed: () -> Unit = {},
    onFullscreenChanged: (Boolean) -> Unit = {},
    onOpenEpg: (Int) -> Unit = {},
    viewModel: LiveViewModel = hiltViewModel()
)
```

- [ ] **Step 2: ContentSection 传递 onOpenEpg**

`ContentSection` 调用处（line ~452）加参数 `onOpenEpg = onOpenEpg`。`ContentSection` 签名加 `onOpenEpg: (Int) -> Unit`，并把 `ChannelList(...)` 调用处加 `onOpenEpg = onOpenEpg`。

- [ ] **Step 3: ChannelList 传递 onOpenEpg**

`ChannelList` 签名加 `onOpenEpg: (Int) -> Unit`，`ChannelItem` 调用处（line 653-660）加 `onOpenEpg = { onOpenEpg(stream.id) }`。

- [ ] **Step 4: ChannelItem 加 EPG 按钮**

`ChannelItem` 签名加 `onOpenEpg: () -> Unit`，在收藏 IconButton 前加：

```kotlin
        IconButton(onClick = onOpenEpg) {
            Icon(
                imageVector = Icons.Filled.DateRange,
                contentDescription = "EPG",
                tint = DarkTextSecondary,
                modifier = Modifier.size(18.dp)
            )
        }
```

imports 加 `androidx.compose.material.icons.filled.DateRange`。

- [ ] **Step 5: 编译验证**

Run: `./gradlew compileDebugKotlin -q`
Expected: 无输出（成功）

- [ ] **Step 6: 提交**

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/live/LiveScreen.kt
git commit -m "feat: 频道行 EPG 入口按钮"
```

---

### Task 7: 播放页 EPG 入口 + MainScreen 接线

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/live/LiveScreen.kt`
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/main/MainScreen.kt`

- [ ] **Step 1: PlayerOverlay 加 EPG 按钮**

`PlayerOverlay` 签名（line 310-316：streamName/epgEntries/isPlaying/onTogglePlay/onFullscreen）加参数 `onOpenEpg: () -> Unit`。底部控制 Row（line 386-413，播放图标与全屏图标之间）加：

```kotlin
                Icon(
                    imageVector = Icons.Filled.DateRange,
                    contentDescription = "EPG",
                    tint = Color.White,
                    modifier = Modifier
                        .size(28.dp)
                        .clickable(onClick = onOpenEpg)
                        .padding(4.dp)
                )
```

- [ ] **Step 2: FullscreenPlayerView 加 EPG 按钮**

`FullscreenPlayerView` 签名加 `onOpenEpg: () -> Unit`。底部控制 Row（line 851-878，播放图标与全屏/退出图标之间）加：

```kotlin
                    Icon(
                        imageVector = Icons.Filled.DateRange,
                        contentDescription = "EPG",
                        tint = Color.White,
                        modifier = Modifier
                            .size(36.dp)
                            .clickable(onClick = onOpenEpg)
                            .padding(6.dp)
                    )
```

- [ ] **Step 3: 播放组件调用处传 onOpenEpg**

`PlayerSection` 内调用 `PlayerOverlay`（line 286-292）加 `onOpenEpg = onOpenEpg`。`PlayerSection` 签名加 `onOpenEpg: () -> Unit`。

`LiveScreen` 内调用 `PlayerSection`（line 213-223）加 `onOpenEpg = { currentStream?.let { onOpenEpg(it.id) } }`。

`LiveScreen` 内调用 `FullscreenPlayerView`（line 202-210）加 `onOpenEpg = { currentStream?.let { onOpenEpg(it.id) } }`。

- [ ] **Step 4: MainScreen 传 onOpenEpg**

`MainScreen.kt` 的 `LiveScreen` 调用处（line 126-133）加：

```kotlin
                LiveScreen(
                    pendingStreamId = pendingLiveStream,
                    onStreamPlayed = { pendingLiveStream = null },
                    onFullscreenChanged = { fullscreen ->
                        hideBottomBar = fullscreen
                    },
                    onOpenEpg = { streamId ->
                        outerNavController.navigate(Routes.epgRoute(streamId))
                    }
                )
```

- [ ] **Step 5: 编译验证**

Run: `./gradlew compileDebugKotlin -q`
Expected: 无输出（成功）

- [ ] **Step 6: 提交**

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/live/LiveScreen.kt app/src/main/java/com/dream/wowiptv/presentation/main/MainScreen.kt
git commit -m "feat: 播放页 EPG 入口并接入导航"
```

---

### Task 8: 全量验证

**Files:**
- 无改动

- [ ] **Step 1: 完整编译**

Run: `./gradlew compileDebugKotlin`
Expected: BUILD SUCCESSFUL

- [ ] **Step 2: 文件清单确认**

- `XtreamApi.getSimpleDataTable` 存在
- `EpgDao.getBySource` 存在
- `EpgEntry.streamId` 字段存在且 mapper 同步
- `LiveTvRepository.refreshAllEpg/refreshEpg/getAllEpg` 存在
- `RefreshAllEpgUseCase` 存在
- `EpgViewModel.epgData` 全量加载 + selectChannel 增量
- `EpgTimelineScreen` 全频道渲染
- `LiveScreen` 频道行 + 播放页 EPG 按钮
- `MainScreen` onOpenEpg 导航接线

- [ ] **Step 3: 提交（如有遗漏）**

```bash
git status
```
若无未提交改动则跳过。
