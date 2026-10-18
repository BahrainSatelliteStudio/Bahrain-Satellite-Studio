# PAD UI 桌面端对齐重做 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 PAD UI 的直播/电影/剧集/详情 4 屏重设计为桌面端（WowIPTVDesktop）布局：直播两栏（侧边栏+播放区含EPG条）、电影/剧集标题行+4档排序+密度、详情 hero 背景+下窗左右布局。

**Architecture:** 在 `feat/pad-ui` 分支上继续改（前一版已提交，本计划覆盖 Task 4/7/8/9/10 的实现）。手机分支全程不动。

**Tech Stack:** Kotlin, Compose M3, Coil, Media3

参考 spec：`docs/superpowers/specs/2026-08-05-pad-ui-design.md`（已更新桌面对齐版）
桌面参考：`D:\study\WowIPTVDesktop\frontend\src\views\LiveView.vue` / `MoviesView.vue` / `MovieDetailView.vue` / `SeriesDetailView.vue`

---

### Task R1: SortMode 扩展 4 档（TDD）

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/common/SortMode.kt`
- Modify: `app/src/main/res/values/strings.xml`
- Modify: `app/src/main/res/values-en/strings.xml`
- Test: `app/src/test/java/com/dream/wowiptv/presentation/common/SortModeTest.kt`

- [ ] **Step 1: 加字符串**

`values/strings.xml`（中文）追加：
```xml
    <string name="sort_za">Z-A</string>
    <string name="sort_oldest">最早</string>
```
`values-en/strings.xml` 追加：
```xml
    <string name="sort_za">Z-A</string>
    <string name="sort_oldest">Oldest</string>
```

- [ ] **Step 2: 扩展枚举与 applySort**

`SortMode.kt` 改为：

```kotlin
package com.dream.wowiptv.presentation.common

import com.dream.wowiptv.R

enum class SortMode(val labelRes: Int) {
    AZ(R.string.sort_az),
    ZA(R.string.sort_za),
    NEWEST(R.string.sort_recent),
    OLDEST(R.string.sort_oldest)
}

fun <T> applySort(
    items: List<T>,
    mode: SortMode,
    nameOf: (T) -> String,
    dateOf: (T) -> String?
): List<T> = when (mode) {
    SortMode.AZ -> items.sortedBy { nameOf(it).lowercase() }
    SortMode.ZA -> items.sortedByDescending { nameOf(it).lowercase() }
    SortMode.NEWEST -> items.sortedByDescending { dateOf(it) }
    SortMode.OLDEST -> items.sortedBy { dateOf(it) }
}
```

- [ ] **Step 3: 更新测试**

`SortModeTest.kt` 追加两个测试（fixture 沿用现有 4 item：name 序 ≠ date 序）：

```kotlin
    @Test
    fun `ZA sorts by name descending ignoring case`() {
        val sorted = applySort(items, SortMode.ZA, { it.name }, { it.date })
        assertEquals(listOf("Movie D", "movie c", "Movie B", "Movie A"), sorted.map { it.name })
    }

    @Test
    fun `OLDEST sorts by date ascending with nulls last`() {
        val sorted = applySort(items, SortMode.OLDEST, { it.name }, { it.date })
        assertEquals(listOf("movie c", "Movie D", "Movie B", "Movie A"), sorted.map { it.name })
        assertEquals(listOf("2024-03-01 10:00:00", "2024-04-01 10:00:00", "2024-05-02 10:00:00", null), sorted.map { it.date })
    }
```

- [ ] **Step 4: 测试验证**

Run: `.\gradlew.bat :app:testDebugUnitTest --tests "com.dream.wowiptv.presentation.common.SortModeTest"`
Expected: PASS（5 tests）

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/common/SortMode.kt app/src/main/res/values/strings.xml app/src/main/res/values-en/strings.xml app/src/test/java/com/dream/wowiptv/presentation/common/SortModeTest.kt
git commit -m "feat: SortMode扩展4档(AZ/ZA/NEWEST/OLDEST)+applySort+测试"
```

---

