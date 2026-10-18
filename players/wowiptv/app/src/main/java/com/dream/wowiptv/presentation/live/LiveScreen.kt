package com.dream.wowiptv.presentation.live

import android.content.pm.ActivityInfo
import androidx.activity.ComponentActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PictureInPictureAlt
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material.icons.filled.Search
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import com.dream.wowiptv.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.dream.wowiptv.domain.model.EpgEntry
import com.dream.wowiptv.domain.model.LiveCategory
import com.dream.wowiptv.domain.model.LiveStream
import com.dream.wowiptv.presentation.common.LiveDot
import com.dream.wowiptv.presentation.common.PipState
import com.dream.wowiptv.presentation.common.SortMode
import com.dream.wowiptv.presentation.common.SourceTypeViewModel
import com.dream.wowiptv.presentation.common.UiState
import com.dream.wowiptv.presentation.common.applySort
import com.dream.wowiptv.presentation.common.components.CategoryLockDialog
import com.dream.wowiptv.presentation.common.components.ErrorView
import com.dream.wowiptv.presentation.common.components.EmptyState
import com.dream.wowiptv.presentation.common.components.GradientBackground
import com.dream.wowiptv.presentation.common.components.LoadingIndicator
import com.dream.wowiptv.presentation.common.components.PlayerGestureOverlay
import com.dream.wowiptv.presentation.common.components.SearchField
import com.dream.wowiptv.presentation.common.DeviceStatusIndicator
import com.dream.wowiptv.presentation.common.enterPictureInPicture
import com.dream.wowiptv.presentation.common.formatNetworkSpeed
import com.dream.wowiptv.presentation.common.rememberIsTablet
import com.dream.wowiptv.presentation.common.theme.LiveRed
import com.dream.wowiptv.presentation.common.theme.LocalAccentPalette

