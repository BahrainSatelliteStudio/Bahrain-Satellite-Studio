package com.dream.wowiptv.presentation.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
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
import com.dream.wowiptv.data.local.entity.FavoriteStreamEntity
import com.dream.wowiptv.data.local.entity.FavoriteVodEntity
import com.dream.wowiptv.presentation.common.components.GradientBackground
import com.dream.wowiptv.presentation.common.components.EmptyState
import com.dream.wowiptv.presentation.common.rememberIsTablet
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AllFavoritesScreen(
    viewModel: HomeViewModel = hiltViewModel(),
    onBack: () -> Unit,
    onMovieClick: (Int) -> Unit,
    onSeriesClick: (Int) -> Unit,
    onLiveClick: (Int, String) -> Unit
) {
    val data by viewModel.data.collectAsState()

    MaterialTheme(colorScheme = DarkColorScheme) {
        GradientBackground {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text(stringResource(R.string.home_my_favorites), color = Color.White) },
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
            val items = data.favoriteStreams + data.favoriteMovies + data.favoriteSeries
            if (items.isEmpty()) {
                EmptyState(text = stringResource(R.string.home_no_favorites), modifier = Modifier.fillMaxSize().padding(innerPadding))
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(if (rememberIsTablet()) 8 else 3),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    contentPadding = PaddingValues(12.dp),
                    modifier = Modifier.fillMaxSize().padding(innerPadding)
                ) {
                    items(items, key = { it.hashCode() }) { item ->
                        when (item) {
                            is FavoriteStreamEntity -> {
                            val catName = data.liveCategoryNames[item.categoryId]
                            FavGridCell(
                                name = item.name,
                                icon = item.iconUrl,
                                badge = "LIVE",
                                categoryName = catName,
                                onClick = { onLiveClick(item.streamId, item.name) },
                                onRemove = { viewModel.removeFavorite(item) }
                            )
                        }
                            is FavoriteVodEntity -> {
                                val badge = if (item.type == "movie") "MOVIE" else "SERIES"
                                val catName = if (item.type == "movie") data.vodCategoryNames[item.categoryId] else data.seriesCategoryNames[item.categoryId]
                                FavGridCell(
                                    name = item.name,
                                    icon = item.icon,
                                    badge = badge,
                                    categoryName = catName,
                                    onClick = {
                                        if (item.type == "movie") onMovieClick(item.vodId) else onSeriesClick(item.vodId)
                                    },
                                    onRemove = { viewModel.removeFavorite(item) }
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

@Composable
private fun FavGridCell(name: String, icon: String? = null, badge: String? = null, categoryName: String? = null, onClick: () -> Unit = {}, onRemove: () -> Unit = {}) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(2f / 3f)
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0xFF2D2D3A))
            .clickable(onClick = onClick)
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
        if (!badge.isNullOrEmpty()) {
            Box(modifier = Modifier.align(Alignment.TopStart)) {
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
                        if (badge == "LIVE") {
                            Box(
                                modifier = Modifier
                                    .size(5.dp)
                                    .background(Color(0xFFEF4444), RoundedCornerShape(2.5.dp))
                            )
                        }
                        Text(
                            text = badge,
                            color = Color.White,
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp
                        )
                    }
                }
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
                .padding(horizontal = 6.dp, vertical = 2.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            Column {
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
