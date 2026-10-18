package com.dream.wowiptv.presentation.search

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.dream.wowiptv.R
import com.dream.wowiptv.data.local.entity.LiveStreamEntity
import com.dream.wowiptv.data.local.entity.SeriesEntity
import com.dream.wowiptv.data.local.entity.VodStreamEntity
import com.dream.wowiptv.presentation.common.LiveDot
import com.dream.wowiptv.presentation.common.components.EmptyState
import com.dream.wowiptv.presentation.common.components.GradientBackground
import com.dream.wowiptv.presentation.common.components.SearchField
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme
import com.dream.wowiptv.presentation.common.theme.LocalAccentPalette

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GlobalSearchScreen(
    onBack: () -> Unit,
    onMovieClick: (Int) -> Unit,
    onSeriesClick: (Int) -> Unit,
    onLiveClick: (Int, String) -> Unit,
    viewModel: GlobalSearchViewModel = hiltViewModel()
) {
    val query by viewModel.query.collectAsState()
    val results by viewModel.results.collectAsState()

    LaunchedEffect(Unit) { viewModel.load() }

    MaterialTheme(colorScheme = DarkColorScheme) {
        GradientBackground {
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = {
                            SearchField(
                                value = query,
                                onValueChange = viewModel::setQuery,
                                modifier = Modifier.fillMaxWidth()
                            )
                        },
                        navigationIcon = {
                            IconButton(onClick = onBack) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.common_back), tint = Color.White)
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
                    )
                },
                containerColor = Color.Transparent
            ) { innerPadding ->
                val isEmpty = query.isBlank() || (results.live.isEmpty() && results.movies.isEmpty() && results.series.isEmpty())
                if (isEmpty) {
                    EmptyState(
                        text = if (query.isBlank()) stringResource(R.string.common_search) else stringResource(R.string.common_empty),
                        modifier = Modifier.fillMaxSize().padding(innerPadding)
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(innerPadding),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 8.dp)
                    ) {
                        if (results.live.isNotEmpty()) {
                            item { SectionTitle(stringResource(R.string.nav_live)) }
                            items(results.live, key = { "live_${it.streamId}" }) { stream ->
                                ResultRow(
                                    icon = stream.streamIcon,
                                    name = stream.name,
                                    badge = "LIVE",
                                    isLive = true,
                                    onClick = { onLiveClick(stream.streamId, stream.name) }
                                )
                            }
                        }
                        if (results.movies.isNotEmpty()) {
                            item { SectionTitle(stringResource(R.string.nav_movies)) }
                            items(results.movies, key = { "vod_${it.streamId}" }) { vod ->
                                ResultRow(
                                    icon = vod.streamIcon,
                                    name = vod.name.orEmpty(),
                                    badge = "MOVIE",
                                    onClick = { onMovieClick(vod.streamId) }
                                )
                            }
                        }
                        if (results.series.isNotEmpty()) {
                            item { SectionTitle(stringResource(R.string.nav_series)) }
                            items(results.series, key = { "series_${it.seriesId}" }) { series ->
                                ResultRow(
                                    icon = series.cover,
                                    name = series.name.orEmpty(),
                                    badge = "SERIES",
                                    onClick = { onSeriesClick(series.seriesId) }
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
private fun SectionTitle(title: String) {
    val accent = LocalAccentPalette.current
    Text(
        text = title,
        color = accent.vibrant,
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
    )
}

@Composable
private fun ResultRow(icon: String?, name: String, badge: String, isLive: Boolean = false, onClick: () -> Unit) {
    val accent = LocalAccentPalette.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(Color(0xFF2D2D3A)),
            contentAlignment = Alignment.Center
        ) {
            if (!icon.isNullOrEmpty()) {
                AsyncImage(
                    model = icon,
                    contentDescription = name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            } else {
                Text(
                    text = name.firstOrNull()?.uppercase() ?: "?",
                    color = accent.vibrant,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = name,
            color = Color.White,
            fontSize = 14.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (isLive) {
                LiveDot(size = 5.dp)
                Spacer(modifier = Modifier.width(4.dp))
            }
            Text(
                text = badge,
                color = Color(0xFF999999),
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
