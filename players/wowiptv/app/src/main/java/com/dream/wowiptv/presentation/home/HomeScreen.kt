package com.dream.wowiptv.presentation.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.PlaylistPlay
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.dream.wowiptv.R
import com.dream.wowiptv.data.local.entity.FavoriteStreamEntity
import com.dream.wowiptv.data.local.entity.FavoriteVodEntity
import com.dream.wowiptv.data.local.entity.LiveStreamEntity
import com.dream.wowiptv.data.local.entity.SeriesEntity
import com.dream.wowiptv.data.local.entity.VodStreamEntity
import com.dream.wowiptv.data.local.entity.WatchProgressEntity
import com.dream.wowiptv.presentation.common.LiveDot
import com.dream.wowiptv.presentation.common.components.GradientBackground
import com.dream.wowiptv.presentation.common.components.EmptyState
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme
import com.dream.wowiptv.presentation.common.theme.LocalAccentPalette
import com.dream.wowiptv.presentation.common.SourceTypeViewModel
import com.dream.wowiptv.presentation.common.rememberIsTablet
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: HomeViewModel = hiltViewModel(),
    onMovieClick: (Int) -> Unit,
    onSeriesClick: (Int) -> Unit,
    onLiveClick: (Int, String) -> Unit,
    onViewAllFavorites: () -> Unit,
    onViewAllRecent: () -> Unit,
    onViewAllHistory: () -> Unit,
    onOpenLive: () -> Unit = {},
    onOpenMovies: () -> Unit = {},
    onOpenSeries: () -> Unit = {},
    onOpenSearch: () -> Unit = {}
) {
    val data by viewModel.data.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val showContinue by viewModel.showContinueWatching.collectAsState()
    val showFavs by viewModel.showFavorites.collectAsState()
    val showRecentSection by viewModel.showRecent.collectAsState()
    val sourceTypeViewModel: SourceTypeViewModel = hiltViewModel()
    val sourceType by sourceTypeViewModel.sourceType.collectAsState()

    val accent = LocalAccentPalette.current

    MaterialTheme(colorScheme = DarkColorScheme) {
        GradientBackground {
            Column(modifier = Modifier.fillMaxSize()) {
                if (!rememberIsTablet()) {
                TopAppBar(
                    title = {
                        Text(
                            text = "WowIPTV",
                            style = TextStyle(
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                brush = Brush.linearGradient(listOf(accent.light, accent.dark))
                            )
                        )
                    },
                    actions = {
                        IconButton(onClick = onOpenSearch) {
                            Icon(
                                Icons.Default.Search,
                                contentDescription = stringResource(R.string.common_search),
                                tint = Color.White
                            )
                        }
                        if (data.username.isNotBlank()) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(Color(0xFF2D2D3A))
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Icon(
                                    Icons.Default.Star,
                                    contentDescription = null,
                                    tint = Color(0xFFFFD700),
                                    modifier = Modifier.size(12.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = data.username,
                                    color = Color(0xFFDDDDDD),
                                    fontSize = 11.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.widthIn(max = 96.dp)
                                )
                            }
                        }
                    },
                    windowInsets = WindowInsets.statusBars,
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = Color.White
                    )
                )
                }
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.TopCenter
            ) {
                PullToRefreshBox(
                    isRefreshing = isRefreshing,
                    onRefresh = { viewModel.refresh() },
                    modifier = Modifier
                        .fillMaxSize()
                        .widthIn(max = 1000.dp)
                ) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    item {
                        if (sourceType == "m3u") {
                            StatCard(icon = Icons.Filled.LiveTv, count = data.liveCount, label = stringResource(R.string.home_channels), color = Color(0xFFEF4444), modifier = Modifier.fillMaxWidth(), onClick = onOpenLive)
                        } else {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                StatCard(icon = Icons.Filled.LiveTv, count = data.liveCount, label = stringResource(R.string.home_channels), color = Color(0xFFEF4444), modifier = Modifier.weight(1f), onClick = onOpenLive)
                                StatCard(icon = Icons.Filled.Movie, count = data.movieCount, label = stringResource(R.string.home_movies), color = accent.light, modifier = Modifier.weight(1f), onClick = onOpenMovies)
                                StatCard(icon = Icons.AutoMirrored.Filled.PlaylistPlay, count = data.seriesCount, label = stringResource(R.string.home_series), color = accent.dark, modifier = Modifier.weight(1f), onClick = onOpenSeries)
                            }
                        }
                    }

                    item { Spacer(modifier = Modifier.height(8.dp)) }

                if (showContinue && data.continueWatching.isNotEmpty()) {
                    item {
                        Column {
                            SectionHeader(title = stringResource(R.string.home_continue_watching), onViewAll = onViewAllHistory)
                            Spacer(modifier = Modifier.height(16.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                items(data.continueWatching, key = { it.contentId }) { wp ->
                                    val badgeLabel = when (wp.contentType) {
                                        "vod" -> "MOVIE"
                                        "series" -> "SERIES"
                                        "live" -> "LIVE"
                                        else -> ""
                                    }
                                    val continueRating = when (wp.contentType) {
                                        "vod" -> data.vodRating[wp.contentId.removePrefix("vod_").toIntOrNull()]
                                        "series" -> data.seriesRating[wp.contentId.removePrefix("series_").toIntOrNull()]
                                        else -> null
                                    }
                                    ContinueCard(
                                        name = decodeName(wp.name),
                                        icon = wp.icon,
                                        badge = badgeLabel,
                                        categoryName = data.continueCategoryNames[wp.contentId],
                                        position = wp.position,
                                        duration = wp.duration,
                                        rating = continueRating,
                                        onClick = {
                                            val idStr = wp.contentId.removePrefix("vod_").removePrefix("series_").removePrefix("live_")
                                            when (wp.contentType) {
                                                "vod" -> idStr.toIntOrNull()?.let { onMovieClick(it) }
                                                "series" -> idStr.toIntOrNull()?.let { onSeriesClick(it) }
                                                "live" -> idStr.toIntOrNull()?.let { onLiveClick(it, wp.name) }
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }

                if (showFavs) {
                    item {
                        Column {
                            SectionHeader(title = stringResource(R.string.home_favorites), onViewAll = onViewAllFavorites)
                            Spacer(modifier = Modifier.height(16.dp))
                            val items = data.favoriteStreams + data.favoriteMovies + data.favoriteSeries
                            if (items.isEmpty()) {
                                EmptyState(
                                    text = stringResource(R.string.home_no_favorites),
                                    modifier = Modifier.padding(vertical = 16.dp),
                                    compact = true
                                )
                            } else {
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                    items(items.take(10), key = { it.hashCode() }) { item ->
                                        when (item) {
                                            is FavoriteStreamEntity -> {
                                                val catName = data.liveCategoryNames[item.categoryId]
                                                FavCard(name = item.name, icon = item.iconUrl, badge = "LIVE", categoryName = catName, onClick = { onLiveClick(item.streamId, item.name) }, onRemove = { viewModel.removeFavorite(item) })
                                            }
                                             is FavoriteVodEntity -> {
                                                 val catName = if (item.type == "movie") {
                                                     data.vodCategoryNames[item.categoryId]
                                                 } else {
                                                     data.seriesIdToCategoryName[item.vodId]
                                                 }
                                                 val badge = if (item.type == "movie") "MOVIE" else "SERIES"
                                                val favRating = if (item.type == "movie") data.vodRating[item.vodId] else data.seriesRating[item.vodId]
                                                FavCard(name = item.name, icon = item.icon, badge = badge, categoryName = catName, rating = favRating, onClick = {
                                                    if (item.type == "movie") onMovieClick(item.vodId) else onSeriesClick(item.vodId)
                                                }, onRemove = { viewModel.removeFavorite(item) })
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(8.dp)) }

                if (showRecentSection) {
                    item {
                        Column {
                            SectionHeader(title = stringResource(R.string.home_recent), onViewAll = onViewAllRecent)
                            Spacer(modifier = Modifier.height(16.dp))
                            val all = data.recentItems.take(10)
                            if (all.isEmpty()) {
                                Text(stringResource(R.string.home_no_content), color = Color(0xFF888888), modifier = Modifier.padding(vertical = 16.dp))
                            } else {
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                                    items(all, key = { it.hashCode() }) { item ->
                                        when (item) {
                                            is RecentItem.Live -> {
                                                val catName = data.liveCategoryNames[item.entity.categoryId]
                                                RecentCard(name = item.entity.name, icon = item.entity.streamIcon, badge = "LIVE", categoryName = catName, onClick = { onLiveClick(item.entity.streamId, item.entity.name) })
                                            }
                                            is RecentItem.Movie -> {
                                                val catName = data.vodCategoryNames[item.entity.categoryId]
                                                RecentCard(name = item.entity.name.orEmpty(), icon = item.entity.streamIcon, badge = "MOVIE", categoryName = catName, rating = item.entity.rating, onClick = { onMovieClick(item.entity.streamId) })
                                            }
                                            is RecentItem.Series -> {
                                                val catName = data.seriesCategoryNames[item.entity.categoryId]
                                                RecentCard(name = item.entity.name.orEmpty(), icon = item.entity.cover, badge = "SERIES", categoryName = catName, rating = item.entity.rating, onClick = { onSeriesClick(item.entity.seriesId) })
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
                }
        }
        }
    }
    }
}

private fun decodeName(raw: String): String {
    return try { java.net.URLDecoder.decode(raw, "UTF-8") } catch (_: Exception) { raw }
}

private fun formatRating(raw: String?): String? {
    if (raw.isNullOrBlank()) return null
    val d = raw.trim().substringBefore(" ").toDoubleOrNull() ?: return null
    if (d <= 0) return null
    return if (d % 1.0 == 0.0) d.toInt().toString() else "%.1f".format(d)
}

@Composable
private fun StatCard(icon: ImageVector, count: Int, label: String, color: Color, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    Card(
        modifier = modifier.then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = BorderStroke(1.dp, Color(0xFF3A3A4A))
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        listOf(color.copy(alpha = 0.16f), Color(0xFF26242E))
                    )
                )
                .padding(horizontal = 10.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(34.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(color.copy(alpha = 0.18f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = color,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.weight(1f))
                Column(horizontalAlignment = Alignment.End) {
                    CountUpText(target = count)
                Text(
                    text = label,
                    color = Color(0xFF999999),
                        fontSize = 11.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun CountUpText(target: Int, durationMillis: Int = 800) {
    var displayed by remember(target) { mutableIntStateOf(0) }
    LaunchedEffect(target) {
        val start = System.currentTimeMillis()
        while (true) {
            val elapsed = System.currentTimeMillis() - start
            val progress = (elapsed / durationMillis.toFloat()).coerceIn(0f, 1f)
            displayed = (target * progress).toInt()
            if (progress >= 1f) break
            delay(16)
        }
        displayed = target
    }
    Text(
        text = displayed.toString(),
        color = Color.White,
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp
    )
}

@Composable
private fun SectionHeader(title: String, onViewAll: (() -> Unit)? = null) {
    val accent = LocalAccentPalette.current
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(width = 4.dp, height = 16.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(
                        Brush.verticalGradient(listOf(accent.light, accent.dark))
                    )
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = title,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
        }
        if (onViewAll != null) {
            Row(
                modifier = Modifier.clickable(onClick = onViewAll),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                Text(
                    text = stringResource(R.string.home_view_all),
                    color = accent.vibrant,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "›",
                    color = accent.vibrant,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun TypeBadge(text: String) {
    Box(
        modifier = Modifier
            .padding(start = 4.dp, top = 4.dp)
            .background(Color(0xFF000000).copy(alpha = 0.55f), RoundedCornerShape(3.dp))
            .padding(horizontal = 4.dp, vertical = 1.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(3.dp)
        ) {
            if (text == "LIVE") {
                LiveDot(size = 5.dp)
            }
            Text(
                text = text,
                color = Color.White,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp
            )
        }
    }
}

@Composable
private fun MediaCard(name: String, icon: String? = null, badge: String? = null, categoryName: String? = null, rating: String? = null, onClick: () -> Unit = {}, onRemove: (() -> Unit)? = null) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val cardScale by animateFloatAsState(if (isPressed) 0.97f else 1f, label = "cardScale")
    Box(
        modifier = Modifier
            .width(110.dp)
            .aspectRatio(2f / 3f)
            .graphicsLayer { scaleX = cardScale; scaleY = cardScale }
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF2D2D3A))
            .border(1.dp, Color(0xFF3A3A4A), RoundedCornerShape(12.dp))
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
    ) {
        if (!icon.isNullOrEmpty()) {
            AsyncImage(
                model = icon,
                contentDescription = name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit
            )
        } else {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Icon(
                    Icons.Default.Movie,
                    contentDescription = null,
                    tint = Color(0xFF666666).copy(alpha = 0.5f),
                    modifier = Modifier.size(36.dp)
                )
            }
        }
        if (!badge.isNullOrEmpty()) {
            Box(modifier = Modifier.align(Alignment.TopStart)) {
                TypeBadge(text = badge)
            }
        }
        if (onRemove != null) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 4.dp, end = 4.dp)
                    .size(22.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(Color(0xCC000000))
                    .clickable(onClick = onRemove),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = stringResource(R.string.settings_delete),
                    tint = Color.White,
                    modifier = Modifier.size(14.dp)
                )
            }
        }
        Box(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .background(
                    brush = Brush.verticalGradient(
                        listOf(
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.7f),
                            Color.Black.copy(alpha = 0.85f)
                        )
                    )
                )
                .padding(horizontal = 6.dp, vertical = 1.dp),
            contentAlignment = Alignment.TopStart
        ) {
                    Column {
                        val formattedRating = formatRating(rating)
                        if (formattedRating != null) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Filled.Star,
                                    contentDescription = null,
                                    tint = Color(0xFFFFD700),
                                    modifier = Modifier.size(9.dp)
                                )
                                Spacer(modifier = Modifier.width(2.dp))
                                Text(
                                    text = formattedRating,
                                    color = Color(0xFFFFD700),
                                    fontSize = 8.sp,
                                    fontWeight = FontWeight.Bold,
                                    lineHeight = 8.sp
                                )
                            }
                        }
                        Text(
                            text = name,
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        if (!categoryName.isNullOrEmpty()) {
                            Text(
                                text = categoryName,
                                color = Color(0xFF999999),
                                fontSize = 8.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                lineHeight = 8.sp,
                                modifier = Modifier.padding(bottom = 2.dp)
                            )
                        }
                    }
            }
        }
    }

@Composable
private fun FavCard(name: String, icon: String? = null, badge: String? = null, categoryName: String? = null, rating: String? = null, onClick: () -> Unit = {}, onRemove: (() -> Unit)? = null) {
    MediaCard(name, icon, badge, categoryName, rating, onClick, onRemove)
}

@Composable
private fun ContinueCard(name: String, icon: String? = null, badge: String? = null, categoryName: String? = null, position: Long = 0L, duration: Long = 0L, rating: String? = null, onClick: () -> Unit = {}) {
    val accent = LocalAccentPalette.current
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val cardScale by animateFloatAsState(if (isPressed) 0.97f else 1f, label = "cardScale")
    Box(
        modifier = Modifier
            .width(110.dp)
            .aspectRatio(2f / 3f)
            .graphicsLayer { scaleX = cardScale; scaleY = cardScale }
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF2D2D3A))
            .border(1.dp, Color(0xFF3A3A4A), RoundedCornerShape(12.dp))
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
    ) {
        if (!icon.isNullOrEmpty()) {
            AsyncImage(
                model = icon,
                contentDescription = name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit
            )
        } else {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Icon(
                    Icons.Default.Movie,
                    contentDescription = null,
                    tint = Color(0xFF666666).copy(alpha = 0.5f),
                    modifier = Modifier.size(36.dp)
                )
            }
        }
        if (!badge.isNullOrEmpty()) {
            Box(modifier = Modifier.align(Alignment.TopStart)) {
                TypeBadge(text = badge)
            }
        }
        Box(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
        ) {
            Column {
                val formattedRating = formatRating(rating)
                if (duration > 0) {
                    if (formattedRating != null) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Filled.Star,
                                contentDescription = null,
                                tint = Color(0xFFFFD700),
                                modifier = Modifier.size(9.dp)
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                            Text(
                                text = formattedRating,
                                color = Color(0xFFFFD700),
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                lineHeight = 8.sp
                            )
                        }
                    }
                    val p = (position.toFloat() / duration.toFloat()).coerceIn(0f, 1f)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(3.dp)
                            .background(Color(0xFF555555).copy(alpha = 0.5f))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(p)
                                .background(accent.primary)
                        )
                    }
                }
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            brush = Brush.verticalGradient(
                                listOf(
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.7f),
                                    Color.Black.copy(alpha = 0.85f)
                                )
                            )
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Column {
                        if (formattedRating != null && duration <= 0) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Filled.Star,
                                    contentDescription = null,
                                    tint = Color(0xFFFFD700),
                                    modifier = Modifier.size(9.dp)
                                )
                                Spacer(modifier = Modifier.width(2.dp))
                                Text(
                                    text = formattedRating,
                                    color = Color(0xFFFFD700),
                                    fontSize = 8.sp,
                                    fontWeight = FontWeight.Bold,
                                    lineHeight = 8.sp
                                )
                            }
                        }
                        Text(
                            text = name,
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        if (!categoryName.isNullOrEmpty()) {
                            Text(
                                text = categoryName,
                                color = Color(0xFF999999),
                                fontSize = 8.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                lineHeight = 8.sp,
                                modifier = Modifier.padding(bottom = 2.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RecentCard(name: String, icon: String? = null, badge: String? = null, categoryName: String? = null, rating: String? = null, onClick: () -> Unit = {}) {
    MediaCard(name, icon, badge, categoryName, rating, onClick)
}
