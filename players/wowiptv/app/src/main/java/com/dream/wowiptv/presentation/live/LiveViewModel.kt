package com.dream.wowiptv.presentation.live

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import com.dream.wowiptv.data.local.dao.FavoriteStreamDao
import com.dream.wowiptv.data.local.AppPreferences
import com.dream.wowiptv.data.local.entity.FavoriteStreamEntity
import com.dream.wowiptv.domain.model.EpgEntry
import com.dream.wowiptv.domain.model.LiveCategory
import com.dream.wowiptv.domain.model.LiveStream
import com.dream.wowiptv.domain.repository.LiveTvRepository
import com.dream.wowiptv.domain.usecase.GetLiveCategoriesUseCase
import com.dream.wowiptv.domain.usecase.GetLiveStreamsUseCase
import com.dream.wowiptv.domain.usecase.GetShortEpgUseCase
import com.dream.wowiptv.domain.usecase.PlayStreamUseCase
import com.dream.wowiptv.domain.usecase.ResolveStreamMimeUseCase
import com.dream.wowiptv.domain.usecase.WatchProgressUseCase
import com.dream.wowiptv.domain.repository.SourceRepository
import com.dream.wowiptv.presentation.common.CategoryLocks
import com.dream.wowiptv.presentation.common.NetworkSpeedTracker
import com.dream.wowiptv.presentation.common.UiState
import com.dream.wowiptv.R
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class LiveViewModel @Inject constructor(
    private val getLiveCategoriesUseCase: GetLiveCategoriesUseCase,
    private val getLiveStreamsUseCase: GetLiveStreamsUseCase,
    private val getShortEpgUseCase: GetShortEpgUseCase,
    private val liveTvRepository: LiveTvRepository,
    private val playStreamUseCase: PlayStreamUseCase,
    private val resolveStreamMimeUseCase: ResolveStreamMimeUseCase,
    private val sourceRepository: SourceRepository,
    private val favoriteStreamDao: FavoriteStreamDao,
    private val watchProgressUseCase: WatchProgressUseCase,
    private val appPreferences: AppPreferences,
    @ApplicationContext private val context: Context
) : ViewModel() {

    companion object {
        const val FAVORITES_ID = -1
    }

    private data class CategoryAndFavorites(
        val categoryId: Int?,
        val favoriteIds: Set<Int>,
        val blockedCategoryIds: Set<Int>
    )

    val defaultPlaybackSpeed: StateFlow<Float> = appPreferences.defaultPlaybackSpeed
        .stateIn(viewModelScope, SharingStarted.Eagerly, 1f)

    val showPlayerStatus: StateFlow<Boolean> = appPreferences.showPlayerStatus
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val categories: StateFlow<UiState<List<LiveCategory>>> = sourceRepository.getActiveSource()
        .flatMapLatest { source ->
            if (source == null) {
                flowOf(UiState.Empty as UiState<List<LiveCategory>>)
            } else {
                getLiveCategoriesUseCase()
                    .map { UiState.Success(it) as UiState<List<LiveCategory>> }
                    .catch { emit(UiState.Error(it.message ?: context.getString(R.string.err_load_categories))) }
                    .onStart { emit(UiState.Loading) }
            }
        }
        .stateIn(viewModelScope, SharingStarted.Eagerly, UiState.Loading)

    private val _selectedCategoryId = MutableStateFlow<Int?>(null)
    val selectedCategoryId: StateFlow<Int?> = _selectedCategoryId.asStateFlow()

    val lockedCategories: StateFlow<Set<Int>> = combine(
        appPreferences.categoryLocks,
        sourceRepository.getActiveSource()
    ) { locks, source ->
        CategoryLocks.lockedIds(CategoryLocks.TYPE_LIVE, locks, source?.id)
    }.stateIn(viewModelScope, SharingStarted.Eagerly, emptySet())

    private val _pendingLockedCategory = MutableStateFlow<Int?>(null)
    val pendingLockedCategory: StateFlow<Int?> = _pendingLockedCategory.asStateFlow()

    private val _unlockedCategories = MutableStateFlow<Set<Int>>(emptySet())
    val unlockedCategories: StateFlow<Set<Int>> = _unlockedCategories.asStateFlow()

    val categoryLockPassword: StateFlow<String> = appPreferences.categoryLockPassword
        .stateIn(viewModelScope, SharingStarted.Eagerly, "")

    private val _refreshTrigger = MutableStateFlow(0L)

    private val _favoriteIds = MutableStateFlow<Set<Int>>(emptySet())
    val favoriteIds: StateFlow<Set<Int>> = _favoriteIds.asStateFlow()

    val visibleFavoriteCount: StateFlow<Int> = combine(
        sourceRepository.getActiveSource(),
        lockedCategories,
        unlockedCategories
    ) { source, locked, unlocked -> Pair(source, locked - unlocked) }
        .flatMapLatest { (source, blocked) ->
            if (source == null) {
                flowOf(0)
            } else {
                favoriteStreamDao.getAllBySource(source.id)
                    .map { favs -> favs.count { it.categoryId !in blocked } }
            }
        }
        .stateIn(viewModelScope, SharingStarted.Eagerly, 0)

    val streams: StateFlow<UiState<List<LiveStream>>> = combine(
        _selectedCategoryId,
        _refreshTrigger,
        _favoriteIds,
        lockedCategories,
        unlockedCategories
    ) { categoryId, _, favIds, locked, unlocked ->
        CategoryAndFavorites(categoryId, favIds, locked - unlocked)
    }
        .flatMapLatest { selection ->
            if (selection.categoryId == FAVORITES_ID) {
                getLiveStreamsUseCase(null)
                    .map { allStreams ->
                        UiState.Success(
                            allStreams.filter {
                                it.id in selection.favoriteIds && it.categoryId !in selection.blockedCategoryIds
                            }
                        ) as UiState<List<LiveStream>>
                    }
                    .catch { emit(UiState.Error(it.message ?: context.getString(R.string.err_load_favorites))) }
                    .onStart { emit(UiState.Loading) }
            } else if (selection.categoryId == null) {
                getLiveStreamsUseCase(null)
                    .map { allStreams ->
                        UiState.Success(
                            allStreams.filter { it.categoryId !in selection.blockedCategoryIds }
                        ) as UiState<List<LiveStream>>
                    }
                    .catch { emit(UiState.Error(it.message ?: context.getString(R.string.err_load_channels))) }
                    .onStart { emit(UiState.Loading) }
            } else {
                getLiveStreamsUseCase(selection.categoryId)
                    .map { UiState.Success(it) as UiState<List<LiveStream>> }
                    .catch { emit(UiState.Error(it.message ?: context.getString(R.string.err_load_channels))) }
                    .onStart { emit(UiState.Loading) }
            }
        }
        .stateIn(viewModelScope, SharingStarted.Eagerly, UiState.Loading)

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    val filteredStreams: StateFlow<UiState<List<LiveStream>>> = combine(
        streams, _searchQuery
    ) { s, query ->
        if (s !is UiState.Success) return@combine s
        if (query.isBlank()) return@combine s
        UiState.Success(s.data.filter { it.name.contains(query, ignoreCase = true) })
    }.stateIn(viewModelScope, SharingStarted.Eagerly, UiState.Loading)

    val categoryCounts: StateFlow<Map<Int, Int>> = combine(
        sourceRepository.getActiveSource(),
        lockedCategories,
        unlockedCategories
    ) { source, locked, unlocked ->
        Pair(source, locked - unlocked)
    }
        .flatMapLatest { (source, blockedCategoryIds) ->
            if (source == null) {
                flowOf(emptyMap())
            } else {
                getLiveStreamsUseCase(null)
                    .map { streams ->
                        streams
                            .filter { it.categoryId !in blockedCategoryIds }
                            .groupBy { it.categoryId }
                            .mapValues { it.value.size }
                    }
            }
        }
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyMap())

    private val _currentStream = MutableStateFlow<LiveStream?>(null)
    val currentStream: StateFlow<LiveStream?> = _currentStream.asStateFlow()

    private val _streamUrl = MutableStateFlow("")
    val streamUrl: StateFlow<String> = _streamUrl.asStateFlow()

    private val _streamMimeType = MutableStateFlow<String?>(null)
    val streamMimeType: StateFlow<String?> = _streamMimeType.asStateFlow()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _epgEntries = MutableStateFlow<List<EpgEntry>>(emptyList())
    val epgEntries: StateFlow<List<EpgEntry>> = _epgEntries.asStateFlow()

    private val _channelEpg = MutableStateFlow<Map<Int, String>>(emptyMap())
    val channelEpg: StateFlow<Map<Int, String>> = _channelEpg.asStateFlow()

    private val _epgLoadedIds = MutableStateFlow<Set<Int>>(emptySet())

    private val _isFullscreen = MutableStateFlow(false)
    val isFullscreen: StateFlow<Boolean> = _isFullscreen.asStateFlow()

    private val networkTracker = NetworkSpeedTracker()
    val player: ExoPlayer by lazy {
        val dataSourceFactory = DefaultHttpDataSource.Factory()
            .setTransferListener(networkTracker)
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(dataSourceFactory))
            .build()
    }

    private val _isBuffering = MutableStateFlow(false)
    val isBuffering: StateFlow<Boolean> = _isBuffering.asStateFlow()

    private val _networkSpeed = MutableStateFlow(0L)
    val networkSpeed: StateFlow<Long> = _networkSpeed.asStateFlow()

    private var currentSourceId: Long = 0

    init {
        loadFavoriteIds()
        observeSourceChange()
        observePlayback()
    }

    private fun observePlayback() {
        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                _isBuffering.value = when (playbackState) {
                    Player.STATE_BUFFERING -> true
                    else -> false
                }
            }
            override fun onIsLoadingChanged(isLoading: Boolean) {
                if (isLoading) _isBuffering.value = true
            }
        })
        viewModelScope.launch {
            while (true) {
                _networkSpeed.value = networkTracker.currentBps()
                delay(1000)
            }
        }
        viewModelScope.launch {
            defaultPlaybackSpeed.collect { player.setPlaybackSpeed(it) }
        }
        viewModelScope.launch {
            combine(_streamUrl, _streamMimeType, _isPlaying) { url, mime, playing -> Triple(url, mime, playing) }
                .collect { (url, mime, playing) ->
                    if (url.isNotEmpty()) {
                        player.setMediaItem(buildMediaItem(url, mime))
                        player.prepare()
                        player.playWhenReady = playing && url.isNotEmpty()
                        _isBuffering.value = true
                    }
                }
        }
    }

    private fun buildMediaItem(url: String, mime: String?): MediaItem =
        MediaItem.Builder()
            .setUri(url)
            .apply { mime?.let { setMimeType(it) } }
            .build()

    fun onAppBackgrounded() {
        player.stop()
        player.clearMediaItems()
    }

    private var resumeOnScreenEnter = false

    fun onScreenLeft() {
        resumeOnScreenEnter = _streamUrl.value.isNotEmpty() && player.playWhenReady
        if (resumeOnScreenEnter) {
            player.playWhenReady = false
        }
    }

    fun onScreenEntered() {
        if (resumeOnScreenEnter && _streamUrl.value.isNotEmpty()) {
            player.playWhenReady = true
        }
        resumeOnScreenEnter = false
    }

    fun onAppForegrounded() {
        if (_streamUrl.value.isNotEmpty() && _isPlaying.value) {
            player.setMediaItem(buildMediaItem(_streamUrl.value, _streamMimeType.value))
            player.prepare()
            player.playWhenReady = true
            _isBuffering.value = true
        }
    }

    override fun onCleared() {
        player.release()
        super.onCleared()
    }

    private fun observeSourceChange() {
        viewModelScope.launch {
            var lastSourceId: Long? = null
            sourceRepository.getActiveSource().collect { source ->
                val newId = source?.id
                if (lastSourceId != null && newId != lastSourceId) {
                    _currentStream.value = null
                    _streamUrl.value = ""
                    _isPlaying.value = false
                    _isFullscreen.value = false
                    _epgEntries.value = emptyList()
                    _channelEpg.value = emptyMap()
                    _epgLoadedIds.value = emptySet()
                    _selectedCategoryId.value = null
                    _favoriteIds.value = emptySet()
                    loadFavoriteIds()
                }
                lastSourceId = newId
            }
        }
    }

    private fun loadFavoriteIds() {
        viewModelScope.launch {
            val source = sourceRepository.getActiveSource().first()
            if (source != null) {
                currentSourceId = source.id
                val ids = favoriteStreamDao.getFavoriteIdsBySource(source.id)
                _favoriteIds.value = ids.toSet()
            }
        }
    }

    fun selectCategory(id: Int?) {
        if (id != null && id in lockedCategories.value && id !in _unlockedCategories.value) {
            _pendingLockedCategory.value = id
            return
        }
        val prev = _selectedCategoryId.value
        _selectedCategoryId.value = id
        if (prev != null && prev != id) {
            _unlockedCategories.update { it - prev }
        }
    }

    fun dismissCategoryLock() {
        _pendingLockedCategory.value = null
    }

    fun confirmCategoryLock(password: String): Boolean {
        val pending = _pendingLockedCategory.value ?: return false
        if (password.isEmpty() || password != categoryLockPassword.value || categoryLockPassword.value.isEmpty()) {
            return false
        }
        _unlockedCategories.update { it + pending }
        _selectedCategoryId.value = pending
        _pendingLockedCategory.value = null
        return true
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun refresh() {
        _refreshTrigger.value = System.currentTimeMillis()
    }

    fun playStream(stream: LiveStream) {
        _currentStream.value = stream
        _isPlaying.value = true
        _streamUrl.value = ""
        viewModelScope.launch {
            try {
                val url = playStreamUseCase(PlayStreamUseCase.StreamType.Live(stream.id, m3uUrl = stream.m3uUrl))
                _streamUrl.value = url
                _streamMimeType.value = try {
                    resolveStreamMimeUseCase(url)
                } catch (_: Exception) {
                    null
                }
            } catch (_: Exception) {
                _streamUrl.value = ""
            }
            try {
                val contentId = "live_${stream.id}"
                watchProgressUseCase.saveProgress(contentId, "live", stream.name, stream.iconUrl, System.currentTimeMillis() / 1000, 0L)
                android.util.Log.d("PlayerVM", "saved live $contentId name=${stream.name}")
            } catch (e: Exception) {
                android.util.Log.e("PlayerVM", "save live failed", e)
            }
        }
        loadEpg(stream.id)
    }

    fun togglePlay() {
        _isPlaying.value = !_isPlaying.value
    }

    fun toggleFullscreen() {
        _isFullscreen.value = !_isFullscreen.value
    }

    fun exitFullscreen() {
        _isFullscreen.value = false
    }

    fun toggleFavorite(stream: LiveStream) {
        viewModelScope.launch {
            sourceRepository.getActiveSource().first()?.let { source ->
                if (_favoriteIds.value.contains(stream.id)) {
                    favoriteStreamDao.delete(stream.id, source.id)
                    _favoriteIds.value = _favoriteIds.value - stream.id
                } else {
                    favoriteStreamDao.insert(
                        FavoriteStreamEntity(
                            streamId = stream.id,
                            sourceId = source.id,
                            name = stream.name,
                            iconUrl = stream.iconUrl,
                            categoryId = stream.categoryId
                        )
                    )
                    _favoriteIds.value = _favoriteIds.value + stream.id
                }
            }
        }
    }

    fun loadChannelEpg(streamId: Int) {
        if (_epgLoadedIds.value.contains(streamId)) return
        _epgLoadedIds.update { it + streamId }
        viewModelScope.launch {
            val cached = runCatching { getShortEpgUseCase(streamId).first() }.getOrNull().orEmpty()
            publishCurrentEpg(streamId, cached)
            if (cached.isEmpty()) {
                runCatching { liveTvRepository.refreshEpg(streamId) }
                val entries = runCatching { getShortEpgUseCase(streamId).first() }.getOrNull().orEmpty()
                publishCurrentEpg(streamId, entries)
            }
        }
    }

    private fun publishCurrentEpg(streamId: Int, entries: List<EpgEntry>) {
        val current = entries.find { it.isNowPlaying } ?: entries.firstOrNull()
        current?.let { _channelEpg.update { m -> m + (streamId to it.title) } }
    }

    private fun loadEpg(streamId: Int) {
        viewModelScope.launch {
            try {
                val entries = getShortEpgUseCase(streamId).first()
                _epgEntries.value = entries
            } catch (_: Exception) {
                _epgEntries.value = emptyList()
            }
        }
    }
}
