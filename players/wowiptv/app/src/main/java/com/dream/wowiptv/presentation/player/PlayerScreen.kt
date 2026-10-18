package com.dream.wowiptv.presentation.player

import com.dream.wowiptv.R
import android.content.pm.ActivityInfo
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.ClosedCaption
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PictureInPictureAlt
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.VideoSize
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.DefaultTrackNameProvider
import androidx.media3.ui.PlayerView
import com.dream.wowiptv.presentation.common.NetworkSpeedTracker
import com.dream.wowiptv.presentation.common.DeviceStatusIndicator
import com.dream.wowiptv.presentation.common.PipState
import com.dream.wowiptv.presentation.common.components.PlayerGestureOverlay
import com.dream.wowiptv.presentation.common.enterPictureInPicture
import com.dream.wowiptv.presentation.common.formatNetworkSpeed
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme
import kotlinx.coroutines.delay

@Composable
fun PlayerScreen(
    streamType: String,
    streamId: String,
    streamName: String = "",
    startPosition: Long = 0L,
    onBack: () -> Unit,
    viewModel: PlayerViewModel = hiltViewModel()
) {
    val streamUrl by viewModel.streamUrl.collectAsState()
    val streamMimeType by viewModel.streamMimeType.collectAsState()
    val defaultSpeed by viewModel.defaultPlaybackSpeed.collectAsState()
    val showStatus by viewModel.showPlayerStatus.collectAsState()
    val autoplayNext by viewModel.autoplayNextEpisode.collectAsState()
    val currentEpisodeId by viewModel.currentEpisodeId.collectAsState()
    val currentTitle by viewModel.currentTitle.collectAsState()
    var autoplayRef by remember { mutableStateOf(autoplayNext) }
    var showOverlay by remember { mutableStateOf(true) }
    var isPlaying by remember { mutableStateOf(true) }
    var isBuffering by remember { mutableStateOf(true) }
    var position by remember { mutableFloatStateOf(0f) }
    var duration by remember { mutableFloatStateOf(0f) }
    var buffered by remember { mutableFloatStateOf(0f) }
    var playbackSpeed by remember { mutableFloatStateOf(1f) }
    var showSpeedMenu by remember { mutableStateOf(false) }
    var showAudioMenu by remember { mutableStateOf(false) }
    var showSubtitleMenu by remember { mutableStateOf(false) }
    var hasSeeked by remember { mutableStateOf(false) }
    var videoHeight by remember { mutableStateOf(0) }
    var isSeekDragging by remember { mutableStateOf(false) }
    var seekStartPosition by remember { mutableStateOf(0L) }
    var seekStartDuration by remember { mutableStateOf(0L) }
    var seekAccumulator by remember { mutableFloatStateOf(0f) }

    val context = LocalContext.current
    val activity = context as? ComponentActivity
    val inPip = activity?.isInPictureInPictureMode == true
    val trackNameProvider = remember { DefaultTrackNameProvider(context.resources) }


    val networkTracker = remember { NetworkSpeedTracker() }

    val exoPlayer = remember {
        val dataSourceFactory = DefaultHttpDataSource.Factory()
            .setTransferListener(networkTracker)
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(dataSourceFactory))
            .build().apply {
                playWhenReady = true
                addListener(object : Player.Listener {
                    override fun onVideoSizeChanged(videoSize: VideoSize) {
                        videoHeight = videoSize.height
                        if (videoSize.height > 0) {
                            PipState.videoWidth = videoSize.width
                            PipState.videoHeight = videoSize.height
                            PipState.pixelRatio = videoSize.pixelWidthHeightRatio
                            PipState.rotationDegrees = videoSize.unappliedRotationDegrees
                            PipState.videoActive = true
                        }
                    }
                    override fun onPlaybackStateChanged(state: Int) {
                        isBuffering = state == Player.STATE_BUFFERING
                        if (state == Player.STATE_READY) {
                            duration = this@apply.duration.toFloat().coerceAtLeast(0f)
                        }
                        if (state == Player.STATE_ENDED && autoplayRef) {
                            val next = viewModel.nextEpisodeId()
                            if (next != null) {
                                viewModel.playNextEpisode(next, "")
                            }
                        }
                    }
                    override fun onIsPlayingChanged(playing: Boolean) {
                        isPlaying = playing
                    }
                })
            }
    }

    LaunchedEffect(autoplayNext) { autoplayRef = autoplayNext }

    LaunchedEffect(defaultSpeed) {
        playbackSpeed = defaultSpeed
        exoPlayer.setPlaybackSpeed(defaultSpeed)
    }

    var networkSpeed by remember { mutableStateOf(0L) }
    LaunchedEffect(Unit) {
        while (true) {
            networkSpeed = networkTracker.currentBps()
            delay(1000)
        }
    }

    LaunchedEffect(streamUrl, streamMimeType) {
        if (streamUrl.isNotEmpty()) {
            val mediaItem = MediaItem.Builder()
                .setUri(streamUrl)
                .apply { streamMimeType?.let { setMimeType(it) } }
                .build()
            exoPlayer.setMediaItem(mediaItem)
            exoPlayer.prepare()
            exoPlayer.playWhenReady = true
            viewModel.play()
        }
    }

    LaunchedEffect(streamUrl, startPosition) {
        if (streamUrl.isNotEmpty() && startPosition > 0 && !hasSeeked) {
            delay(500)
            exoPlayer.seekTo(startPosition)
            hasSeeked = true
        }
    }

    val contentId = when (streamType) {
        "vod" -> "vod_$streamId"
        "series" -> "series_$currentEpisodeId"
        "live" -> "live_$streamId"
        else -> ""
    }

    LaunchedEffect(streamUrl) {
        if (streamUrl.isNotEmpty()) {
            if (streamType == "live") {
                viewModel.saveProgress(contentId, 0L, 0L)
            }
        }
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(10000)
            if (exoPlayer.isPlaying) {
                if (streamType == "live") {
                    viewModel.saveProgress(contentId, 0L, 0L)
                } else if (duration > 0) {
                    viewModel.saveProgress(contentId, exoPlayer.currentPosition, duration.toLong())
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        activity?.window?.let { window ->
            WindowCompat.setDecorFitsSystemWindows(window, false)
            WindowInsetsControllerCompat(window, window.decorView).let { controller ->
                controller.hide(WindowInsetsCompat.Type.systemBars())
                controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        }
    }

    LaunchedEffect(isPlaying) {
        activity?.window?.let { window ->
            if (isPlaying) {
                window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            } else {
                window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            PipState.videoActive = false
            if (duration > 0) viewModel.saveProgress(contentId, exoPlayer.currentPosition, duration.toLong())
            exoPlayer.stop()
            exoPlayer.release()
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            activity?.let { act ->
                val window = act.window
                WindowCompat.setDecorFitsSystemWindows(window, true)
                WindowInsetsControllerCompat(window, window.decorView).show(WindowInsetsCompat.Type.systemBars())
            }
        }
    }

    LaunchedEffect(showOverlay) {
        if (showOverlay) {
            delay(4000)
            showOverlay = false
        }
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(250)
            if (exoPlayer.duration > 0) {
                position = (exoPlayer.currentPosition.toFloat() / exoPlayer.duration.toFloat()).coerceIn(0f, 1f)
                buffered = (exoPlayer.bufferedPosition.toFloat() / exoPlayer.duration.toFloat()).coerceIn(0f, 1f)
                duration = exoPlayer.duration.toFloat()
            }
        }
    }

    MaterialTheme(colorScheme = DarkColorScheme) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
                .clickable {
                    showOverlay = !showOverlay
                }
        ) {
        PlayerGestureOverlay(
            modifier = Modifier.fillMaxSize(),
            gesturesEnabled = !inPip,
            onSeekStart = {
                seekStartPosition = exoPlayer.currentPosition
                seekStartDuration = exoPlayer.duration.coerceAtLeast(0L)
                isSeekDragging = true
                seekAccumulator = 0f
            },
            onSeekDelta = { deltaFraction ->
                seekAccumulator = deltaFraction
            },
            onSeekEnd = {
                if (isSeekDragging && seekStartDuration > 0) {
                    val offsetMs = (seekAccumulator * seekStartDuration).toLong()
                    val targetPos = (seekStartPosition + offsetMs).coerceIn(0L, seekStartDuration)
                    exoPlayer.seekTo(targetPos)
                    position = (targetPos.toFloat() / seekStartDuration.toFloat()).coerceIn(0f, 1f)
                }
                isSeekDragging = false
                seekAccumulator = 0f
            }
        ) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = false
                    resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FILL
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        if (isBuffering) {
            CircularProgressIndicator(
                color = Color(0xFF1E88E5),
                modifier = Modifier.size(36.dp).align(Alignment.Center),
                strokeWidth = 3.dp
            )
        }

        if (showOverlay && !inPip) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0x80000000))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    IconButton(onClick = {
                        if (duration > 0) viewModel.saveProgress(contentId, exoPlayer.currentPosition, duration.toLong())
                        exoPlayer.stop()
                        onBack()
                    }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                    if (currentTitle.isNotBlank()) {
                        Text(
                            text = currentTitle,
                            color = Color.White,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    if (showStatus) {
                        DeviceStatusIndicator(fontSize = 12.sp)
                        Spacer(modifier = Modifier.width(10.dp))
                        if (networkSpeed > 0) {
                            Text(
                                text = formatNetworkSpeed(networkSpeed),
                                color = Color(0xFFCCCCCC),
                                fontSize = 12.sp,
                                modifier = Modifier.padding(end = 12.dp)
                            )
                        }
                    }
                    IconButton(onClick = { enterPictureInPicture(activity) }) {
                        Icon(
                            imageVector = Icons.Filled.PictureInPictureAlt,
                            contentDescription = stringResource(R.string.common_pip),
                            tint = Color.White
                        )
                    }
                }
            }

            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.BottomCenter
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0x80000000))
                        .padding(start = 12.dp, end = 12.dp, top = 6.dp, bottom = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = {
                            if (isPlaying) {
                                exoPlayer.pause()
                                viewModel.pause()
                            } else {
                                exoPlayer.play()
                                viewModel.play()
                            }
                        },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                            contentDescription = if (isPlaying) "Pause" else "Play",
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }

                    IconButton(
                        onClick = {
                            if (streamUrl.isNotEmpty()) {
                                exoPlayer.stop()
                                val mediaItem = MediaItem.Builder()
                                    .setUri(streamUrl)
                                    .apply { streamMimeType?.let { setMimeType(it) } }
                                    .build()
                                exoPlayer.setMediaItem(mediaItem)
                                exoPlayer.prepare()
                                exoPlayer.playWhenReady = true
                                viewModel.play()
                            }
                        },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Refresh,
                            contentDescription = stringResource(R.string.common_refresh),
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }

                    var dragging by remember { mutableStateOf(false) }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .padding(horizontal = 6.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        val trackColor = Color(0xFF555555)
                        val progressColor = Color(0xFF1E88E5)
                        val bufferedColor = Color.White.copy(alpha = 0.35f)
                        val thumbColor = Color(0xFF1E88E5)
                        Canvas(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(24.dp)
                                .pointerInput(Unit) {
                                    detectTapGestures { offset ->
                                        val newPos = (offset.x / size.width).coerceIn(0f, 1f)
                                        position = newPos
                                        exoPlayer.seekTo((newPos * duration).toLong())
                                    }
                                }
                                .pointerInput(Unit) {
                                    detectHorizontalDragGestures(
                                        onDragStart = { offset ->
                                            dragging = true
                                            val newPos = (offset.x / size.width).coerceIn(0f, 1f)
                                            position = newPos
                                        },
                                        onHorizontalDrag = { change, _ ->
                                            val newPos = (change.position.x / size.width).coerceIn(0f, 1f)
                                            position = newPos
                                        },
                                        onDragEnd = {
                                            dragging = false
                                            exoPlayer.seekTo((position * duration).toLong())
                                        }
                                    )
                                }
                        ) {
                            val trackHeight = 2.dp.toPx()
                            val trackTop = size.height / 2 - trackHeight / 2
                            drawRoundRect(
                                color = trackColor,
                                topLeft = Offset(0f, trackTop),
                                size = size.copy(height = trackHeight),
                                cornerRadius = CornerRadius(trackHeight / 2)
                            )
                            val bufferedWidth = size.width * buffered
                            drawRoundRect(
                                color = bufferedColor,
                                topLeft = Offset(0f, trackTop),
                                size = size.copy(width = bufferedWidth, height = trackHeight),
                                cornerRadius = CornerRadius(trackHeight / 2)
                            )
                            val progressWidth = size.width * position
                            drawRoundRect(
                                color = progressColor,
                                topLeft = Offset(0f, trackTop),
                                size = size.copy(width = progressWidth, height = trackHeight),
                                cornerRadius = CornerRadius(trackHeight / 2)
                            )
                            val thumbRadius = 3.dp.toPx()
                            val maxThumbX = (size.width - thumbRadius).coerceAtLeast(thumbRadius)
                            val thumbX = (size.width * position).coerceIn(thumbRadius, maxThumbX)
                            drawCircle(
                                color = thumbColor,
                                radius = thumbRadius,
                                center = Offset(thumbX, size.height / 2)
                            )
                        }
                    }

                    Text(
                        text = "${formatTime((position * duration).toLong())} / ${formatTime(duration.toLong())}",
                        color = Color(0xFFCCCCCC),
                        fontSize = 11.sp,
                        modifier = Modifier.width(78.dp)
                    )

                    val qualityLabel = when {
                        videoHeight >= 2160 -> "4K"
                        videoHeight >= 1440 -> "2K"
                        videoHeight >= 1080 -> "1080p"
                        videoHeight >= 720 -> "720p"
                        videoHeight >= 576 -> "576p"
                        videoHeight >= 480 -> "480p"
                        videoHeight >= 360 -> "360p"
                        videoHeight >= 240 -> "240p"
                        else -> ""
                    }
                    if (qualityLabel.isNotEmpty()) {
                        Text(
                            text = qualityLabel,
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 8.dp)
                        )
                    }

                    Box {
                        IconButton(
                            onClick = { showAudioMenu = true },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.MusicNote,
                                contentDescription = stringResource(R.string.common_track),
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        DropdownMenu(
                            expanded = showAudioMenu,
                            onDismissRequest = { showAudioMenu = false }
                        ) {
                            val audioGroups = exoPlayer.currentTracks.groups.filter { it.type == C.TRACK_TYPE_AUDIO }
                            if (audioGroups.isEmpty()) {
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.common_no_track), color = Color.White) },
                                    onClick = { showAudioMenu = false }
                                )
                            } else {
                                audioGroups.forEachIndexed { index, group ->
                                    val fmt = group.mediaTrackGroup.getFormat(0)
                                    val label = trackNameProvider.getTrackName(fmt)
                                    val isSelected = group.isSelected
                                    DropdownMenuItem(
                                        text = { Text(if (isSelected) "$label ✓" else label, color = Color.White) },
                                        onClick = {
                                            val groupTracks = (0 until group.mediaTrackGroup.length).toList()
                                            val params = exoPlayer.trackSelectionParameters.buildUpon()
                                                .setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, groupTracks))
                                                .build()
                                            exoPlayer.trackSelectionParameters = params
                                            showAudioMenu = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    Box {
                        val textGroups = exoPlayer.currentTracks.groups.filter { it.type == C.TRACK_TYPE_TEXT }
                        IconButton(
                            onClick = { showSubtitleMenu = true },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.ClosedCaption,
                                contentDescription = stringResource(R.string.common_subtitle),
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        DropdownMenu(
                            expanded = showSubtitleMenu,
                            onDismissRequest = { showSubtitleMenu = false }
                        ) {
                            if (textGroups.isEmpty()) {
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.common_no_subtitle), color = Color(0xFF888888)) },
                                    onClick = { showSubtitleMenu = false },
                                    enabled = false
                                )
                            } else {
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.common_disable), color = Color.White) },
                                    onClick = {
                                        exoPlayer.trackSelectionParameters = exoPlayer.trackSelectionParameters.buildUpon()
                                            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                                            .build()
                                        showSubtitleMenu = false
                                    }
                                )
                                textGroups.forEachIndexed { index, group ->
                                    val fmt = group.mediaTrackGroup.getFormat(0)
                                    val label = trackNameProvider.getTrackName(fmt)
                                    val disabled = exoPlayer.trackSelectionParameters.disabledTrackTypes.contains(C.TRACK_TYPE_TEXT)
                                    val isSelected = group.isSelected && !disabled
                                    DropdownMenuItem(
                                        text = { Text(if (isSelected) "$label ✓" else label, color = Color.White) },
                                        onClick = {
                                            val groupTracks = (0 until group.mediaTrackGroup.length).toList()
                                            val params = exoPlayer.trackSelectionParameters.buildUpon()
                                                .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                                                .setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, groupTracks))
                                                .build()
                                            exoPlayer.trackSelectionParameters = params
                                            showSubtitleMenu = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    Box(modifier = Modifier.width(40.dp), contentAlignment = Alignment.Center) {
                        Text(
                            text = "${formatSpeed(playbackSpeed)}x",
                            color = Color.White,
                            fontSize = 14.sp,
                            modifier = Modifier
                                .padding(vertical = 8.dp)
                                .clickable { showSpeedMenu = true }
                        )
                        DropdownMenu(
                            expanded = showSpeedMenu,
                            onDismissRequest = { showSpeedMenu = false }
                        ) {
                            listOf(0.5f, 0.75f, 1f, 1.25f, 1.5f, 2f).forEach { speed ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            text = "${formatSpeed(speed)}x${if (speed == playbackSpeed) " ✓" else ""}",
                                            color = Color.White
                                        )
                                    },
                                    onClick = {
                                        playbackSpeed = speed
                                        exoPlayer.setPlaybackSpeed(speed)
                                        showSpeedMenu = false
                                    }
                                )
                            }
                        }
                    }
                }

            }
        }
        }
    }
    }
}

private fun formatTime(ms: Long): String {
    val totalSec = ms / 1000
    val min = totalSec / 60
    val sec = totalSec % 60
    return "%02d:%02d".format(min, sec)
}

private fun formatSpeed(speed: Float): String =
    if (speed % 1f == 0f) speed.toInt().toString() else speed.toString()