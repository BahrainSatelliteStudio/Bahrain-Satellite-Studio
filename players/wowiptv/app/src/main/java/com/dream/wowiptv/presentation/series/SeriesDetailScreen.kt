package com.dream.wowiptv.presentation.series

import android.content.Context
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dream.wowiptv.R
import coil.compose.AsyncImage
import com.dream.wowiptv.domain.model.Episode
import com.dream.wowiptv.domain.model.Season
import com.dream.wowiptv.domain.model.SeriesInfo
import com.dream.wowiptv.domain.model.SeriesItem
import com.dream.wowiptv.data.local.AppPreferences
import com.dream.wowiptv.domain.repository.TmdbRepository
import com.dream.wowiptv.domain.usecase.GetSeriesInfoUseCase
import com.dream.wowiptv.domain.usecase.WatchProgressUseCase
import com.dream.wowiptv.domain.usecase.CreateFavoriteUseCase
import com.dream.wowiptv.presentation.common.UiState
import com.dream.wowiptv.presentation.common.rememberIsTablet
import com.dream.wowiptv.presentation.common.components.DetailPosterHeader
import com.dream.wowiptv.presentation.common.components.ErrorView
import com.dream.wowiptv.presentation.common.components.FlippablePosterCard
import com.dream.wowiptv.presentation.common.components.CastAvatarRow
import com.dream.wowiptv.presentation.common.components.GradientBackground
import com.dream.wowiptv.presentation.common.components.LoadingIndicator
import com.dream.wowiptv.presentation.common.components.PersonAvatar
import com.dream.wowiptv.presentation.common.components.posterContentScaleFromKey
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme
import com.dream.wowiptv.presentation.common.theme.LiveRed
import com.dream.wowiptv.presentation.common.theme.LocalAccentPalette
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SeriesDetailViewModel @Inject constructor(
    private val getSeriesInfoUseCase: GetSeriesInfoUseCase,
    private val watchProgressUseCase: WatchProgressUseCase,
    private val createFavoriteUseCase: CreateFavoriteUseCase,
    private val appPreferences: AppPreferences,
    private val tmdbRepository: TmdbRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private var currentSeriesId: Int = 0

    val isFavorite: StateFlow<Boolean> = flow {
        createFavoriteUseCase.getSeriesFavoriteIds().collect { ids ->
            emit(ids.contains(currentSeriesId))
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    fun toggleFavorite(name: String, icon: String?, categoryId: Int) {
        viewModelScope.launch { createFavoriteUseCase.toggleSeries(currentSeriesId, name, icon, categoryId) }
    }

    private val _info = MutableStateFlow<UiState<SeriesInfo>>(UiState.Loading)
    val info: StateFlow<UiState<SeriesInfo>> = _info.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _episodePositions = MutableStateFlow<Map<String, Long>>(emptyMap())
    val episodePositions: StateFlow<Map<String, Long>> = _episodePositions.asStateFlow()

    private val _episodeDurations = MutableStateFlow<Map<String, Long>>(emptyMap())
    val episodeDurations: StateFlow<Map<String, Long>> = _episodeDurations.asStateFlow()

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

    fun loadCastImages() {
        val current = _info.value
        if (!avatarsEnabled.value || _castImages.value.isNotEmpty()) return
        val info = (current as? UiState.Success)?.data?.info ?: return
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
            val map = tmdbRepository.fetchPeopleImages(info.name, info.releaseDate, names, key)
            _castImages.value = map.filterValues { !it.isNullOrBlank() }.mapValues { it.value!! }
        }
    }

    private var loadedSeriesId: Int = 0
    private var positionsJob: kotlinx.coroutines.Job? = null

    fun load(seriesId: Int) {
        currentSeriesId = seriesId
        loadedSeriesId = seriesId
        viewModelScope.launch {
            _info.value = UiState.Loading
            try {
                val cached = getSeriesInfoUseCase(seriesId)
                _info.value = UiState.Success(cached)
                updatePositions(cached)
                refreshFromNetwork(seriesId, silent = true)
            } catch (e: Exception) {
                _info.value = UiState.Error(e.message ?: context.getString(R.string.err_load_failed))
            }
        }
    }

    fun refresh() {
        refreshFromNetwork(loadedSeriesId, silent = false)
    }

    private fun refreshFromNetwork(seriesId: Int, silent: Boolean) {
        viewModelScope.launch {
            if (!silent) _isRefreshing.value = true
            try {
                val fresh = getSeriesInfoUseCase(seriesId, forceRefresh = true)
                _info.value = UiState.Success(fresh)
                updatePositions(fresh)
            } catch (_: Exception) {
                if (!silent) {
                    val current = _info.value
                    if (current !is UiState.Success) {
                        _info.value = UiState.Error(context.getString(R.string.err_load_failed))
                    }
                }
            } finally {
                if (!silent) _isRefreshing.value = false
            }
        }
    }

    private fun updatePositions(info: SeriesInfo) {
        positionsJob?.cancel()
        positionsJob = viewModelScope.launch {
            try {
                val positions = mutableMapOf<String, Long>()
                val durations = mutableMapOf<String, Long>()
                info.episodes.values.flatten().forEach { ep ->
                    val contentId = "series_${ep.id}"
                    val pos = watchProgressUseCase.getProgress(contentId)
                    val dur = watchProgressUseCase.getProgressDuration(contentId)
                    android.util.Log.d("SeriesDetailVM", "ep.id=${ep.id} contentId=$contentId pos=$pos dur=$dur durationSecs=${ep.durationSecs}")
                    if (pos > 0) {
                        positions[ep.id] = pos
                        if (dur > 0) durations[ep.id] = dur
                    }
                }
                android.util.Log.d("SeriesDetailVM", "positions=$positions durations=$durations")
                _episodePositions.value = positions
                _episodeDurations.value = durations
            } catch (e: Exception) {
                android.util.Log.e("SeriesDetailVM", "updatePositions failed", e)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SeriesDetailScreen(
    seriesId: Int,
    viewModel: SeriesDetailViewModel = hiltViewModel(),
    onBack: () -> Unit,
    onPlayEpisode: (episodeId: String, episodeTitle: String, position: Long, episodeIds: List<String>) -> Unit
) {
    val infoState by viewModel.info.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val avatarsEnabled by viewModel.avatarsEnabled.collectAsState()
    val posterContentScale by viewModel.posterContentScale.collectAsState()
    val castImages by viewModel.castImages.collectAsState()
    val episodeDurations by viewModel.episodeDurations.collectAsState()
    val isFavorite by viewModel.isFavorite.collectAsState()

    LaunchedEffect(seriesId) {
        viewModel.load(seriesId)
    }

    LaunchedEffect(infoState, avatarsEnabled) {
        if (infoState is UiState.Success && avatarsEnabled) {
            viewModel.loadCastImages()
        }
    }

    when (val state = infoState) {
        is UiState.Loading -> LoadingIndicator()
        is UiState.Error -> ErrorView(message = state.message, onRetry = { viewModel.load(seriesId) })
        is UiState.Empty -> ErrorView(message = stringResource(R.string.err_no_data), onRetry = { viewModel.load(seriesId) })
        is UiState.Success -> {
            val isTablet = rememberIsTablet()
            androidx.compose.material3.pulltorefresh.PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.fillMaxSize()
            ) {
                if (isTablet) {
                    SeriesDetailTablet(
                        series = state.data.info,
                        info = state.data,
                        allEpisodes = state.data.episodes.values.flatten(),
                        seriesEpisodeIds = state.data.episodes.entries
                            .sortedBy { it.key }
                            .flatMap { (_, eps) -> eps.sortedBy { it.episodeNum } }
                            .map { it.id },
                         episodePositions = viewModel.episodePositions.collectAsState().value,
                         episodeDurations = episodeDurations,
                         posterContentScale = posterContentScale,
                         avatarsEnabled = avatarsEnabled,
                         castImages = castImages,
                         isFavorite = isFavorite,
                         onToggleFavorite = { viewModel.toggleFavorite(state.data.info.name, state.data.info.cover, state.data.info.categoryId) },
                         onBack = onBack,
                         onPlayEpisode = onPlayEpisode
                     )
                 } else {
                     SeriesDetailContent(
                         info = state.data,
                         episodePositions = viewModel.episodePositions.collectAsState().value,
                         episodeDurations = episodeDurations,
                         avatarsEnabled = avatarsEnabled,
                         castImages = castImages,
                         posterContentScale = posterContentScale,
                         isFavorite = isFavorite,
                         onToggleFavorite = { viewModel.toggleFavorite(state.data.info.name, state.data.info.cover, state.data.info.categoryId) },
                         onBack = onBack,
                         onPlayEpisode = onPlayEpisode
                     )
                 }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SeriesDetailContent(
    info: SeriesInfo,
    episodePositions: Map<String, Long> = emptyMap(),
    episodeDurations: Map<String, Long> = emptyMap(),
    avatarsEnabled: Boolean = false,
    castImages: Map<String, String> = emptyMap(),
    posterContentScale: ContentScale = ContentScale.Crop,
    isFavorite: Boolean = false,
    onToggleFavorite: () -> Unit = {},
    onBack: () -> Unit,
    onPlayEpisode: (episodeId: String, episodeTitle: String, position: Long, episodeIds: List<String>) -> Unit
) {
    val series = info.info
    val allEpisodes = info.episodes.values.flatten()
    val seriesEpisodeIds = info.episodes.entries
        .sortedBy { it.key }
        .flatMap { (_, eps) -> eps.sortedBy { it.episodeNum } }
        .map { it.id }

    MaterialTheme(colorScheme = DarkColorScheme) {
    GradientBackground {
    Box(modifier = Modifier.fillMaxSize()) {
        val isTablet = rememberIsTablet()
        if (isTablet) {
            SeriesDetailTablet(
                series = series,
                info = info,
                allEpisodes = allEpisodes,
                seriesEpisodeIds = seriesEpisodeIds,
                episodePositions = episodePositions,
                posterContentScale = posterContentScale,
                avatarsEnabled = avatarsEnabled,
                castImages = castImages,
                isFavorite = isFavorite,
                onToggleFavorite = onToggleFavorite,
                onBack = onBack,
                onPlayEpisode = onPlayEpisode
            )
        } else {
        Column(modifier = Modifier.fillMaxSize()) {
            DetailPosterHeader(
                model = series.cover,
                contentDescription = series.name,
                contentScale = posterContentScale,
                onBack = onBack,
                isFavorite = isFavorite,
                onToggleFavorite = onToggleFavorite,
                rating = series.rating,
                year = series.releaseDate?.take(10),
                genres = series.genre,
                plot = series.plot
            )

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp)
            ) {
                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = series.name,
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    series.releaseDate?.let { date ->
                        Text(
                            text = date.take(10),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                    }
                    series.rating?.let { rating ->
                        Icon(
                            imageVector = Icons.Filled.Star,
                            contentDescription = null,
                            tint = Color(0xFFFFC107),
                            modifier = Modifier.height(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = rating,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                series.genre?.let { genreStr ->
                    Spacer(modifier = Modifier.height(12.dp))
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

                series.plot?.let { plot ->
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.series_overview),
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

                series.cast?.let { cast ->
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.series_cast),
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

                series.director?.let { director ->
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.series_director),
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

                Spacer(modifier = Modifier.height(24.dp))
                SeriesEpisodesBlock(
                    seriesName = series.name,
                    info = info,
                    allEpisodes = allEpisodes,
                    seriesEpisodeIds = seriesEpisodeIds,
                    episodePositions = episodePositions,
                    episodeDurations = episodeDurations,
                    onPlayEpisode = onPlayEpisode
                )
            }
        }
        }
    }
    }
    }
}

@Composable
private fun EpisodeItem(
    episode: Episode,
    savedPosition: Long = 0L,
    savedDuration: Long = 0L,
    onPlay: () -> Unit,
    onContinue: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val accent = LocalAccentPalette.current
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onPlay)
            .padding(vertical = 10.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = episode.episodeNum.toString().padStart(2, '0'),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            color = accent.vibrant,
            modifier = Modifier.width(28.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = episode.title,
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFFDDDDDD),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (episode.plot != null) {
                Text(
                    text = episode.plot,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF999999),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (savedPosition > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                val totalMs = when {
                    (episode.durationSecs ?: 0) > 0 -> episode.durationSecs!! * 1000L
                    savedDuration > 0 -> savedDuration
                    else -> 0L
                }
                val progress = if (totalMs > 0) (savedPosition.toFloat() / totalMs).coerceIn(0f, 1f) else 0f
                android.util.Log.d("EpisodeItem", "ep.id=${episode.id} savedPos=$savedPosition savedDur=$savedDuration durationSecs=${episode.durationSecs} totalMs=$totalMs progress=$progress")
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(Color(0xFF555555).copy(alpha = 0.5f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(progress)
                            .background(accent.primary)
                    )
                }
            }
        }
        Spacer(modifier = Modifier.width(8.dp))
        if (savedPosition > 0 && onContinue != null) {
            Icon(
                imageVector = Icons.Filled.PlayArrow,
                contentDescription = stringResource(R.string.common_continue),
                tint = Color(0xFF4CAF50),
                modifier = Modifier
                    .size(22.dp)
                    .clickable(onClick = onContinue)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Icon(
                imageVector = Icons.Filled.Replay,
                contentDescription = stringResource(R.string.common_restart),
                tint = accent.vibrant,
                modifier = Modifier
                    .size(20.dp)
                    .clickable(onClick = onPlay)
            )
        } else {
            Icon(
                imageVector = Icons.Filled.PlayArrow,
                contentDescription = stringResource(R.string.common_play),
                tint = accent.vibrant,
                modifier = Modifier
                    .size(20.dp)
                    .clickable(onClick = onPlay)
            )
        }
    }
}

@Composable
private fun SeriesEpisodesBlock(
    seriesName: String,
    info: SeriesInfo,
    allEpisodes: List<Episode>,
    seriesEpisodeIds: List<String>,
    episodePositions: Map<String, Long>,
    episodeDurations: Map<String, Long> = emptyMap(),
    onPlayEpisode: (String, String, Long, List<String>) -> Unit
) {
    val accent = LocalAccentPalette.current
    Text(
        text = stringResource(R.string.series_episodes),
        style = MaterialTheme.typography.titleMedium,
        color = Color.White
    )
    Spacer(modifier = Modifier.height(8.dp))

    val seasons = info.seasons
    var selectedSeasonIdx by remember { mutableStateOf(0) }

    if (seasons.isNotEmpty()) {
        val selectedSeason = seasons.getOrElse(selectedSeasonIdx) { seasons.first() }
        var seasonEpisodes = allEpisodes.filter { it.seasonNum == selectedSeason.seasonNumber }
        if (seasonEpisodes.isEmpty()) {
            seasonEpisodes = allEpisodes.take(selectedSeason.episodeCount)
        }

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            itemsIndexed(seasons) { idx, season ->
                val isSelected = idx == selectedSeasonIdx
                Surface(
                    onClick = { selectedSeasonIdx = idx },
                    shape = RoundedCornerShape(8.dp),
                    color = if (isSelected) accent.vibrant else Color(0xFF2C2C2C)
                ) {
                    Text(
                        text = season.name,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        fontSize = 13.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (seasonEpisodes.isEmpty()) {
            Text(
                text = stringResource(R.string.series_no_episodes),
                color = Color(0xFF999999),
                modifier = Modifier.padding(vertical = 8.dp)
            )
        } else {
            Column(
                modifier = Modifier.background(Color(0xFF2C2C2C), RoundedCornerShape(12.dp)).padding(8.dp)
            ) {
                seasonEpisodes.forEachIndexed { index, episode ->
                    val savedPos = episodePositions[episode.id] ?: 0L
                    val savedDur = episodeDurations[episode.id] ?: 0L
                    android.util.Log.d("SeriesEpisodes", "idx=$index ep.id=${episode.id} episodeNum=${episode.episodeNum} savedPos=$savedPos savedDur=$savedDur durationSecs=${episode.durationSecs}")
                    EpisodeItem(
                        episode = episode,
                        savedPosition = savedPos,
                        savedDuration = savedDur,
                        onPlay = {
                            val episodeTitle = "$seriesName - ${selectedSeason.name} E${episode.episodeNum}"
                            onPlayEpisode(episode.id, episodeTitle, 0L, seriesEpisodeIds)
                        },
                        onContinue = if (savedPos > 0) {
                            {
                                val episodeTitle = "$seriesName - ${selectedSeason.name} E${episode.episodeNum}"
                                onPlayEpisode(episode.id, episodeTitle, savedPos, seriesEpisodeIds)
                            }
                        } else {
                            null
                        }
                    )
                    if (index < seasonEpisodes.lastIndex) {
                        HorizontalDivider(color = Color(0xFF444444), thickness = 0.5.dp)
                    }
                }
            }
        }
    }
    Spacer(modifier = Modifier.height(16.dp))
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SeriesDetailTablet(
    series: SeriesItem,
    info: SeriesInfo,
    allEpisodes: List<Episode>,
    seriesEpisodeIds: List<String>,
    episodePositions: Map<String, Long>,
    episodeDurations: Map<String, Long> = emptyMap(),
    avatarsEnabled: Boolean,
    castImages: Map<String, String>,
    posterContentScale: ContentScale,
    isFavorite: Boolean,
    onToggleFavorite: () -> Unit,
    onBack: () -> Unit,
    onPlayEpisode: (String, String, Long, List<String>) -> Unit
) {
    val accent = LocalAccentPalette.current
    var showPosterCard by remember { mutableStateOf(false) }

    if (showPosterCard) {
        Dialog(
            onDismissRequest = { showPosterCard = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            FlippablePosterCard(
                posterUrl = series.cover,
                title = series.name,
                onDismiss = { showPosterCard = false },
                rating = series.rating,
                year = series.releaseDate?.take(10),
                genres = series.genre,
                plot = series.plot
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
                model = series.cover,
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
                    text = series.name,
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
                    series.releaseDate?.let { date ->
                        Text(date.take(10), style = MaterialTheme.typography.bodyMedium, color = Color(0xFFCCCCCC))
                        Spacer(modifier = Modifier.width(12.dp))
                    }
                    series.rating?.let { rating ->
                        Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.height(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(rating, style = MaterialTheme.typography.bodyMedium, color = Color(0xFFCCCCCC))
                    }
                }
                series.genre?.let { genreStr ->
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
                val firstEpisode = seriesEpisodeIds.firstOrNull()?.let { id ->
                    allEpisodes.firstOrNull { it.id == id }
                }
                firstEpisode?.let { ep ->
                    Spacer(modifier = Modifier.height(20.dp))
                    Button(
                        onClick = {
                            val title = "$series.name - E${ep.episodeNum}"
                            onPlayEpisode(ep.id, title, 0L, seriesEpisodeIds)
                        },
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = accent.vibrant),
                        modifier = Modifier.align(Alignment.CenterHorizontally).height(48.dp)
                    ) {
                        Icon(Icons.Filled.PlayArrow, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(stringResource(R.string.common_play), fontWeight = FontWeight.Bold)
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
                model = series.cover,
                contentDescription = series.name,
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
                series.plot?.let { plot ->
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.series_overview),
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
                series.cast?.let { cast ->
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.series_cast),
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
                series.director?.let { director ->
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.series_director),
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
                SeriesEpisodesBlock(
                    seriesName = series.name,
                    info = info,
                    allEpisodes = allEpisodes,
                    seriesEpisodeIds = seriesEpisodeIds,
                    episodePositions = episodePositions,
                    episodeDurations = episodeDurations,
                    onPlayEpisode = onPlayEpisode
                )
            }
        }
    }
}