### Task R2: ContentToolbar 密度映射 8/6/4

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/common/components/ContentToolbar.kt`

- [ ] **Step 1: 密度列数映射改 8/6/4**

现有：
```kotlin
            val options = listOf(6 to R.string.poster_small, 5 to R.string.poster_medium, 4 to R.string.poster_large)
```
改为：
```kotlin
            val options = listOf(8 to R.string.poster_small, 6 to R.string.poster_medium, 4 to R.string.poster_large)
```

（桌面密度：小=8 列、中=6 列、大=4 列）

- [ ] **Step 2: 构建验证 + Commit**

Run: `.\gradlew.bat :app:assembleDebug`（timeout 600000ms）→ BUILD SUCCESSFUL

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/common/components/ContentToolbar.kt
git commit -m "feat: ContentToolbar密度映射列数8/6/4对齐桌面"
```

---

### Task R3: 电影/剧集页标题行

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/movies/MoviesScreen.kt`
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/series/SeriesScreen.kt`

- [ ] **Step 1: MoviesScreen tablet 分支加标题行**

`MoviesScreen.kt` 的 `if (isTablet) { ContentToolbar(...) }` 前插入：

```kotlin
                if (isTablet) {
                    Text(
                        text = stringResource(R.string.movies_title),
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.padding(start = 16.dp, top = 12.dp)
                    )
                }
```

（`FontWeight`/`MaterialTheme`/`Text` 均已导入则复用）

- [ ] **Step 2: SeriesScreen tablet 分支加标题行**

同上，`R.string.series_title`。

- [ ] **Step 3: 构建验证 + Commit**

Run: `.\gradlew.bat :app:assembleDebug`（timeout 600000ms）→ BUILD SUCCESSFUL

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/movies/MoviesScreen.kt app/src/main/java/com/dream/wowiptv/presentation/series/SeriesScreen.kt
git commit -m "feat: PAD电影/剧集页加标题行对齐桌面"
```

---

### Task R4: 直播页桌面式两栏

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/live/LiveScreen.kt`

- [ ] **Step 1: 加 imports**

追加（已有跳过）：
```kotlin
import androidx.compose.foundation.aspectRatio
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Surface
import androidx.compose.material3.TextButton
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.dream.wowiptv.presentation.common.SortMode
import com.dream.wowiptv.presentation.common.applySort
```

- [ ] **Step 2: 加直播排序状态**

`LiveScreen` 内 `val isTablet = rememberIsTablet()` 行后插入：
```kotlin
    var liveSortMode by remember { mutableStateOf(SortMode.AZ) }
```

- [ ] **Step 3: tablet 分支整体替换为两栏**

现有 `if (isTablet) { Row(...三栏...) }` 整块（约 222-283 行）替换为：