private val DarkSurface = Color(0xFF242424)
private val DarkText = Color(0xFFDDDDDD)
private val DarkTextSecondary = Color(0xFF999999)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LiveScreen(
    pendingStreamId: Int? = null,
    onStreamPlayed: () -> Unit = {},
    onFullscreenChanged: (Boolean) -> Unit = {},
    onOpenEpg: (Int) -> Unit = {},
    viewModel: LiveViewModel = hiltViewModel(),
    sourceTypeViewModel: SourceTypeViewModel = hiltViewModel()
) {
    val categoriesState by viewModel.categories.collectAsState()
    val selectedCategoryId by viewModel.selectedCategoryId.collectAsState()
    val streamsState by viewModel.streams.collectAsState()
    val filteredStreams by viewModel.filteredStreams.collectAsState()
    val currentStream by viewModel.currentStream.collectAsState()
    val streamUrl by viewModel.streamUrl.collectAsState()
    val isPlaying by viewModel.isPlaying.collectAsState()
    val epgEntries by viewModel.epgEntries.collectAsState()
    val channelEpg by viewModel.channelEpg.collectAsState()
    val isFullscreen by viewModel.isFullscreen.collectAsState()
    val favoriteIds by viewModel.favoriteIds.collectAsState()
    val visibleFavoriteCount by viewModel.visibleFavoriteCount.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val categoryCounts by viewModel.categoryCounts.collectAsState()
    val lockedCategories by viewModel.lockedCategories.collectAsState()
    val pendingLockedCategory by viewModel.pendingLockedCategory.collectAsState()
    val unlockedCategories by viewModel.unlockedCategories.collectAsState()
    val showStatus by viewModel.showPlayerStatus.collectAsState()
    val sourceType by sourceTypeViewModel.sourceType.collectAsState()
    val isM3u = sourceType == "m3u"

    val accent = LocalAccentPalette.current

    val context = LocalContext.current
    val activity = context as? ComponentActivity

    var isRefreshing by remember { mutableStateOf(false) }

    LaunchedEffect(pendingStreamId, streamsState) {
        if (pendingStreamId != null) {
            val s = streamsState
            if (s is UiState.Success) {
                val stream = s.data.find { it.id == pendingStreamId }
                if (stream != null) {
                    viewModel.playStream(stream)
                    onStreamPlayed()
                }
            }
        }
    }

    LaunchedEffect(streamsState) {
        if (streamsState !is UiState.Loading) {
            isRefreshing = false
        }
    }

    LaunchedEffect(isFullscreen) {
        onFullscreenChanged(isFullscreen)
        if (activity != null) {
            val window = activity.window
            if (isFullscreen) {
                activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                WindowInsetsControllerCompat(window, window.decorView).let { controller ->
                    controller.hide(WindowInsetsCompat.Type.systemBars())
                    controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                }
            } else {
                activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                WindowInsetsControllerCompat(window, window.decorView).show(WindowInsetsCompat.Type.systemBars())
            }
        }
    }

    val isTablet = rememberIsTablet()
    var liveSortMode by remember { mutableStateOf(SortMode.AZ) }
    val exoPlayer = viewModel.player
    val isBuffering by viewModel.isBuffering.collectAsState()
    val networkSpeed by viewModel.networkSpeed.collectAsState()

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_STOP -> viewModel.onAppBackgrounded()
                Lifecycle.Event.ON_START -> viewModel.onAppForegrounded()
                else -> {}
            }
        }

        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    DisposableEffect(Unit) {
        viewModel.onScreenEntered()
        onDispose { viewModel.onScreenLeft() }
    }

    if (isFullscreen) {
        FullscreenPlayerView(
            exoPlayer = exoPlayer,
            currentStream = currentStream,
            isPlaying = isPlaying,
            isBuffering = isBuffering,
            epgEntries = epgEntries,
            networkSpeed = networkSpeed,
            isM3u = isM3u,
            showStatus = showStatus,
            onBack = { viewModel.exitFullscreen() },
            onTogglePlay = { viewModel.togglePlay() },
            onRestart = { currentStream?.let { viewModel.playStream(it) } },
            onOpenEpg = { currentStream?.let { onOpenEpg(it.id) } }
        )
    } else {
        GradientBackground {
        if (isTablet) {
            Row(modifier = Modifier.fillMaxSize()) {
                Column(modifier = Modifier.width(360.dp).fillMaxHeight()) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val catOptions = buildList {
                            add(stringResource(R.string.live_category_all) to (null as Int?))
                            (categoriesState as? UiState.Success)?.data?.forEach { c ->
                                add("${c.name} (${categoryCounts[c.id] ?: 0})" to c.id)
                            }
                        }
                        LiveSelect(
                            label = selectedCategoryId?.let { id ->
                                catOptions.firstOrNull { it.second == id }?.first
                                    ?: stringResource(R.string.live_category_all)
                            } ?: stringResource(R.string.live_category_all),
                            options = catOptions,
                            selected = selectedCategoryId,
                            onSelected = { viewModel.selectCategory(it) },
                            lockedCategoryIds = lockedCategories,
                            unlockedCategoryIds = unlockedCategories,
                            modifier = Modifier.weight(1f)
                        )
                        LiveSelect(
                            label = stringResource(liveSortMode.labelRes),
                            options = listOf(
                                stringResource(SortMode.AZ.labelRes) to SortMode.AZ,
                                stringResource(SortMode.ZA.labelRes) to SortMode.ZA
                            ),
                            selected = liveSortMode,
                            onSelected = { liveSortMode = it },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    SearchField(
                        value = searchQuery,
                        onValueChange = { viewModel.setSearchQuery(it) },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
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
                        showSearch = false,
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
                    EpgStrip(
                        entries = epgEntries,
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                    )
                }
            }
        } else {
        Column(modifier = Modifier.fillMaxSize()) {
            TopAppBar(
                title = { Text(stringResource(R.string.live_title), color = DarkText) },
                windowInsets = WindowInsets.statusBars,
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent,
                    titleContentColor = Color.White
                )
            )
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
                modifier = Modifier.weight(0.4f)
            )

            ContentSection(
                categoriesState = categoriesState,
                selectedCategoryId = selectedCategoryId,
                streamsState = filteredStreams,
                favoriteIds = favoriteIds,
                visibleFavoriteCount = visibleFavoriteCount,
                currentStream = currentStream,
                searchQuery = searchQuery,
                categoryCounts = categoryCounts,
                lockedCategoryIds = lockedCategories,
                unlockedCategoryIds = unlockedCategories,
                onSearchQueryChange = { viewModel.setSearchQuery(it) },
                onSelectCategory = { viewModel.selectCategory(it) },
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
                modifier = Modifier.weight(0.6f)
            )
        }
        }
        }

    }

    pendingLockedCategory?.let { lockedId ->
        val lockedName = (categoriesState as? UiState.Success)?.data?.find { it.id == lockedId }?.name
            ?: stringResource(R.string.common_locked)
        CategoryLockDialog(
            categoryName = lockedName,
            onDismiss = { viewModel.dismissCategoryLock() },
            onVerifyPassword = { viewModel.confirmCategoryLock(it) }
        )
    }
}

