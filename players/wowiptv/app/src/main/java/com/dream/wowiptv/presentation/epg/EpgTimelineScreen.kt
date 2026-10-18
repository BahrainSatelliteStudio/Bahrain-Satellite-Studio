package com.dream.wowiptv.presentation.epg

import android.content.pm.ActivityInfo
import android.content.res.Configuration
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ScreenRotation
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.dream.wowiptv.R
import com.dream.wowiptv.domain.model.EpgEntry
import com.dream.wowiptv.domain.model.LiveStream
import com.dream.wowiptv.presentation.common.UiState
import com.dream.wowiptv.presentation.common.components.ErrorView
import com.dream.wowiptv.presentation.common.components.GradientBackground
import com.dream.wowiptv.presentation.common.components.LoadingIndicator
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme
import com.dream.wowiptv.presentation.common.theme.LiveRed
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlin.math.max

private val hourWidth = 120.dp
private val totalHours = 24
private val timelineWidth = hourWidth * totalHours
private val channelRowHeight = 56.dp
private val channelLabelWidth = 120.dp
private val EPG_PREFETCH = 10

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EpgTimelineScreen(
    viewModel: EpgViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onPlayChannel: (Int) -> Unit,
    embedded: Boolean = false
) {
    val channelsState by viewModel.channels.collectAsState()
    val epgDataState by viewModel.epgData.collectAsState()
    val selectedChannelId by viewModel.selectedChannelId.collectAsState()

    var selectedProgram by remember { mutableStateOf<EpgEntry?>(null) }

    val context = LocalContext.current
    val activity = context as? ComponentActivity
    val isLandscape = context.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE

    BackHandler {
        if (!embedded) {
            if (isLandscape) {
                activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            } else {
                onNavigateBack()
            }
        }
    }

    MaterialTheme(colorScheme = DarkColorScheme) {
        GradientBackground {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                TopAppBar(
                    title = {
                        Text(
                            text = if (embedded) stringResource(R.string.program_guide) else "EPG",
                            color = Color.White
                        )
                    },
                    navigationIcon = {
                        if (!embedded) {
                            IconButton(onClick = {
                                val a = activity
                                if (a != null && isLandscape) {
                                    a.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                                } else {
                                    onNavigateBack()
                                }
                            }) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                            }
                        }
                    },
                    actions = {
                        if (!embedded) {
                            IconButton(onClick = {
                                val a = activity ?: return@IconButton
                                if (isLandscape) {
                                    a.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                                } else {
                                    a.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                                }
                            }) {
                                Icon(
                                    imageVector = Icons.Filled.ScreenRotation,
                                    contentDescription = stringResource(R.string.epg_rotate),
                                    tint = Color.White
                                )
                            }
                        }
                    },
                    windowInsets = if (embedded) WindowInsets(0, 0, 0, 0) else WindowInsets.statusBars,
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = Color.White,
                        navigationIconContentColor = Color.White
                    )
                )
            }
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                when (val state = channelsState) {
                    is UiState.Loading -> LoadingIndicator()
                    is UiState.Error -> ErrorView(message = state.message, onRetry = { })
                    is UiState.Empty, is UiState.Success -> {
                        val channels = (state as? UiState.Success)?.data ?: emptyList()
                        if (channels.isEmpty()) {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "No channels",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        } else {
                            when (val epgState = epgDataState) {
                                is UiState.Error -> ErrorView(
                                    message = epgState.message,
                                    onRetry = { viewModel.retryLoadEpg() }
                                )
                                is UiState.Loading -> {
                                    if (channelsState is UiState.Success) {
                                        LoadingIndicator()
                                    }
                                }
                                else -> {
                                    EpgGrid(
                                        channels = channels,
                                        epgDataState = epgDataState,
                                        selectedChannelId = selectedChannelId,
                                        onSelectChannel = viewModel::selectChannel,
                                        onEnsureEpg = viewModel::ensureEpg,
                                        onProgramClick = { selectedProgram = it }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        selectedProgram?.let { program ->
            ModalBottomSheet(
                onDismissRequest = { selectedProgram = null },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                containerColor = Color(0xFF2C2C2C)
            ) {
                ProgramDetailContent(program = program)
            }
        }
    }
    }
}

@Composable
private fun EpgGrid(
    channels: List<LiveStream>,
    epgDataState: UiState<Map<Int, List<EpgEntry>>>,
    selectedChannelId: Int?,
    onSelectChannel: (Int) -> Unit,
    onEnsureEpg: (Int) -> Unit,
    onProgramClick: (EpgEntry) -> Unit
) {
    val timelineScrollState = rememberScrollState()
    val labelsListState = rememberLazyListState()
    val timelineListState = rememberLazyListState()
    val currentTimeMs = remember { System.currentTimeMillis() }
    val timelineStartMs = remember {
        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        cal.timeInMillis
    }

    val nowOffset = hourWidth * ((currentTimeMs - timelineStartMs) / 3600000f)

    val nowScrollPx = with(LocalDensity.current) {
        (hourWidth * ((currentTimeMs - timelineStartMs) / 3600000f)).toPx()
    }.toInt()
    LaunchedEffect(Unit) {
        timelineScrollState.scrollTo(nowScrollPx)
    }

    val visibleRange = remember {
        derivedStateOf {
            val info = timelineListState.layoutInfo
            val first = info.visibleItemsInfo.firstOrNull()?.index ?: 0
            val last = info.visibleItemsInfo.lastOrNull()?.index ?: first
            first..max(first, last)
        }
    }
    LaunchedEffect(timelineListState, channels) {
        snapshotFlow { visibleRange.value }
            .collect { range ->
                if (channels.isEmpty()) return@collect
                val start = (range.first - EPG_PREFETCH).coerceIn(0, channels.lastIndex)
                val end = (range.last + EPG_PREFETCH).coerceIn(0, channels.lastIndex)
                for (i in start..end) {
                    onEnsureEpg(channels[i].id)
                }
            }
    }

    val scrollSync = remember { mutableStateOf(0 to 0) }
    LaunchedEffect(labelsListState) {
        snapshotFlow { labelsListState.firstVisibleItemIndex to labelsListState.firstVisibleItemScrollOffset }
            .collect { pos ->
                if (scrollSync.value != pos) {
                    scrollSync.value = pos
                    timelineListState.scrollToItem(pos.first, pos.second)
                }
            }
    }
    LaunchedEffect(timelineListState) {
        snapshotFlow { timelineListState.firstVisibleItemIndex to timelineListState.firstVisibleItemScrollOffset }
            .collect { pos ->
                if (scrollSync.value != pos) {
                    scrollSync.value = pos
                    labelsListState.scrollToItem(pos.first, pos.second)
                }
            }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Text(
                text = "All Channels",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .width(channelLabelWidth)
                    .padding(horizontal = 4.dp, vertical = 6.dp)
            )
            Row(
                modifier = Modifier.horizontalScroll(timelineScrollState)
            ) {
                Row(modifier = Modifier.width(timelineWidth)) {
                    for (i in 0 until totalHours) {
                        val hourTime = timelineStartMs + i * 3600 * 1000L
                        Text(
                            text = formatTime(hourTime),
                            modifier = Modifier
                                .width(hourWidth)
                                .padding(horizontal = 4.dp, vertical = 6.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        Box(modifier = Modifier.weight(1f)) {
            Row {
                LazyColumn(
                    state = labelsListState,
                    modifier = Modifier.width(channelLabelWidth)
                ) {
                    items(channels, key = { it.id }) { channel ->
                        ChannelLabel(
                            stream = channel,
                            isSelected = channel.id == selectedChannelId,
                            onClick = { onSelectChannel(channel.id) }
                        )
                    }
                }

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .horizontalScroll(timelineScrollState)
                ) {
                    Box(modifier = Modifier.width(timelineWidth)) {
                        val epgData = when (epgDataState) {
                            is UiState.Success -> epgDataState.data
                            else -> emptyMap()
                        }

                        LazyColumn(state = timelineListState) {
                            items(channels, key = { it.id }) { channel ->
                                ChannelTimelineRow(
                                    epgEntries = epgData[channel.id].orEmpty(),
                                    timelineStartMs = timelineStartMs,
                                    nowOffset = nowOffset,
                                    onClick = onProgramClick
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
private fun ChannelLabel(
    stream: LiveStream,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(channelRowHeight)
            .background(
                if (isSelected) MaterialTheme.colorScheme.primaryContainer
                else MaterialTheme.colorScheme.surface
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = stream.name,
            style = MaterialTheme.typography.bodySmall,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer
            else MaterialTheme.colorScheme.onSurface
        )
    }
    HorizontalDivider(thickness = 0.5.dp, color = MaterialTheme.colorScheme.outlineVariant)
}

@Composable
private fun ChannelTimelineRow(
    epgEntries: List<EpgEntry>,
    timelineStartMs: Long,
    nowOffset: Dp,
    onClick: (EpgEntry) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(channelRowHeight)
            .width(timelineWidth)
    ) {
        Row {
            var currentX = 0.dp
            val sorted = epgEntries.sortedBy { it.startTime }

            sorted.forEach { entry ->
                val startOffset = hourWidth * max(
                    0f,
                    ((entry.startTime - timelineStartMs) / 3600000f)
                )

                val gap = (startOffset - currentX).coerceAtLeast(0.dp)
                if (gap > 0.dp) {
                    Spacer(modifier = Modifier.width(gap))
                    currentX += gap
                }

                val durationHours = max(
                    0.05f,
                    (entry.endTime - max(entry.startTime, timelineStartMs)) / 3600000f
                )
                val blockWidth = (hourWidth * durationHours).coerceAtLeast(60.dp)

                val isCurrent = entry.isNowPlaying

                Box(
                    modifier = Modifier
                        .width(blockWidth)
                        .fillMaxHeight()
                        .padding(vertical = 4.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(
                            if (isCurrent) MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)
                            else MaterialTheme.colorScheme.surfaceVariant
                        )
                        .clickable(onClick = { onClick(entry) })
                        .padding(horizontal = 4.dp, vertical = 2.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Column {
                        Text(
                            text = entry.title,
                            style = MaterialTheme.typography.labelSmall,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            color = if (isCurrent) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = formatTimeShort(entry.startTime),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                currentX += blockWidth
            }
        }
        Box(
            modifier = Modifier
                .offset(x = nowOffset)
                .width(2.dp)
                .fillMaxHeight()
                .background(LiveRed)
        )
    }
    HorizontalDivider(thickness = 0.5.dp, color = MaterialTheme.colorScheme.outlineVariant)
}

@Composable
private fun ProgramDetailContent(program: EpgEntry) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp)
    ) {
        Text(
            text = program.title,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
        if (!program.description.isNullOrBlank()) {
            Text(
                text = program.description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 12.dp)
            )
        }
        Text(
            text = "${formatTime(program.startTime)} - ${formatTime(program.endTime)}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp)
        )
    }
}

private fun formatTime(millis: Long): String {
    val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
    return sdf.format(Date(millis))
}

private fun formatTimeShort(millis: Long): String {
    val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
    return sdf.format(Date(millis))
}