```kotlin
        if (isTablet) {
            Row(modifier = Modifier.fillMaxSize()) {
                Column(modifier = Modifier.width(360.dp).fillMaxHeight()) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        LiveSelect(
                            label = stringResource(R.string.live_category_all),
                            options = buildList {
                                add(stringResource(R.string.live_category_all) to null)
                                (categoriesState as? UiState.Success)?.data?.forEach { c ->
                                    add("${c.name} (${categoryCounts[c.id] ?: 0})" to c.id)
                                }
                            },
                            selected = selectedCategoryId,
                            onSelected = { viewModel.selectCategory(it) }
                        )
                        LiveSelect(
                            label = stringResource(SortMode.AZ.labelRes),
                            options = listOf(
                                stringResource(SortMode.AZ.labelRes) to SortMode.AZ,
                                stringResource(SortMode.ZA.labelRes) to SortMode.ZA
                            ),
                            selected = liveSortMode,
                            onSelected = { liveSortMode = it }
                        )
                    }
                    SearchField(
                        value = searchQuery,
                        onValueChange = { viewModel.setSearchQuery(it) },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp)
                    )
                    val sortedStreams = when (val s = filteredStreams) {
                        is UiState.Success -> UiState.Success(
                            applySort(s.data, liveSortMode, { it.name }, { null })
                        )
                        else -> s
                    }
                    ChannelList(
                        streamsState = sortedStreams,
                        selectedCategoryId = selectedCategoryId,
                        favoriteIds = favoriteIds,
                        currentStream = currentStream,
                        searchQuery = searchQuery,
                        onSearchQueryChange = { viewModel.setSearchQuery(it) },
                        onPlayStream = { viewModel.playStream(it) },
                        onToggleFavorite = { stream -> viewModel.toggleFavorite(stream) },
                        onOpenEpg = onOpenEpg,
                        isM3u = isM3u,
                        channelEpgTitles = channelEpg,
                        onLoadChannelEpg = { viewModel.loadChannelEpg(it) },
                        isRefreshing = isRefreshing,
                        onRefresh = {
                            isRefreshing = true
                            viewModel.refresh()
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
                Box(
                    modifier = Modifier
                        .width(1.dp)
                        .fillMaxHeight()
                        .background(Color.White.copy(alpha = 0.1f))
                )
                Column(modifier = Modifier.weight(1f).fillMaxHeight()) {
                    PlayerSection(
                        exoPlayer = exoPlayer,
                        currentStream = currentStream,
                        streamUrl = streamUrl,
                        isPlaying = isPlaying,
                        isBuffering = isBuffering,
                        epgEntries = epgEntries,
                        networkSpeed = networkSpeed,
                        isM3u = isM3u,
                        showStatus = showStatus,
                        onTogglePlay = { viewModel.togglePlay() },
                        onRestart = { currentStream?.let { viewModel.playStream(it) } },
                        onFullscreen = { viewModel.toggleFullscreen() },
                        onOpenEpg = { currentStream?.let { onOpenEpg(it.id) } },
                        modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f)
                    )
                    if (epgStripVisible) {
                        EpgStrip(
                            entries = epgEntries,
                            onToggle = { epgStripVisible = false },
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f)
                        )
                    }
                }
            }
        } else {
```

注意：
- 变量名以原文件为准（`filteredStreams`/`channelEpg`/`epgEntries`/`categoryCounts` 等）
- 在 `LiveScreen` 函数体加 `var epgStripVisible by remember { mutableStateOf(true) }`
- 分类 Select 的 options 用 `label to value`（null 表示全部）；`live_category_all` 若不存在改用 `R.string.live_category_all` 现有字符串（核对 values/strings.xml，直播"全部"的 key 若不同用实际 key）

- [ ] **Step 4: 文件末尾加 LiveSelect + EpgStrip 私有 composable**

```kotlin
@Composable
private fun <T> LiveSelect(
    label: String,
    options: List<Pair<String, T>>,
    selected: T,
    onSelected: (T) -> Unit,
    modifier: Modifier = Modifier
) {
    val accent = LocalAccentPalette.current
    var expanded by remember { mutableStateOf(false) }
    Box(modifier = modifier) {
        Surface(
            onClick = { expanded = true },
            shape = RoundedCornerShape(8.dp),
            color = Color(0xFF2D2D3A)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = label,
                    color = Color.White,
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Icon(
                    Icons.Filled.ArrowDropDown,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { (optionLabel, value) ->
                DropdownMenuItem(
                    text = {
                        Text(
                            text = optionLabel,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.widthIn(max = 300.dp)
                        )
                    },
                    leadingIcon = {
                        if (value == selected) {
                            Icon(Icons.Filled.Check, contentDescription = null)
                        }
                    },
                    onClick = {
                        onSelected(value)
                        expanded = false
                    }
                )
            }
        }
    }
}

@Composable
private fun EpgStrip(
    entries: List<EpgEntry>,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier
) {
    val accent = LocalAccentPalette.current
    val timeFmt = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }
    Column(modifier = modifier.background(Color(0xFF16161C))) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(R.string.epg_title),
                style = MaterialTheme.typography.titleSmall,
                color = Color.White,
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = onToggle) {
                Icon(
                    Icons.Filled.Close,
                    contentDescription = stringResource(R.string.common_close),
                    tint = Color(0xFF8A8A93),
                    modifier = Modifier.size(18.dp)
                )
            }
        }
        if (entries.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = stringResource(R.string.err_load_epg),
                    color = Color(0xFF888888),
                    fontSize = 12.sp
                )
            }
        } else {
            LazyRow(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(entries, key = { "${it.streamId}-${it.startTime}" }) { entry ->
                    val isNow = entry.isNowPlaying
                    Column(
                        modifier = Modifier
                            .width(140.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(
                                if (isNow) accent.primary.copy(alpha = 0.25f) else Color(0xFF2D2D3A)
                            )
                            .padding(10.dp)
                    ) {
                        Text(
                            text = "${timeFmt.format(Date(entry.startTime))} - ${timeFmt.format(Date(entry.endTime))}",
                            color = if (isNow) accent.vibrant else Color(0xFF8A8A93),
                            fontSize = 11.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = entry.title,
                            color = Color.White,
                            fontSize = 12.sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}
```

