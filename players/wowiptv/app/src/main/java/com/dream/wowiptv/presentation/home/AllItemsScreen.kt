package com.dream.wowiptv.presentation.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
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
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.dream.wowiptv.presentation.common.components.GradientBackground
import com.dream.wowiptv.presentation.common.components.EmptyState
import com.dream.wowiptv.presentation.common.rememberIsTablet
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme
import com.dream.wowiptv.presentation.common.SourceTypeViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AllItemsScreen(
    initialTab: Int = 0,
    viewModel: HomeViewModel = hiltViewModel(),
    onBack: () -> Unit,
    onMovieClick: (Int) -> Unit,
    onSeriesClick: (Int) -> Unit,
    onLiveClick: (Int, String) -> Unit = { _, _ -> }
) {
    val data by viewModel.data.collectAsState()
    var tab by remember { mutableIntStateOf(initialTab) }
    val sourceTypeViewModel: SourceTypeViewModel = hiltViewModel()
    val sourceType by sourceTypeViewModel.sourceType.collectAsState()
    val tabs = listOf(R.string.home_tab_all, R.string.home_tab_live, R.string.home_tab_movies, R.string.home_tab_series)

    MaterialTheme(colorScheme = DarkColorScheme) {
        GradientBackground {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text(stringResource(R.string.home_recent), color = Color.White) },
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
            val items: List<RecentItem> = if (sourceType == "m3u") {
                data.recentItems.filterIsInstance<RecentItem.Live>()
            } else {
                when (tab) {
                    1 -> data.recentItems.filterIsInstance<RecentItem.Live>()
                    2 -> data.recentItems.filterIsInstance<RecentItem.Movie>()
                    3 -> data.recentItems.filterIsInstance<RecentItem.Series>()
                    else -> data.recentItems
                }
            }.take(50)

            LazyVerticalGrid(
                columns = GridCells.Fixed(if (rememberIsTablet()) 8 else 3),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 12.dp),
                contentPadding = PaddingValues(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                if (sourceType != "m3u") {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            tabs.forEachIndexed { idx, label ->
                                FilterChip(
                                    selected = tab == idx,
                                    onClick = { tab = idx },
                                    label = { Text(stringResource(label), fontSize = 13.sp) }
                                )
                            }
                        }
                    }
                }

                if (items.isEmpty()) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        EmptyState(
                            text = stringResource(R.string.common_empty),
                            modifier = Modifier.padding(vertical = 48.dp)
                        )
                    }
                } else {
                    items(items, key = { it.hashCode() }) { item ->
                        when (item) {
                            is RecentItem.Live -> {
                                val catName = data.liveCategoryNames[item.entity.categoryId]
                                GridCell(
                                    icon = item.entity.streamIcon,
                                    name = item.entity.name,
                                    badge = "LIVE",
                                    categoryName = catName,
                                    onClick = { onLiveClick(item.entity.streamId, item.entity.name) }
                                )
                            }
                            is RecentItem.Movie -> {
                                val catName = data.vodCategoryNames[item.entity.categoryId]
                                GridCell(
                                    icon = item.entity.streamIcon,
                                    name = item.entity.name.orEmpty(),
                                    badge = "MOVIE",
                                    categoryName = catName,
                                    onClick = { onMovieClick(item.entity.streamId) }
                                )
                            }
                            is RecentItem.Series -> {
                                val catName = data.seriesCategoryNames[item.entity.categoryId]
                                GridCell(
                                    icon = item.entity.cover,
                                    name = item.entity.name.orEmpty(),
                                    badge = "SERIES",
                                    categoryName = catName,
                                    onClick = { onSeriesClick(item.entity.seriesId) }
                                )
                            }
                        }
                    }
                }
                item(span = { GridItemSpan(maxLineSpan) }) {
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
    }
    }
}

@Composable
private fun GridCell(icon: String? = null, name: String, badge: String? = null, categoryName: String? = null, onClick: () -> Unit = {}) {
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
