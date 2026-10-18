package com.dream.wowiptv.presentation.movies

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import com.dream.wowiptv.R
import coil.compose.AsyncImage
import com.dream.wowiptv.data.local.AppPreferences
import com.dream.wowiptv.domain.model.VodInfo
import com.dream.wowiptv.domain.repository.TmdbRepository
import com.dream.wowiptv.domain.usecase.CreateFavoriteUseCase
import com.dream.wowiptv.domain.usecase.GetVodInfoUseCase
import com.dream.wowiptv.domain.usecase.WatchProgressUseCase
import com.dream.wowiptv.presentation.common.UiState
import com.dream.wowiptv.presentation.common.rememberIsTablet
import com.dream.wowiptv.presentation.common.components.GradientBackground
import com.dream.wowiptv.presentation.common.components.CastAvatarRow
import com.dream.wowiptv.presentation.common.components.PersonAvatar
import com.dream.wowiptv.presentation.common.components.DetailPosterHeader
import com.dream.wowiptv.presentation.common.components.ErrorView
import com.dream.wowiptv.presentation.common.components.FlippablePosterCard
import com.dream.wowiptv.presentation.common.components.LoadingIndicator
import com.dream.wowiptv.presentation.common.components.posterContentScaleFromKey
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme
import com.dream.wowiptv.presentation.common.theme.LiveRed
import com.dream.wowiptv.presentation.common.theme.LocalAccentPalette
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.SavedStateHandle
import android.content.Context

