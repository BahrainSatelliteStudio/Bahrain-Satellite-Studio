package com.dream.wowiptv.presentation.common.components

import androidx.compose.foundation.background
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.dream.wowiptv.R
import com.dream.wowiptv.presentation.common.theme.LiveRed
import com.dream.wowiptv.presentation.common.theme.LocalAccentPalette

fun posterContentScaleFromKey(key: String): ContentScale = when (key) {
    "fit" -> ContentScale.Fit
    "inside" -> ContentScale.Inside
    "fill_width" -> ContentScale.FillWidth
    "fill_height" -> ContentScale.FillHeight
    else -> ContentScale.Crop
}

private fun showsSideGlow(contentScale: ContentScale): Boolean =
    contentScale != ContentScale.Crop && contentScale != ContentScale.FillBounds

@Composable
fun DetailPosterHeader(
    model: Any?,
    contentDescription: String,
    contentScale: ContentScale,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    height: androidx.compose.ui.unit.Dp = 320.dp,
    isFavorite: Boolean = false,
    onToggleFavorite: (() -> Unit)? = null,
    subtitle: String? = null,
    rating: String? = null,
    year: String? = null,
    genres: String? = null,
    plot: String? = null,
) {
    var showPosterCard by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
    ) {
        AsyncImage(
            model = model,
            contentDescription = contentDescription,
            modifier = Modifier
                .fillMaxSize()
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null
                ) { showPosterCard = true },
            contentScale = contentScale
        )

        if (showPosterCard) {
            Dialog(
                onDismissRequest = { showPosterCard = false },
                properties = DialogProperties(usePlatformDefaultWidth = false)
            ) {
                FlippablePosterCard(
                    posterUrl = model?.toString(),
                    title = contentDescription,
                    onDismiss = { showPosterCard = false },
                    subtitle = subtitle,
                    rating = rating,
                    year = year,
                    genres = genres,
                    plot = plot
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(140.dp)
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Black.copy(alpha = 0.7f), Color.Transparent)
                    )
                )
        )
        if (showsSideGlow(contentScale)) {
            val accent = LocalAccentPalette.current
            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .fillMaxHeight()
                    .width(120.dp)
                    .background(
                        Brush.horizontalGradient(
                            listOf(
                                accent.vibrant.copy(alpha = 0.38f),
                                accent.vibrant.copy(alpha = 0.10f),
                                Color.Transparent
                            )
                        )
                    )
            )
            Box(
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .fillMaxHeight()
                    .width(120.dp)
                    .background(
                        Brush.horizontalGradient(
                            listOf(
                                Color.Transparent,
                                accent.vibrant.copy(alpha = 0.10f),
                                accent.vibrant.copy(alpha = 0.45f)
                            )
                        )
                    )
            )
        }
        Row(
            modifier = Modifier
                .statusBarsPadding()
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White
                )
            }
            Spacer(modifier = Modifier.weight(1f))
            if (onToggleFavorite != null) {
                val ctx = LocalContext.current
                IconButton(onClick = onToggleFavorite) {
                    Icon(
                        imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                        contentDescription = ctx.getString(if (isFavorite) R.string.common_cancel_favorite else R.string.common_favorite),
                        tint = if (isFavorite) LiveRed else Color.White
                    )
                }
            }
        }
    }
}