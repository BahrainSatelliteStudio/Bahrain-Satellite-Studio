package com.dream.wowiptv.presentation.common.components

import android.annotation.SuppressLint
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.TweenSpec
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

private val FlipSpec = TweenSpec<Float>(durationMillis = 600)

@SuppressLint("UnusedBoxWithConstraintsScope")
@Composable
fun FlippablePosterCard(
    posterUrl: String?,
    title: String,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    rating: String? = null,
    year: String? = null,
    genres: String? = null,
    plot: String? = null,
) {
    val flipAngle = remember { Animatable(90f) }
    var flipped by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        flipAngle.animateTo(0f, FlipSpec)
    }

    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        // scrim
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.72f))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null
                ) { onDismiss() }
        )

        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
        ) {
            val cardWidth = maxWidth
            val cardHeight = maxHeight.coerceAtMost(cardWidth * 1.5f)
            Box(
                modifier = Modifier
                    .width(cardWidth)
                    .height(cardHeight)
                    .graphicsLayer {
                        rotationY = if (flipped) flipAngle.value else -flipAngle.value
                        cameraDistance = 8 * density
                    }
                    .clip(RoundedCornerShape(16.dp))
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { flipped = !flipped }
            ) {
                if (!flipped) {
                    // Front: poster image
                    AsyncImage(
                        model = posterUrl,
                        contentDescription = title,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    // Back: info card
                    InfoSide(
                        title = title,
                        subtitle = subtitle,
                        rating = rating,
                        year = year,
                        genres = genres,
                        plot = plot
                    )
                }

                // close button overlay (always visible)
                IconButton(
                    onClick = onDismiss,
                    colors = IconButtonDefaults.iconButtonColors(containerColor = Color.Black.copy(alpha = 0.5f)),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                ) {
                    Icon(Icons.Default.Close, contentDescription = null, tint = Color.White)
                }
            }
        }
    }
}

@Composable
private fun InfoSide(
    title: String,
    subtitle: String?,
    rating: String?,
    year: String?,
    genres: String?,
    plot: String?,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFF1E1E2A), Color(0xFF12121A))
                )
            )
            .padding(20.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f, fill = false)) {
            Text(
                text = title,
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
            subtitle?.let {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = it,
                    color = Color(0xFFAAAAAA),
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                year?.let {
                    Text(text = it, color = Color(0xFFCCCCCC), fontSize = 13.sp)
                    Spacer(modifier = Modifier.width(10.dp))
                }
                rating?.let {
                    Text(text = "\u2605 $it", color = Color(0xFFFFC107), fontSize = 13.sp, fontWeight = FontWeight.Medium)
                }
            }

            genres?.let { genreStr ->
                Spacer(modifier = Modifier.height(10.dp))
                val tags = genreStr.split(",").map { it.trim() }.take(4)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    tags.forEach { tag ->
                        Box(
                            modifier = Modifier
                                .background(Color.White.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(text = tag, color = Color(0xFFDDDDDD), fontSize = 11.sp)
                        }
                    }
                }
            }

            plot?.let {
                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    text = it,
                    color = Color(0xFFBBBBBB),
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    maxLines = 8,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        Text(
            text = "Tap to flip",
            color = Color(0xFF666666),
            fontSize = 11.sp,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
    }
}