注意：
- 若 `R.string.epg_title`/`R.string.common_close` 不存在，用文件内现用等效字符串（EPG 标题用现有 `epg_*` 或 PlayerOverlay 里 "EPG" 文案；关闭用 `R.string.common_close` 核对，无则用 `""`）
- imports 自查：`Clip`/`CircleShape` 不需要；需 `IconButton`、`Icons.Filled.Close`、`widthIn`、`items`(lazy) 等——已有跳过，缺的补

- [ ] **Step 5: 构建验证**

Run: `.\gradlew.bat :app:assembleDebug`（timeout 600000ms）
Expected: BUILD SUCCESSFUL（若 `common_close`/`epg_title` 不存在导致编译错，改用文件内实际存在的字符串）

- [ ] **Step 6: Commit**

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/live/LiveScreen.kt
git commit -m "feat: PAD直播页桌面式两栏——侧边栏(分类/排序/搜索/频道)+播放区(播放器+EPG条)"
```

---

### Task R5: 电影详情页 hero 重做

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/movies/MovieDetailScreen.kt`

- [ ] **Step 1: 加 imports**

追加（已有跳过）：
```kotlin
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color.Companion.Transparent
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.HorizontalDivider
```

- [ ] **Step 2: 替换 MovieDetailTablet 为 hero 布局**

现有 `MovieDetailTablet` 私有 composable 整体替换为：

```kotlin
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MovieDetailTablet(
    info: VodInfo,
    savedPos: Long,
    savedDuration: Long,
    avatarsEnabled: Boolean,
    castImages: Map<String, String>,
    posterContentScale: ContentScale,
    isFavorite: Boolean,
    onToggleFavorite: () -> Unit,
    onBack: () -> Unit,
    onPlay: (Int, String, Long) -> Unit
) {
    val accent = LocalAccentPalette.current
    val durationMs = if (savedDuration > 0) savedDuration else (info.durationSecs ?: 0) * 1000L
    val progress = if (savedPos > 0 && durationMs > 0) {
        (savedPos.toFloat() / durationMs).coerceIn(0f, 1f)
    } else 0f

    Column(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1.2f)
                .background(Color.Black)
        ) {
            AsyncImage(
                model = info.cover,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .blur(18.dp)
                    .scale(1.08f)
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.55f), Color(0xFF1A1A1A))))
            )
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .padding(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.common_back), tint = Color.White)
                    }
                    Spacer(modifier = Modifier.weight(1f))
                    IconButton(onClick = onToggleFavorite) {
                        Icon(
                            imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            contentDescription = stringResource(R.string.common_favorite),
                            tint = if (isFavorite) Color(0xFFFFD700) else Color.White
                        )
                    }
                }
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = info.name,
                    style = MaterialTheme.typography.headlineMedium,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    info.releasedate?.take(4)?.let { year ->
                        Text(year, style = MaterialTheme.typography.bodyMedium, color = Color(0xFFCCCCCC))
                        Spacer(modifier = Modifier.width(12.dp))
                    }
                    info.rating?.let { rating ->
                        Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.height(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("%.1f".format(rating), style = MaterialTheme.typography.bodyMedium, color = Color(0xFFCCCCCC))
                    }
                    info.durationSecs?.let { secs ->
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(formatDuration(secs, LocalContext.current), style = MaterialTheme.typography.bodyMedium, color = Color(0xFFCCCCCC))
                    }
                }
                info.genre?.let { genreStr ->
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        genreStr.split(",").take(6).forEach { tag ->
                            SuggestionChip(
                                onClick = { },
                                label = { Text(tag.trim(), style = MaterialTheme.typography.labelSmall) }
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(20.dp))
                Row(
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Button(
                        onClick = { onPlay(info.id, info.name, savedPos) },
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = accent.vibrant),
                        modifier = Modifier.height(48.dp)
                    ) {
                        Icon(Icons.Filled.PlayArrow, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            if (savedPos > 0) stringResource(R.string.common_continue) else stringResource(R.string.common_play),
                            fontWeight = FontWeight.Bold
                        )
                    }
                    if (savedPos > 0) {
                        OutlinedButton(
                            onClick = { onPlay(info.id, info.name, 0L) },
                            shape = RoundedCornerShape(24.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = accent.vibrant),
                            border = BorderStroke(1.dp, accent.vibrant),
                            modifier = Modifier.height(48.dp)
                        ) {
                            Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(stringResource(R.string.common_restart))
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(16.dp)
        ) {
            AsyncImage(
                model = info.cover,
                contentDescription = info.name,
                contentScale = posterContentScale,
                modifier = Modifier
                    .width(180.dp)
                    .height(260.dp)
                    .clip(RoundedCornerShape(12.dp))
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                info.plot?.let { plot ->
                    Text(
                        text = stringResource(R.string.movies_overview),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = plot,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                info.cast?.let { cast ->
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.movies_cast),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    val castNames = cast.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                    if (avatarsEnabled && castNames.isNotEmpty()) {
                        CastAvatarRow(names = castNames, images = castImages)
                    } else {
                        Text(
                            text = cast,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                info.director?.let { director ->
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.movies_director),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    val directorName = director.trim()
                    if (avatarsEnabled && directorName.isNotEmpty()) {
                        PersonAvatar(name = directorName, imageUrl = castImages[directorName])
                    } else {
                        Text(
                            text = director,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}
```

