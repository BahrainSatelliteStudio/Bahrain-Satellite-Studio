package com.dream.wowiptv.presentation.movies

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.dream.wowiptv.R
import com.dream.wowiptv.domain.model.VodCategory
import com.dream.wowiptv.domain.model.VodStream
import com.dream.wowiptv.presentation.common.SortMode
import com.dream.wowiptv.presentation.common.UiState
import com.dream.wowiptv.presentation.common.applySort
import com.dream.wowiptv.presentation.common.rememberIsTablet
import com.dream.wowiptv.presentation.common.effectiveGridColumns
import com.dream.wowiptv.presentation.common.components.ContentToolbar
import com.dream.wowiptv.presentation.common.components.GradientBackground
import com.dream.wowiptv.presentation.common.components.CategoryLockDialog
import com.dream.wowiptv.presentation.common.components.EmptyState
import com.dream.wowiptv.presentation.common.components.ErrorView
import com.dream.wowiptv.presentation.common.components.LoadingIndicator
import com.dream.wowiptv.presentation.common.components.SearchField
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme
import com.dream.wowiptv.presentation.common.theme.LiveRed

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoviesScreen(
    viewModel: MoviesViewModel = hiltViewModel(),
    onMovieClick: (Int) -> Unit
) {
    val categoriesState by viewModel.categories.collectAsState()
    val selectedCategoryId by viewModel.selectedCategoryId.collectAsState()
    val streamsState by viewModel.streams.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val categoryCounts by viewModel.categoryCounts.collectAsState()
    val movieFavoriteIds by viewModel.favoriteIds.collectAsState()
    val gridColumns by viewModel.gridColumns.collectAsState()
    val lockedCategories by viewModel.lockedCategories.collectAsState()
    val unlockedCategories by viewModel.unlockedCategories.collectAsState()
    val pendingLockedCategory by viewModel.pendingLockedCategory.collectAsState()
    var isRefreshing by remember { mutableStateOf(false) }
    val isTablet = rememberIsTablet()
    var sortMode by remember { mutableStateOf(SortMode.AZ) }

    fun onCategorySelected(id: Int?) {
        viewModel.selectCategory(id)
        if (viewModel.pendingLockedCategory.value == null) {
            viewModel.setSearchQuery("")
        }
    }

    LaunchedEffect(streamsState) {
        if (streamsState !is UiState.Loading) {
            isRefreshing = false
        }
    }

    MaterialTheme(colorScheme = DarkColorScheme) {
        GradientBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            if (!isTablet) {
                TopAppBar(
                    title = {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Text(stringResource(R.string.movies_title), color = Color.White)
                            SearchField(
                                value = searchQuery,
                                onValueChange = { viewModel.setSearchQuery(it) },
                                modifier = Modifier.weight(1f).padding(end = 12.dp)
                            )
                        }
                    },
                    windowInsets = WindowInsets.statusBars,
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = Color.White
                    )
                )
            } else {
                Text(
                    text = stringResource(R.string.movies_title),
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier.padding(start = 16.dp, top = 12.dp)
                )
            }
            val movieCats = (categoriesState as? UiState.Success)?.data.orEmpty()
            val selectedMovCatName = selectedCategoryId?.let { id ->
                movieCats.find { it.id == id }?.name?.let { "$it (${categoryCounts[id] ?: 0})" }
            } ?: stringResource(R.string.movies_all, categoryCounts.values.sum())
            ContentToolbar(
                categories = movieCats,
                categoryId = { it.id },
                categoryName = { it.name },
                selectedCategoryId = selectedCategoryId,
                selectedCategoryName = selectedMovCatName,
                categoryCounts = categoryCounts,
                lockedCategoryIds = lockedCategories,
                unlockedCategoryIds = unlockedCategories,
                allLabel = stringResource(R.string.movies_all, categoryCounts.values.sum()),
                onCategorySelected = { id -> onCategorySelected(id) },
                sortMode = sortMode,
                sortLabel = stringResource(sortMode.labelRes),
                onSortModeChange = { sortMode = it },
                showSearch = isTablet,
                searchQuery = searchQuery,
                onSearchQueryChange = { viewModel.setSearchQuery(it) },
                modifier = Modifier.fillMaxWidth()
            )

            Box(modifier = Modifier.weight(1f)) {
                val displayData = when (val s = streamsState) {
                is UiState.Success -> {
                    var data = s.data
                    if (searchQuery.isNotBlank()) {
                        data = data.filter { it.name.contains(searchQuery, ignoreCase = true) }
                    }
                    UiState.Success(if (isTablet) applySort(data, sortMode, { it.name }, { it.added }) else data)
                }
                else -> s
            }
                when (val streams = displayData) {
                    is UiState.Loading -> {
                        if (!isRefreshing) {
                            LoadingIndicator()
                        }
                    }
                    is UiState.Error -> {
                        ErrorView(
                            message = streams.message,
                            onRetry = { viewModel.refresh() }
                        )
                    }
                    is UiState.Empty -> {
                        EmptyState(
                            text = stringResource(R.string.movies_empty),
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                    is UiState.Success -> {
                        if (streams.data.isEmpty()) {
                            EmptyState(
                                text = if (searchQuery.isNotBlank()) stringResource(R.string.movies_not_found) else stringResource(R.string.movies_empty),
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            PullToRefreshBox(
                                isRefreshing = isRefreshing,
                                onRefresh = {
                                    isRefreshing = true
                                    viewModel.refresh()
                                },
                                modifier = Modifier.fillMaxSize()
                            ) {
                                LazyVerticalGrid(
                                    columns = GridCells.Fixed(effectiveGridColumns(gridColumns, isTablet)),
                                    modifier = Modifier.fillMaxSize(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                                ) {
                                    items(streams.data, key = { it.id }) { stream ->
                                        val catMap = (categoriesState as? UiState.Success)?.data?.associate { it.id to it.name }.orEmpty()
                                        MoviePoster(
                                            stream = stream,
                                            onClick = { onMovieClick(stream.id) },
                                            isFavorite = movieFavoriteIds.contains(stream.id),
                                            onToggleFavorite = { viewModel.toggleFavorite(stream.id, stream.name, stream.icon, stream.categoryId) },
                                            categoryName = catMap[stream.categoryId]
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        pendingLockedCategory?.let { lockedId ->
            val lockedName = (categoriesState as? UiState.Success)?.data?.find { it.id == lockedId }?.name
                ?: stringResource(R.string.common_locked)
            CategoryLockDialog(
                categoryName = lockedName,
                onDismiss = { viewModel.dismissCategoryLock() },
                onVerifyPassword = { viewModel.confirmCategoryLock(it) }
            )
        }
        }
    }
}

@Composable
private fun MoviePoster(
    stream: VodStream,
    onClick: () -> Unit,
    isFavorite: Boolean,
    onToggleFavorite: () -> Unit,
    categoryName: String? = null,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Box(modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f)) {
            AsyncImage(
                model = stream.icon,
                contentDescription = stream.name,
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(12.dp)),
                contentScale = ContentScale.Crop
            )
            IconButton(
                onClick = onToggleFavorite,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(0.dp)
                    .size(28.dp)
            ) {
                Icon(
                    imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                    contentDescription = if (isFavorite) stringResource(R.string.common_cancel_favorite) else stringResource(R.string.common_favorite),
                    tint = if (isFavorite) LiveRed else Color.White.copy(alpha = 0.7f),
                    modifier = Modifier.size(18.dp)
                )
            }
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
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
                    .padding(horizontal = 6.dp, vertical = 4.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                Column {
                    val formattedRating = formatRating(stream.rating)
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
                        text = stream.name,
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

private fun formatRating(raw: Double?): String? {
    if (raw == null || raw <= 0) return null
    return if (raw % 1.0 == 0.0) raw.toInt().toString() else "%.1f".format(raw)
}
