package com.dream.wowiptv.presentation.common

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dream.wowiptv.presentation.common.theme.LiveRed

@Composable
fun LiveDot(size: Dp = 8.dp) {
    val transition = rememberInfiniteTransition(label = "liveDot")
    val haloScale by transition.animateFloat(
        initialValue = 1f,
        targetValue = 2.8f,
        animationSpec = infiniteRepeatable(tween(1200), RepeatMode.Restart),
        label = "haloScale"
    )
    val haloAlpha by transition.animateFloat(
        initialValue = 0.8f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(tween(1200), RepeatMode.Restart),
        label = "haloAlpha"
    )
    val dotScale by transition.animateFloat(
        initialValue = 1f,
        targetValue = 0.65f,
        animationSpec = infiniteRepeatable(tween(600), RepeatMode.Reverse),
        label = "dotScale"
    )
    Box(contentAlignment = Alignment.Center) {
        Box(
            modifier = Modifier
                .size(size * 1.2f)
                .graphicsLayer {
                    scaleX = haloScale
                    scaleY = haloScale
                    alpha = haloAlpha
                }
                .background(LiveRed.copy(alpha = 0.7f), CircleShape)
        )
        Box(
            modifier = Modifier
                .size(size)
                .graphicsLayer {
                    scaleX = dotScale
                    scaleY = dotScale
                }
                .background(LiveRed, CircleShape)
        )
    }
}