注意：
- `Modifier.scale` 需要 `androidx.compose.ui.draw.scale` import
- 下窗右列若放不下"同类影片"则本轮省略（相关推荐已有 AllItems 入口，YAGNI）
- `common_favorite` 字符串核对存在与否，无则用 `""`
- 若 `savedPos/savedDuration` 是 composable 内 collectAsState 的 val（在 Success 块内），tablet 调用处仍传

- [ ] **Step 3: 更新调用处**

`is UiState.Success` 块内 tablet 调用加收藏参数。先确认 `movieFavoriteIds` 或收藏状态在 `MovieDetailScreen` 可用——`MovieDetailViewModel` 无 favorite flow（查证），若不可用：
- 在 `MovieDetailViewModel` 加 `val isFavorite: StateFlow<Boolean>`（combine favoriteVods + vodId，参考 HomeViewModel/其他 favorite flow 写法）与 `fun toggleFavorite()`
- 或退而求其次：隐藏收藏钮（去掉 isFavorite/onToggleFavorite 参数，hero 只保留返回钮）

**工程决策：先查 `MovieDetailViewModel` 是否有 favorite 能力；没有则本轮跳过收藏钮（保持 hero 简洁），只传返回/播放。** 相应简化 MovieDetailTablet 签名。

- [ ] **Step 4: 构建验证**

Run: `.\gradlew.bat :app:assembleDebug`（timeout 600000ms）
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/movies/MovieDetailScreen.kt
git commit -m "feat: PAD电影详情页hero背景+下窗左右布局对齐桌面"
```

---

### Task R6: 剧集详情页 hero 重做

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/series/SeriesDetailScreen.kt`

- [ ] **Step 1: 加 imports**

追加（已有跳过）：
```kotlin
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
```

- [ ] **Step 2: 替换 SeriesDetailTablet 为 hero 布局**

现有 `SeriesDetailTablet` 整体替换为（结构与电影版对称）：