@Composable
private fun PlayerSection(
    exoPlayer: ExoPlayer,
    currentStream: LiveStream?,
    streamUrl: String,
    isPlaying: Boolean,
    isBuffering: Boolean,
    epgEntries: List<EpgEntry>,
    networkSpeed: Long,
    isM3u: Boolean,
    showStatus: Boolean,
    onTogglePlay: () -> Unit,
    onRestart: () -> Unit,
    onFullscreen: () -> Unit,
    onOpenEpg: () -> Unit,
    modifier: Modifier = Modifier
) {
    val accent = LocalAccentPalette.current
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.Black)
    ) {
        if (streamUrl.isNotEmpty() && currentStream != null) {
            AndroidView(
                factory = { ctx ->
                    (android.view.LayoutInflater.from(ctx)
                        .inflate(R.layout.live_player_view, null) as PlayerView)
                        .apply { player = exoPlayer }
                },
                onRelease = { it.player = null },
                modifier = Modifier.fillMaxSize()
            )

            if (isBuffering) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color.White)
                }
            }

            PlayerOverlay(
                streamName = currentStream.name,
                epgEntries = epgEntries,
                isPlaying = isPlaying,
                networkSpeed = networkSpeed,
                isM3u = isM3u,
                showStatus = showStatus,
                onTogglePlay = onTogglePlay,
                onRestart = onRestart,
                onFullscreen = onFullscreen,
                onOpenEpg = onOpenEpg
            )
        } else {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .background(Color(0xFF2D2D3A), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Filled.LiveTv,
                            contentDescription = null,
                            tint = accent.light,
                            modifier = Modifier.size(34.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.live_select_channel),
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = stringResource(R.string.live_select_channel_hint),
                        color = Color(0xFF888888),
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun PlayerOverlay(
    streamName: String,
    epgEntries: List<EpgEntry>,
    isPlaying: Boolean,
    networkSpeed: Long,
    isM3u: Boolean,
    showStatus: Boolean,
    onTogglePlay: () -> Unit,
    onRestart: () -> Unit,
    onFullscreen: () -> Unit,
    onOpenEpg: () -> Unit
) {
    val accent = LocalAccentPalette.current
    var showControls by remember { mutableStateOf(true) }

    LaunchedEffect(showControls) {
        if (showControls) {
            kotlinx.coroutines.delay(4000)
            showControls = false
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .clickable {
                showControls = !showControls
            }
    ) {
        PlayerGestureOverlay(modifier = Modifier.fillMaxSize()) {
        if (showControls) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0x80000000))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = streamName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                if (showStatus && networkSpeed > 0) {
                    Text(
                        text = formatNetworkSpeed(networkSpeed),
                        color = Color(0xFFCCCCCC),
                        fontSize = 11.sp,
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                if (!isM3u) {
                    Icon(
                        imageVector = Icons.Filled.DateRange,
                        contentDescription = "EPG",
                        tint = Color.White,
                        modifier = Modifier
                            .size(24.dp)
                            .clickable(onClick = onOpenEpg)
                            .padding(2.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    LiveDot(size = 8.dp)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "LIVE",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }
            }

            if (epgEntries.isNotEmpty()) {
                val currentEpg = epgEntries.find { it.isNowPlaying }
                val nextEpg = epgEntries.firstOrNull { !it.isNowPlaying }
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = 48.dp),
                    verticalArrangement = Arrangement.Bottom
                ) {
                    Column(
                        modifier = Modifier
                            .padding(horizontal = 12.dp, vertical = 4.dp)
                            .background(Color(0x80000000), RoundedCornerShape(6.dp))
                            .padding(8.dp)
                    ) {
                        currentEpg?.let { epg ->
                            Text(
                                text = epg.title,
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        nextEpg?.let { epg ->
                            Text(
                                text = stringResource(R.string.common_next_program, epg.title),
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFFCCCCCC),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }

            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(Color(0x80000000))
                    .padding(horizontal = 8.dp, vertical = 2.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                            contentDescription = if (isPlaying) stringResource(R.string.common_pause) else stringResource(R.string.common_play),
                            tint = Color.White,
                            modifier = Modifier
                                .size(28.dp)
                                .clickable(onClick = onTogglePlay)
                                .padding(4.dp)
                        )
                        Icon(
                            imageVector = Icons.Filled.Refresh,
                            contentDescription = stringResource(R.string.common_refresh),
                            tint = Color.White,
                            modifier = Modifier
                                .size(28.dp)
                                .clickable(onClick = onRestart)
                                .padding(4.dp)
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Filled.Fullscreen,
                            contentDescription = stringResource(R.string.common_fullscreen),
                            tint = Color.White,
                            modifier = Modifier
                                .size(28.dp)
                                .clickable(onClick = onFullscreen)
                                .padding(4.dp)
                        )
                    }
                    }
                }

            }
        }
    }
}

@Composable
private fun ContentSection(
    categoriesState: UiState<List<LiveCategory>>,
    selectedCategoryId: Int?,
    streamsState: UiState<List<LiveStream>>,
    favoriteIds: Set<Int>,
    visibleFavoriteCount: Int,
    currentStream: LiveStream?,
    searchQuery: String,
    categoryCounts: Map<Int, Int>,
    lockedCategoryIds: Set<Int>,
    unlockedCategoryIds: Set<Int>,
    onSearchQueryChange: (String) -> Unit,
    onSelectCategory: (Int?) -> Unit,
    onPlayStream: (LiveStream) -> Unit,
    onToggleFavorite: (LiveStream) -> Unit,
    onOpenEpg: (Int) -> Unit,
    isM3u: Boolean,
    channelEpgTitles: Map<Int, String>,
    onLoadChannelEpg: (Int) -> Unit,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Row(modifier = Modifier.weight(1f).fillMaxWidth()) {
            CategorySidebar(
                categoriesState = categoriesState,
                selectedCategoryId = selectedCategoryId,
                categoryCounts = categoryCounts,
                lockedCategoryIds = lockedCategoryIds,
                unlockedCategoryIds = unlockedCategoryIds,
                visibleFavoriteCount = visibleFavoriteCount,
                onSelectCategory = onSelectCategory,
                modifier = Modifier.weight(0.3f)
            )

            Box(
                modifier = Modifier
                    .width(1.dp)
                    .fillMaxHeight()
                    .background(Color.White.copy(alpha = 0.1f))
            )

            ChannelList(
                streamsState = streamsState,
                selectedCategoryId = selectedCategoryId,
                favoriteIds = favoriteIds,
                currentStream = currentStream,
                searchQuery = searchQuery,
                onSearchQueryChange = onSearchQueryChange,
                onPlayStream = onPlayStream,
                onToggleFavorite = onToggleFavorite,
                onOpenEpg = onOpenEpg,
                isM3u = isM3u,
                channelEpgTitles = channelEpgTitles,
                onLoadChannelEpg = onLoadChannelEpg,
                isRefreshing = isRefreshing,
                onRefresh = onRefresh,
                modifier = Modifier.weight(0.7f)
            )
        }
    }
}



@Composable
private fun CategorySidebar(
    categoriesState: UiState<List<LiveCategory>>,
    selectedCategoryId: Int?,
    categoryCounts: Map<Int, Int>,
    lockedCategoryIds: Set<Int>,
    unlockedCategoryIds: Set<Int>,
    visibleFavoriteCount: Int,
    onSelectCategory: (Int?) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxHeight()) {
        when (categoriesState) {
            is UiState.Loading -> LoadingIndicator()
            is UiState.Error -> ErrorView(message = categoriesState.message, onRetry = {})
            is UiState.Empty -> { }
            is UiState.Success -> {
                val cats = categoriesState.data
                val totalCount = categoryCounts.values.sum()
                Column(modifier = Modifier.fillMaxSize()) {
                    CategoryItem(
                        name = stringResource(R.string.live_category_all),
                        count = totalCount,
                        isSelected = selectedCategoryId == null,
                        onClick = { onSelectCategory(null) }
                    )
                    CategoryItem(
                        name = stringResource(R.string.live_category_favorites),
                        count = visibleFavoriteCount,
                        isSelected = selectedCategoryId == LiveViewModel.FAVORITES_ID,
                        onClick = { onSelectCategory(LiveViewModel.FAVORITES_ID) }
                    )
                    HorizontalDivider(
                        color = Color.White.copy(alpha = 0.1f)
                    )
                    if (cats.isNotEmpty()) {
                        LazyColumn(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                            contentPadding = PaddingValues(vertical = 2.dp),
                            verticalArrangement = Arrangement.spacedBy(2.dp)
                        ) {
                            items(cats, key = { it.id }) { category ->
                                val isLocked = category.id in lockedCategoryIds
                                CategoryItem(
                                    name = category.name,
                                    count = categoryCounts[category.id],
                                    isSelected = selectedCategoryId == category.id,
                                    isLocked = isLocked,
                                    isUnlocked = isLocked && category.id in unlockedCategoryIds,
                                    onClick = { onSelectCategory(category.id) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryItem(
    name: String,
    count: Int?,
    isSelected: Boolean,
    isLocked: Boolean = false,
    isUnlocked: Boolean = false,
    onClick: () -> Unit
) {
    val accent = LocalAccentPalette.current
    val bgColor = if (isSelected) accent.primary.copy(alpha = 0.18f) else Color.Transparent
    val textColor = if (isSelected) Color.White else DarkText
    val containerColor = if (isSelected) accent.primary.copy(alpha = 0.14f) else Color.White.copy(alpha = 0.05f)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(bgColor)
            .clickable(onClick = onClick)
             .padding(horizontal = 8.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = name,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
            color = textColor,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        if (isUnlocked) {
            Spacer(modifier = Modifier.width(4.dp))
            Icon(
                imageVector = Icons.Filled.LockOpen,
                contentDescription = stringResource(R.string.common_unlocked),
                tint = Color(0xFF4CAF50),
                modifier = Modifier.size(12.dp)
            )
        } else if (isLocked) {
            Spacer(modifier = Modifier.width(4.dp))
            Icon(
                imageVector = Icons.Filled.Lock,
                contentDescription = stringResource(R.string.common_locked),
                tint = Color(0xFFE6B34C),
                modifier = Modifier.size(12.dp)
            )
        }
        if (count != null) {
            Spacer(modifier = Modifier.width(4.dp))
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(containerColor)
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = formatCount(count),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (isSelected) accent.light else DarkTextSecondary,
                    maxLines = 1
                )
            }
        }
    }
}

private fun formatCount(count: Int): String = when {
    count >= 10000 -> {
        val v = count / 10000.0
        val s = if (v % 1.0 == 0.0) v.toInt().toString() else String.format("%.1f", v)
        "${s}万"
    }
    else -> count.toString()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChannelList(
    streamsState: UiState<List<LiveStream>>,
    selectedCategoryId: Int?,
    favoriteIds: Set<Int>,
    currentStream: LiveStream?,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onPlayStream: (LiveStream) -> Unit,
    onToggleFavorite: (LiveStream) -> Unit,
    onOpenEpg: (Int) -> Unit,
    isM3u: Boolean,
    channelEpgTitles: Map<Int, String>,
    onLoadChannelEpg: (Int) -> Unit,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    showSearch: Boolean = true,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxHeight()) {
        if (showSearch) {
            SearchField(
                value = searchQuery,
                onValueChange = onSearchQueryChange,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp)
            )
        }
        when (val state = streamsState) {
            is UiState.Loading -> {
                if (!isRefreshing) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        LoadingIndicator()
                    }
                }
            }
            is UiState.Error -> {
                ErrorView(
                    message = state.message,
                    onRetry = onRefresh,
                    modifier = Modifier.fillMaxSize()
                )
            }
            is UiState.Empty -> {
                EmptyState(
                    text = stringResource(R.string.live_no_channels),
                    modifier = Modifier.fillMaxSize()
                )
            }
            is UiState.Success -> {
                if (state.data.isEmpty()) {
                    EmptyState(
                        text = if (selectedCategoryId == LiveViewModel.FAVORITES_ID) stringResource(R.string.live_no_favorite_channels) else stringResource(R.string.live_no_channels),
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    PullToRefreshBox(
                        isRefreshing = isRefreshing,
                        onRefresh = onRefresh,
                        modifier = Modifier.fillMaxSize()
                    ) {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(vertical = 2.dp)
                        ) {
                            itemsIndexed(state.data, key = { _, stream -> stream.id }) { index, stream ->
                                ChannelItem(
                                    index = index + 1,
                                    stream = stream,
                                    isFavorite = stream.id in favoriteIds,
                                    isSelected = stream.id == currentStream?.id,
                                    currentEpgTitle = channelEpgTitles[stream.id],
                                    isM3u = isM3u,
                                    onClick = { onPlayStream(stream) },
                                    onToggleFavorite = { onToggleFavorite(stream) },
                                    onOpenEpg = { onOpenEpg(stream.id) },
                                    onLoadChannelEpg = { onLoadChannelEpg(stream.id) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChannelItem(
    index: Int,
    stream: LiveStream,
    isFavorite: Boolean,
    isSelected: Boolean,
    currentEpgTitle: String?,
    isM3u: Boolean,
    onClick: () -> Unit,
    onToggleFavorite: () -> Unit,
    onOpenEpg: () -> Unit,
    onLoadChannelEpg: () -> Unit
) {
    LaunchedEffect(stream.id) {
        onLoadChannelEpg()
    }
    val accent = LocalAccentPalette.current
    val bgColor = if (isSelected) accent.primary.copy(alpha = 0.22f) else Color.Transparent
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(bgColor)
            .padding(horizontal = 6.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (!stream.iconUrl.isNullOrEmpty()) {
            AsyncImage(
                model = stream.iconUrl,
                contentDescription = stream.name,
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(6.dp)),
                contentScale = ContentScale.Fit
            )
        } else {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(DarkSurface),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = stream.name.firstOrNull()?.toString() ?: "?",
                    color = DarkText,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }
        }
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = "$index",
            color = DarkTextSecondary,
            fontSize = 12.sp,
            modifier = Modifier.width(24.dp),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.width(4.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = stream.name,
                style = MaterialTheme.typography.bodySmall,
                color = DarkText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (!currentEpgTitle.isNullOrEmpty()) {
                Text(
                    text = currentEpgTitle,
                    color = DarkTextSecondary,
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        if (!isM3u) {
            IconButton(onClick = onOpenEpg) {
                Icon(
                    imageVector = Icons.Filled.DateRange,
                    contentDescription = "EPG",
                    tint = DarkTextSecondary,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
        IconButton(onClick = onToggleFavorite) {
            Icon(
                imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                contentDescription = if (isFavorite) stringResource(R.string.common_cancel_favorite) else stringResource(R.string.common_favorite),
                tint = if (isFavorite) LiveRed else DarkTextSecondary,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@Composable
private fun FullscreenPlayerView(
    exoPlayer: ExoPlayer,
    currentStream: LiveStream?,
    isPlaying: Boolean,
    isBuffering: Boolean,
    epgEntries: List<EpgEntry>,
    networkSpeed: Long,
    isM3u: Boolean,
    showStatus: Boolean,
    onBack: () -> Unit,
    onTogglePlay: () -> Unit,
    onRestart: () -> Unit,
    onOpenEpg: () -> Unit
) {
    val accent = LocalAccentPalette.current
    val activity = LocalContext.current as? ComponentActivity
    val inPip = activity?.isInPictureInPictureMode == true

    DisposableEffect(Unit) {
        PipState.videoActive = true
        onDispose {
            PipState.videoActive = false
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        AndroidView(
            factory = { ctx ->
                (android.view.LayoutInflater.from(ctx)
                    .inflate(R.layout.live_player_view, null) as PlayerView)
                    .apply { player = exoPlayer }
            },
            onRelease = { it.player = null },
            modifier = Modifier.fillMaxSize()
        )

        if (isBuffering) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Color.White)
            }
        }

        var showFullscreenControls by remember { mutableStateOf(true) }
        LaunchedEffect(showFullscreenControls) {
            if (showFullscreenControls) {
                kotlinx.coroutines.delay(3000)
                showFullscreenControls = false
            }
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .clickable {
                    showFullscreenControls = !showFullscreenControls
                }
        ) {
            PlayerGestureOverlay(modifier = Modifier.fillMaxSize(), gesturesEnabled = !inPip) {
            if (showFullscreenControls && !inPip) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0x80000000))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_exit_fullscreen),
                            tint = Color.White
                        )
                    }
                    Text(
                        text = currentStream?.name ?: "",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    if (showStatus) {
                        DeviceStatusIndicator(fontSize = 13.sp)
                        Spacer(modifier = Modifier.width(10.dp))
                        if (networkSpeed > 0) {
                            Text(
                                text = formatNetworkSpeed(networkSpeed),
                                color = Color(0xFFCCCCCC),
                                fontSize = 13.sp,
                                modifier = Modifier.padding(end = 8.dp)
                            )
                        }
                    }
                    if (!isM3u) {
                        IconButton(onClick = onOpenEpg) {
                            Icon(
                                imageVector = Icons.Filled.DateRange,
                                contentDescription = "EPG",
                                tint = Color.White,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                    IconButton(onClick = {
                        val vs = exoPlayer.videoSize
                        if (vs.height > 0) {
                            PipState.videoWidth = vs.width
                            PipState.videoHeight = vs.height
                            PipState.pixelRatio = vs.pixelWidthHeightRatio
                            PipState.rotationDegrees = vs.unappliedRotationDegrees
                        }
                        enterPictureInPicture(activity)
                    }) {
                        Icon(
                            imageVector = Icons.Filled.PictureInPictureAlt,
                            contentDescription = stringResource(R.string.common_pip),
                            tint = Color.White,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                    Row(
                        modifier = Modifier.padding(end = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        LiveDot(size = 9.dp)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "LIVE",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                }

                if (epgEntries.isNotEmpty()) {
                    val currentEpg = epgEntries.find { it.isNowPlaying }
                    val nextEpg = epgEntries.firstOrNull { !it.isNowPlaying }
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = 48.dp),
                        verticalArrangement = Arrangement.Bottom
                    ) {
                        Column(
                            modifier = Modifier
                                .padding(16.dp)
                                .background(Color(0x80000000), RoundedCornerShape(8.dp))
                                .padding(12.dp)
                        ) {
                            currentEpg?.let { epg ->
                                Text(
                                    text = epg.title,
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = Color.White,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            nextEpg?.let { epg ->
                                Text(
                                    text = stringResource(R.string.common_next_program, epg.title),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFFCCCCCC),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }

                Row(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .background(Color(0x80000000))
                        .padding(horizontal = 12.dp, vertical = 2.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                            contentDescription = if (isPlaying) stringResource(R.string.common_pause) else stringResource(R.string.common_play),
                            tint = Color.White,
                            modifier = Modifier
                                .size(36.dp)
                                .clickable(onClick = onTogglePlay)
                                .padding(6.dp)
                        )
                        Icon(
                            imageVector = Icons.Filled.Refresh,
                            contentDescription = stringResource(R.string.common_refresh),
                            tint = Color.White,
                            modifier = Modifier
                                .size(36.dp)
                                .clickable(onClick = onRestart)
                                .padding(6.dp)
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Filled.Fullscreen,
                            contentDescription = stringResource(R.string.common_exit_fullscreen),
                            tint = Color.White,
                            modifier = Modifier
                                .size(36.dp)
                                .clickable(onClick = onBack)
                                .padding(6.dp)
                        )
                    }
                }

            }
        }
    }
    }
}

@Composable
private fun <T> LiveSelect(
    label: String,
    options: List<Pair<String, T>>,
    selected: T,
    onSelected: (T) -> Unit,
    lockedCategoryIds: Set<Int> = emptySet(),
    unlockedCategoryIds: Set<Int> = emptySet(),
    modifier: Modifier = Modifier
) {
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
                val isLocked = value is Int && value in lockedCategoryIds
                DropdownMenuItem(
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (isLocked) {
                                Icon(
                                    imageVector = if (value in unlockedCategoryIds) Icons.Filled.LockOpen else Icons.Filled.Lock,
                                    contentDescription = stringResource(
                                        if (value in unlockedCategoryIds) R.string.common_unlocked else R.string.common_locked
                                    ),
                                    tint = if (value in unlockedCategoryIds) Color(0xFF4CAF50) else Color(0xFFE6B34C),
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                            }
                            Text(
                                text = optionLabel,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.widthIn(max = 300.dp)
                            )
                        }
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



