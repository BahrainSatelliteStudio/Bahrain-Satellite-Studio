package com.dream.wowiptv.presentation.common.components

import android.app.Activity
import android.media.AudioManager
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.BrightnessHigh
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.FastRewind
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlinx.coroutines.delay

private enum class GestureKind { Brightness, Volume }
private enum class ActiveGesture { Brightness, Volume, Seek }

@Composable
fun PlayerGestureOverlay(
    modifier: Modifier = Modifier,
    gesturesEnabled: Boolean = true,
    onSeekStart: (() -> Unit)? = null,
    onSeekDelta: ((deltaFraction: Float) -> Unit)? = null,
    onSeekEnd: (() -> Unit)? = null,
    content: @Composable BoxScope.() -> Unit
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val audioManager = remember { context.getSystemService(AudioManager::class.java) }
    val maxVolume = audioManager?.getStreamMaxVolume(AudioManager.STREAM_MUSIC) ?: 100

    var volume by remember { mutableIntStateOf(audioManager?.getStreamVolume(AudioManager.STREAM_MUSIC) ?: 0) }
    var brightness by remember {
        mutableFloatStateOf(activity?.window?.attributes?.screenBrightness?.takeIf { it >= 0f } ?: 0.5f)
    }

    var kind by remember { mutableStateOf<GestureKind?>(null) }
    var valueFrac by remember { mutableFloatStateOf(0f) }
    var visible by remember { mutableStateOf(false) }

    var isSeeking by remember { mutableStateOf(false) }
    var seekDirectionForward by remember { mutableStateOf(true) }
    var seekDeltaMs by remember { mutableFloatStateOf(0f) }

    LaunchedEffect(kind, valueFrac) {
        if (kind != null) {
            delay(1200)
            visible = false
            kind = null
        }
    }

    LaunchedEffect(isSeeking) {
        if (isSeeking) {
            delay(1500)
            isSeeking = false
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            activity?.window?.let { window ->
                val attrs = window.attributes
                attrs.screenBrightness = -1f
                window.attributes = attrs
            }
        }
    }

    fun applyBrightness(frac: Float) {
        val clamped = frac.coerceIn(0f, 1f)
        valueFrac = clamped
        brightness = 0.05f + clamped * 0.95f
        activity?.window?.let { window ->
            val attrs = window.attributes
            attrs.screenBrightness = 0.05f + clamped * 0.95f
            window.attributes = attrs
        }
    }

    fun applyVolume(frac: Float) {
        val clamped = frac.coerceIn(0f, 1f)
        valueFrac = clamped
        volume = (clamped * maxVolume).roundToInt()
        audioManager?.setStreamVolume(AudioManager.STREAM_MUSIC, volume, 0)
    }

    Box(
        modifier = if (gesturesEnabled) {
            modifier.pointerInput(Unit) {
                awaitEachGesture {
                    val down = awaitFirstDown(requireUnconsumed = false)
                    val startX = down.position.x
                    val startY = down.position.y
                    var totalDragX = 0f
                    var totalDragY = 0f
                    var directionLocked = false
                    var activeGesture: ActiveGesture? = null
                    var startFrac = 0f
                    val touchSlop = viewConfiguration.touchSlop * 2f

                    do {
                        val event = awaitPointerEvent()
                        val change = event.changes.firstOrNull() ?: continue

                        if (!change.pressed) break

                        val delta = change.position - change.previousPosition

                        if (!directionLocked) {
                            totalDragX += delta.x
                            totalDragY += delta.y

                            if (abs(totalDragX) > touchSlop || abs(totalDragY) > touchSlop) {
                                directionLocked = true
                                val isHorizontal = abs(totalDragX) > abs(totalDragY)

                                if (isHorizontal) {
                                    activeGesture = ActiveGesture.Seek
                                    isSeeking = true
                                    seekDeltaMs = 0f
                                    onSeekStart?.invoke()
                                } else {
                                    activeGesture = if (startX < size.width / 2f) {
                                        ActiveGesture.Brightness
                                    } else {
                                        ActiveGesture.Volume
                                    }
                                    startFrac = if (activeGesture == ActiveGesture.Brightness) {
                                        brightness
                                    } else {
                                        volume / maxVolume.toFloat()
                                    }
                                    kind = if (activeGesture == ActiveGesture.Brightness) GestureKind.Brightness else GestureKind.Volume
                                    valueFrac = startFrac
                                    visible = true
                                }
                            }
                        } else {
                            when (activeGesture) {
                                ActiveGesture.Seek -> {
                                    seekDeltaMs += delta.x / size.width
                                    seekDirectionForward = delta.x > 0
                                    onSeekDelta?.invoke(seekDeltaMs)
                                    change.consume()
                                }
                                ActiveGesture.Brightness -> {
                                    totalDragY += delta.y
                                    val newFrac = startFrac - totalDragY / (size.height * 0.8f)
                                    applyBrightness(newFrac)
                                    change.consume()
                                }
                                ActiveGesture.Volume -> {
                                    totalDragY += delta.y
                                    val newFrac = startFrac - totalDragY / (size.height * 0.8f)
                                    applyVolume(newFrac)
                                    change.consume()
                                }
                                null -> {}
                            }
                        }
                    } while (true)

                    when (activeGesture) {
                        ActiveGesture.Seek -> {
                            isSeeking = false
                            onSeekEnd?.invoke()
                        }
                        ActiveGesture.Brightness, ActiveGesture.Volume -> {
                            activeGesture = null
                        }
                        null -> {}
                    }
                }
            }
        } else {
            modifier
        }
    ) {
        content()

        if (visible && kind != null) {
            val icon = if (kind == GestureKind.Brightness) {
                Icons.Filled.BrightnessHigh
            } else {
                Icons.AutoMirrored.Filled.VolumeUp
            }
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .background(Color(0xCC000000), RoundedCornerShape(10.dp))
                    .padding(horizontal = 16.dp, vertical = 14.dp)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "${(valueFrac * 100).roundToInt()}%",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Box(
                        modifier = Modifier
                            .width(4.dp)
                            .height(90.dp)
                            .background(Color(0x66FFFFFF), RoundedCornerShape(2.dp)),
                        contentAlignment = Alignment.BottomCenter
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .fillMaxHeight(valueFrac)
                                .background(Color.White, RoundedCornerShape(2.dp))
                        )
                    }
                    Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(22.dp))
                }
            }
        }

        if (isSeeking) {
            val seekSeconds = (seekDeltaMs * 100).roundToInt()
            val sign = if (seekDirectionForward) "+" else "-"
            val displaySeconds = abs(seekSeconds)
            val icon = if (seekDirectionForward) Icons.Filled.FastForward else Icons.Filled.FastRewind
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .background(Color(0xCC000000), RoundedCornerShape(12.dp))
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                    Text(
                        text = "$sign${displaySeconds}s",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