```kotlin
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SeriesDetailTablet(
    series: SeriesItem,
    info: SeriesInfo,
    allEpisodes: List<Episode>,
    seriesEpisodeIds: List<String>,
    episodePositions: Map<String, Long>,
    avatarsEnabled: Boolean,
    castImages: Map<String, String>,
    posterContentScale: ContentScale,
    onBack: () -> Unit,
    onPlayEpisode: (String, String, Long, List<String>) -> Unit
) {
    val accent = LocalAccentPalette.current
    Column(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1.2f)
                .background(Color.Black)
        ) {
            AsyncImage(
                model = series.cover,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .blur(18.dp)
                    .scale(1.08f)
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.55f), Color(0xFF1A1A1A))))
            )
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .padding(16.dp)
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.common_back), tint = Color.White)
                }
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = series.name,
                    style = MaterialTheme.typography.headlineMedium,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    series.releaseDate?.let { date ->
                        Text(date.take(10), style = MaterialTheme.typography.bodyMedium, color = Color(0xFFCCCCCC))
                        Spacer(modifier = Modifier.width(12.dp))
                    }
                    series.rating?.let { rating ->
                        Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.height(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(rating, style = MaterialTheme.typography.bodyMedium, color = Color(0xFFCCCCCC))
                    }
                }
                series.genre?.let { genreStr ->
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        genreStr.split(",").take(6).forEach { tag ->
                            SuggestionChip(
                                onClick = { },
                                label = { Text(tag.trim(), style = MaterialTheme.typography.labelSmall) }
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(16.dp)
        ) {
            AsyncImage(
                model = series.cover,
                contentDescription = series.name,
                contentScale = posterContentScale,
                modifier = Modifier
                    .width(180.dp)
                    .height(260.dp)
                    .clip(RoundedCornerShape(12.dp))
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                series.cast?.let { cast ->
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.series_cast),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    val castNames = cast.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                    if (avatarsEnabled && castNames.isNotEmpty()) {
                        CastAvatarRow(names = castNames, images = castImages)
                    } else {
                        Text(
                            text = cast,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                series.director?.let { director ->
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.series_director),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    val directorName = director.trim()
                    if (avatarsEnabled && directorName.isNotEmpty()) {
                        PersonAvatar(name = directorName, imageUrl = castImages[directorName])
                    } else {
                        Text(
                            text = director,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                SeriesEpisodesBlock(
                    seriesName = series.name,
                    info = info,
                    allEpisodes = allEpisodes,
                    seriesEpisodeIds = seriesEpisodeIds,
                    episodePositions = episodePositions,
                    onPlayEpisode = onPlayEpisode
                )
            }
        }
    }
}
```

注意：
- 若下窗右列过长（剧集多时），`SeriesEpisodesBlock` 在大滚动列内仍可滚——保持现状（桌面也是整列滚动）
- plot 从下窗省略（hero 不显示简介，桌面剧集 hero 无 plot 覆盖）——如你认为需要可在下窗 cast 前加 plot 段（参照电影版），自行判断保持对称

- [ ] **Step 3: 构建验证**

Run: `.\gradlew.bat :app:assembleDebug`（timeout 600000ms）
Expected: BUILD SUCCESSFUL

- [ ] **Step 4: Commit**

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/series/SeriesDetailScreen.kt
git commit -m "feat: PAD剧集详情页hero背景+下窗左右布局对齐桌面"
```

---

### Task R7: 全量构建 + 单测 + 最终审查

**Files:** 无代码改动

- [ ] **Step 1: 全量构建 + 单测**

Run: `.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest`
Expected: BUILD SUCCESSFUL，SortModeTest 5 例通过

- [ ] **Step 2: 手机回归抽查**

`git diff` 确认：LiveScreen/MoviesScreen/SeriesScreen/MovieDetailScreen/SeriesDetailScreen 手机分支零改动（外层 if/else 包裹 + lambda 提取除外）

- [ ] **Step 3: 提交（如有残留）**

```bash
git status  # 无预期外改动
```

---

## Self-Review 备注

- 覆盖：spec 桌面对齐版 §直播/电影剧集/详情 全部实现（R1-R6）；设置/首页/导航已在第一波完成
- 类型一致：`SortMode.AZ/ZA/NEWEST/OLDEST`、`applySort` 4 档、`LiveSelect`/`EpgStrip`/`MovieDetailTablet`/`SeriesDetailTablet` 签名在本计划内统一
- 注意点：R4 的 `live_category_all`/`common_close`/`epg_title` 字符串若不存在用文件内实际存在的；R5 收藏钮能力需查 `MovieDetailViewModel`（无则省略收藏钮）