@HiltViewModel
class MovieDetailViewModel @Inject constructor(
    private val getVodInfoUseCase: GetVodInfoUseCase,
    private val watchProgressUseCase: WatchProgressUseCase,
    private val createFavoriteUseCase: CreateFavoriteUseCase,
    private val appPreferences: AppPreferences,
    private val tmdbRepository: TmdbRepository,
    savedStateHandle: SavedStateHandle,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val vodId: Int = savedStateHandle.get<Int>("vodId") ?: 0

    val isFavorite: StateFlow<Boolean> = favoriteFlow()

    private fun favoriteFlow(): StateFlow<Boolean> = flow {
        createFavoriteUseCase.getMovieFavoriteIds().collect { ids ->
            emit(ids.contains(vodId))
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    fun toggleFavorite(name: String, icon: String?, categoryId: Int) {
        viewModelScope.launch { createFavoriteUseCase.toggleMovie(vodId, name, icon, categoryId) }
    }

    private val _vodInfo = MutableStateFlow<UiState<VodInfo>>(UiState.Loading)
    val vodInfo: StateFlow<UiState<VodInfo>> = _vodInfo.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _vodInfo.value = UiState.Loading
            try {
                val cached = getVodInfoUseCase(vodId)
                _vodInfo.value = UiState.Success(cached)
                refreshFromNetwork(silent = true)
            } catch (e: Exception) {
                _vodInfo.value = UiState.Error(e.message ?: context.getString(R.string.err_load_details))
            }
        }
    }

    fun refresh() {
        refreshFromNetwork(silent = false)
    }

    private fun refreshFromNetwork(silent: Boolean) {
        viewModelScope.launch {
            if (!silent) _isRefreshing.value = true
            try {
                val fresh = getVodInfoUseCase(vodId, forceRefresh = true)
                _vodInfo.value = UiState.Success(fresh)
            } catch (_: Exception) {
                if (!silent) {
                    val current = _vodInfo.value
                    if (current !is UiState.Success) {
                        _vodInfo.value = UiState.Error(context.getString(R.string.err_load_details))
                    }
                }
            } finally {
                if (!silent) _isRefreshing.value = false
            }
        }
    }

    val avatarsEnabled: StateFlow<Boolean> = combine(
        appPreferences.showCastAvatars,
        appPreferences.tmdbApiKey
    ) { show, key -> show && key.isNotBlank() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val posterContentScale: StateFlow<ContentScale> = appPreferences.posterContentScale
        .map { posterContentScaleFromKey(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ContentScale.Crop)

    private val _castImages = MutableStateFlow<Map<String, String>>(emptyMap())
    val castImages: StateFlow<Map<String, String>> = _castImages.asStateFlow()

    fun loadCastImages(info: VodInfo) {
        if (!avatarsEnabled.value || _castImages.value.isNotEmpty()) return
        viewModelScope.launch {
            val key = appPreferences.tmdbApiKey.first()
            if (key.isBlank()) return@launch
            val names = (listOfNotNull(info.director) + listOfNotNull(info.cast))
                .flatMap { it.split(",") }
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .distinct()
                .take(12)
            if (names.isEmpty()) return@launch
            val map = tmdbRepository.fetchPeopleImages(info.name, info.releasedate, names, key)
            _castImages.value = map.filterValues { !it.isNullOrBlank() }.mapValues { it.value!! }
        }
    }

    private val _savedPosition = MutableStateFlow(0L)
    val savedPosition: StateFlow<Long> = _savedPosition.asStateFlow()

    private val _savedDuration = MutableStateFlow(0L)
    val savedDuration: StateFlow<Long> = _savedDuration.asStateFlow()

    fun refreshPosition() {
        viewModelScope.launch {
            _savedPosition.value = watchProgressUseCase.getProgress("vod_$vodId")
            _savedDuration.value = watchProgressUseCase.getProgressDuration("vod_$vodId")
        }
    }
}

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun MovieDetailScreen(
    onBack: () -> Unit,
    onPlay: (Int, String, Long) -> Unit,
    viewModel: MovieDetailViewModel = hiltViewModel()
) {
    val vodInfoState by viewModel.vodInfo.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val avatarsEnabled by viewModel.avatarsEnabled.collectAsState()
    val posterContentScale by viewModel.posterContentScale.collectAsState()
    val castImages by viewModel.castImages.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.load()
        viewModel.refreshPosition()
    }

    LaunchedEffect(vodInfoState, avatarsEnabled) {
        val info = (vodInfoState as? UiState.Success)?.data
        if (info != null && avatarsEnabled) {
            viewModel.loadCastImages(info)
        }
    }

    when (val state = vodInfoState) {
        is UiState.Loading -> LoadingIndicator()
        is UiState.Error -> ErrorView(
            message = state.message,
            onRetry = { viewModel.load() }
        )
        is UiState.Empty -> {}
        is UiState.Success -> {
            val info = state.data

            androidx.compose.material3.pulltorefresh.PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.fillMaxSize()
            ) {
                MaterialTheme(colorScheme = DarkColorScheme) {
                GradientBackground {
                Box(modifier = Modifier.fillMaxSize()) {
                    val savedPos by viewModel.savedPosition.collectAsState()
                    val savedDuration by viewModel.savedDuration.collectAsState()
                    val isTablet = rememberIsTablet()
                    if (isTablet) {
                        val isFav by viewModel.isFavorite.collectAsState()
                        MovieDetailTablet(
                            info = info,
                            savedPos = savedPos,
                            avatarsEnabled = avatarsEnabled,
                            castImages = castImages,
                            posterContentScale = posterContentScale,
                            isFavorite = isFav,
                            onToggleFavorite = {
                                viewModel.toggleFavorite(info.name, info.cover, info.categoryId)
                            },
                            onBack = onBack,
                            onPlay = onPlay
                        )
                    } else {
                    Column(modifier = Modifier.fillMaxSize()) {
                        val isFav by viewModel.isFavorite.collectAsState()
                        DetailPosterHeader(
                            model = info.cover,
                            contentDescription = info.name,
                            contentScale = posterContentScale,
                            onBack = onBack,
                            isFavorite = isFav,
                            onToggleFavorite = { viewModel.toggleFavorite(info.name, info.cover, info.categoryId) },
                            rating = info.rating?.let { "%.1f".format(it) },
                            year = info.releasedate?.take(10),
                            genres = info.genre,
                            plot = info.plot
                        )

                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .verticalScroll(rememberScrollState())
                                .padding(horizontal = 16.dp)
                                .padding(bottom = 112.dp)
                        ) {
                            Spacer(modifier = Modifier.height(16.dp))

                            Text(
                                text = info.name,
                                style = MaterialTheme.typography.headlineSmall,
                                color = MaterialTheme.colorScheme.onSurface
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.fillMaxWidth()) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        info.releasedate?.take(10)?.let { date ->
                                            Text(
                                                text = date,
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                            Spacer(modifier = Modifier.width(12.dp))
                                        }
                                        info.rating?.let { rating ->
                                            Icon(
                                                imageVector = Icons.Filled.Star,
                                                contentDescription = null,
                                                tint = Color(0xFFFFC107),
                                                modifier = Modifier.height(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "%.1f".format(rating),
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                        info.durationSecs?.let { secs ->
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Text(
                                                text = formatDuration(secs, LocalContext.current),
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                    info.genre?.let { genreStr ->
                                        Spacer(modifier = Modifier.height(10.dp))
                                        FlowRow(
                                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                                            verticalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            genreStr.split(",").forEach { tag ->
                                                SuggestionChip(
                                                    onClick = { },
                                                    label = {
                                                        Text(
                                                            text = tag.trim(),
                                                            style = MaterialTheme.typography.labelSmall
                                                        )
                                                    }
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(4.dp))

                            info.plot?.let { plot ->
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = stringResource(R.string.movies_overview),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = plot,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            info.cast?.let { cast ->
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = stringResource(R.string.movies_cast),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                val castNames = cast.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                                if (avatarsEnabled && castNames.isNotEmpty()) {
                                    CastAvatarRow(names = castNames, images = castImages)
                                } else {
                                    Text(
                                        text = cast,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            info.director?.let { director ->
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = stringResource(R.string.movies_director),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                val directorName = director.trim()
                                if (avatarsEnabled && directorName.isNotEmpty()) {
                                    PersonAvatar(name = directorName, imageUrl = castImages[directorName])
                                } else {
                                    Text(
                                        text = director,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))
                        }
                    }

                    BottomPlayBar(
                        info = info,
                        savedPos = savedPos,
                        savedDuration = savedDuration,
                        onPlay = onPlay,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                    )
                    }
                }
                }
            }
        }
    }
}
}

private fun formatDuration(secs: Int, context: Context): String {
    val hours = secs / 3600
    val minutes = (secs % 3600) / 60
    val seconds = secs % 60
    return when {
        hours > 0 -> context.getString(R.string.movies_duration_hm, hours, minutes)
        minutes > 0 -> context.getString(R.string.movies_duration_ms, minutes, seconds)
        else -> context.getString(R.string.movies_duration_s, seconds)
    }
}

@Composable
private fun BottomPlayBar(
    info: VodInfo,
    savedPos: Long,
    savedDuration: Long,
    onPlay: (Int, String, Long) -> Unit,
    modifier: Modifier = Modifier
) {
    val accent = LocalAccentPalette.current
    Box(
        modifier = modifier
            .background(Color(0xFF201E2A).copy(alpha = 0.92f))
            .navigationBarsPadding()
            .padding(16.dp)
    ) {
        val durationMs = if (savedDuration > 0) savedDuration else (info.durationSecs ?: 0) * 1000L
        val progress = if (savedPos > 0 && durationMs > 0) {
            (savedPos.toFloat() / durationMs).coerceIn(0f, 1f)
        } else 0f
        if (savedPos > 0) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(
                    onClick = { onPlay(info.id, info.name, 0L) },
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = accent.vibrant),
                    border = BorderStroke(1.dp, accent.vibrant)
                ) {
                    Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(stringResource(R.string.common_restart))
                }
                Button(
                    onClick = { onPlay(info.id, info.name, savedPos) },
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = accent.vibrant),
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        Row(
                            modifier = Modifier.fillMaxSize(),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(stringResource(R.string.common_continue), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .fillMaxWidth()
                                .height(3.dp)
                                .background(Color.Black.copy(alpha = 0.35f))
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .fillMaxWidth(progress)
                                    .background(Color.White)
                            )
                        }
                    }
                }
            }
        } else {
            Button(
                onClick = { onPlay(info.id, info.name, 0L) },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.buttonColors(containerColor = accent.vibrant)
            ) {
                Icon(Icons.Filled.PlayArrow, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = stringResource(R.string.common_play))
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MovieDetailTablet(
    info: VodInfo,
    savedPos: Long,
    avatarsEnabled: Boolean,
    castImages: Map<String, String>,
    posterContentScale: ContentScale,
    isFavorite: Boolean,
    onToggleFavorite: () -> Unit,
    onBack: () -> Unit,
    onPlay: (Int, String, Long) -> Unit
) {
    val accent = LocalAccentPalette.current
    var showPosterCard by remember { mutableStateOf(false) }

    if (showPosterCard) {
        Dialog(
            onDismissRequest = { showPosterCard = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            FlippablePosterCard(
                posterUrl = info.cover,
                title = info.name,
                onDismiss = { showPosterCard = false },
                rating = info.rating?.let { "%.1f".format(it) },
                year = info.releasedate?.take(10),
                genres = info.genre,
                plot = info.plot
            )
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1.2f)
                .background(Color.Black)
        ) {
            AsyncImage(
                model = info.cover,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .blur(18.dp)
                    .scale(1.08f)
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.55f), Color(0xFF1A1A1A))))
            )
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .padding(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.common_back), tint = Color.White)
                    }
                    Spacer(modifier = Modifier.weight(1f))
                    IconButton(onClick = onToggleFavorite) {
                        Icon(
                            imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            contentDescription = stringResource(R.string.common_favorite),
                            tint = if (isFavorite) LiveRed else Color.White
                        )
                    }
                }
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = info.name,
                    style = MaterialTheme.typography.headlineMedium,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    info.releasedate?.take(10)?.let { date ->
                        Text(date, style = MaterialTheme.typography.bodyMedium, color = Color(0xFFCCCCCC))
                        Spacer(modifier = Modifier.width(12.dp))
                    }
                    info.rating?.let { rating ->
                        Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.height(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("%.1f".format(rating), style = MaterialTheme.typography.bodyMedium, color = Color(0xFFCCCCCC))
                    }
                    info.durationSecs?.let { secs ->
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(formatDuration(secs, LocalContext.current), style = MaterialTheme.typography.bodyMedium, color = Color(0xFFCCCCCC))
                    }
                }
                info.genre?.let { genreStr ->
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        genreStr.split(",").take(6).forEach { tag ->
                            SuggestionChip(
                                onClick = { },
                                label = { Text(tag.trim(), style = MaterialTheme.typography.labelSmall) }
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(20.dp))
                Row(
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Button(
                        onClick = { onPlay(info.id, info.name, savedPos) },
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = accent.vibrant),
                        modifier = Modifier.height(48.dp)
                    ) {
                        Icon(Icons.Filled.PlayArrow, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            if (savedPos > 0) stringResource(R.string.common_continue) else stringResource(R.string.common_play),
                            fontWeight = FontWeight.Bold
                        )
                    }
                    if (savedPos > 0) {
                        OutlinedButton(
                            onClick = { onPlay(info.id, info.name, 0L) },
                            shape = RoundedCornerShape(24.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = accent.vibrant),
                            border = BorderStroke(1.dp, accent.vibrant),
                            modifier = Modifier.height(48.dp)
                        ) {
                            Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(stringResource(R.string.common_restart))
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(16.dp)
        ) {
            AsyncImage(
                model = info.cover,
                contentDescription = info.name,
                contentScale = posterContentScale,
                modifier = Modifier
                    .width(180.dp)
                    .height(260.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { showPosterCard = true }
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                info.plot?.let { plot ->
                    Text(
                        text = stringResource(R.string.movies_overview),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = plot,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                info.cast?.let { cast ->
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.movies_cast),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    val castNames = cast.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                    if (avatarsEnabled && castNames.isNotEmpty()) {
                        CastAvatarRow(names = castNames, images = castImages)
                    } else {
                        Text(
                            text = cast,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                info.director?.let { director ->
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.movies_director),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    val directorName = director.trim()
                    if (avatarsEnabled && directorName.isNotEmpty()) {
                        PersonAvatar(name = directorName, imageUrl = castImages[directorName])
                    } else {
                        Text(
                            text = director,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}
