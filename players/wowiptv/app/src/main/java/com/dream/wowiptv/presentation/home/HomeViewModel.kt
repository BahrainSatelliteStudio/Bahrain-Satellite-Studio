package com.dream.wowiptv.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dream.wowiptv.data.local.dao.FavoriteStreamDao
import com.dream.wowiptv.data.local.dao.FavoriteVodDao
import com.dream.wowiptv.data.local.dao.LiveCategoryDao
import com.dream.wowiptv.data.local.dao.LiveStreamDao
import com.dream.wowiptv.data.local.dao.SeriesCategoryDao
import com.dream.wowiptv.data.local.dao.SeriesDao
import com.dream.wowiptv.data.local.dao.VodCategoryDao
import com.dream.wowiptv.data.local.dao.VodStreamDao
import com.dream.wowiptv.data.local.entity.FavoriteStreamEntity
import com.dream.wowiptv.data.local.entity.FavoriteVodEntity
import com.dream.wowiptv.data.local.entity.LiveStreamEntity
import com.dream.wowiptv.data.local.entity.SeriesEntity
import com.dream.wowiptv.data.local.entity.VodStreamEntity
import com.dream.wowiptv.data.local.entity.LiveCategoryEntity
import com.dream.wowiptv.data.local.entity.VodCategoryEntity
import com.dream.wowiptv.data.local.entity.SeriesCategoryEntity
import com.dream.wowiptv.data.local.entity.WatchProgressEntity
import com.dream.wowiptv.data.local.dao.WatchProgressDao
import com.dream.wowiptv.data.local.SourcePreferences
import com.dream.wowiptv.data.local.AppPreferences
import com.dream.wowiptv.domain.model.XtreamSource
import com.dream.wowiptv.domain.repository.SourceRepository
import com.dream.wowiptv.presentation.common.CategoryLocks
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale
import javax.inject.Inject

data class Quad(
    val liveCat: List<LiveCategoryEntity>,
    val vodCat: List<VodCategoryEntity>,
    val seriesCat: List<SeriesCategoryEntity>,
    val locks: Set<String>
)

sealed class RecentItem {
    abstract val timestamp: Long
    data class Live(val entity: LiveStreamEntity, override val timestamp: Long) : RecentItem()
    data class Movie(val entity: VodStreamEntity, override val timestamp: Long) : RecentItem()
    data class Series(val entity: SeriesEntity, override val timestamp: Long) : RecentItem()
}

data class HomeSection(
    val username: String = "",
    val expiryDate: String = "",
    val liveCount: Int = 0,
    val movieCount: Int = 0,
    val seriesCount: Int = 0,
    val continueWatching: List<WatchProgressEntity> = emptyList(),
    val favoriteStreams: List<FavoriteStreamEntity> = emptyList(),
    val favoriteMovies: List<FavoriteVodEntity> = emptyList(),
    val favoriteSeries: List<FavoriteVodEntity> = emptyList(),
    val recentItems: List<RecentItem> = emptyList(),
    val liveCategoryNames: Map<Int, String> = emptyMap(),
    val vodCategoryNames: Map<Int, String> = emptyMap(),
    val seriesCategoryNames: Map<Int, String> = emptyMap(),
    val continueCategoryNames: Map<String, String> = emptyMap(),
    val vodRating: Map<Int, String> = emptyMap(),
    val seriesRating: Map<Int, String> = emptyMap(),
    val seriesIdToCategoryName: Map<Int, String> = emptyMap(),
    val isRefreshing: Boolean = false
)

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val sourceRepository: SourceRepository,
    private val liveStreamDao: LiveStreamDao,
    private val vodStreamDao: VodStreamDao,
    private val favoriteStreamDao: FavoriteStreamDao,
    private val favoriteVodDao: FavoriteVodDao,
    private val watchProgressDao: WatchProgressDao,
    private val liveCategoryDao: LiveCategoryDao,
    private val vodCategoryDao: VodCategoryDao,
    private val seriesCategoryDao: SeriesCategoryDao,
    private val seriesDao: SeriesDao,
    private val sourcePreferences: SourcePreferences,
    private val appPreferences: AppPreferences
) : ViewModel() {

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    val showContinueWatching: StateFlow<Boolean> = appPreferences.showContinueWatching
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val showFavorites: StateFlow<Boolean> = appPreferences.showFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val showRecent: StateFlow<Boolean> = appPreferences.showRecent
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    private val _data = MutableStateFlow(HomeSection())
    val data: StateFlow<HomeSection> = _data.asStateFlow()

    private val _refreshTrigger = MutableStateFlow(0L)

    init {
        loadUserInfo()
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            sourceRepository.getActiveSource()
                .flatMapLatest { source ->
                    if (source == null) {
                        flowOf(_data.value.copy(isRefreshing = false))
                    } else {
val content = combine(
                            liveStreamDao.getBySource(source.id),
                            vodStreamDao.getBySource(source.id)
                        ) { l, v -> l to v }
                        val content2 = combine(
                            seriesDao.getBySource(source.id),
                            watchProgressDao.getAllBySource(source.id)
                        ) { s, p -> s to p }
                        val favs = combine(
                            favoriteStreamDao.getAllBySource(source.id),
                            favoriteVodDao.getAllBySource(source.id)
                        ) { f, v -> f to v }
                        val cats = combine(
                            liveCategoryDao.getBySource(source.id),
                            vodCategoryDao.getBySource(source.id),
                            seriesCategoryDao.getBySource(source.id),
                            appPreferences.categoryLocks,
                            _refreshTrigger
                        ) { l, v, s, lbs, _ -> Quad(l, v, s, lbs) }
                        combine(content, content2, favs, cats) {
                                c1, c2, fav, quad ->
                            buildSection(
                                source,
                                c1.first, c1.second,
                                c2.first, c2.second,
                                fav.first, fav.second,
                                quad.liveCat, quad.vodCat, quad.seriesCat,
                                quad.locks
                            )
                        }
                    }
                }
                .collect { section ->
                    _data.value = section
                    _isRefreshing.value = false
                }
        }
    }

    private suspend fun buildSection(
        source: XtreamSource,
        live: List<LiveStreamEntity>,
        vod: List<VodStreamEntity>,
        series: List<SeriesEntity>,
        progress: List<WatchProgressEntity>,
        favStreams: List<FavoriteStreamEntity>,
        favVods: List<FavoriteVodEntity>,
        liveCat: List<LiveCategoryEntity>,
        vodCat: List<VodCategoryEntity>,
        seriesCat: List<SeriesCategoryEntity>,
        locks: Set<String>
    ): HomeSection {
        val liveCatMap = liveCat.associate { it.categoryId to it.name }
        val vodCatMap = vodCat.associate { it.categoryId to it.name }
        val seriesCatMap = seriesCat.associate { it.categoryId to it.name }
        val (vodRatingMap, seriesRatingMap) = buildRatingMaps(vod, series)

        val lockedLiveIds = CategoryLocks.lockedIds(CategoryLocks.TYPE_LIVE, locks, source.id)
        val lockedVodIds = CategoryLocks.lockedIds(CategoryLocks.TYPE_VOD, locks, source.id)
        val lockedSeriesIds = CategoryLocks.lockedIds(CategoryLocks.TYPE_SERIES, locks, source.id)

        val episodeToSeries = mutableMapOf<String, Int>()

        val enriched = progress.mapNotNull { wp ->
            val icon = when (wp.contentType) {
                "vod" -> vod.find { it.streamId == wp.contentId.removePrefix("vod_").toIntOrNull() }?.streamIcon
                "series" -> {
                    val epId = wp.contentId.removePrefix("series_")
                    var seriesId = epId.toIntOrNull()
                    if (seriesId != null && series.none { it.seriesId == seriesId }) {
                        if (episodeToSeries.isEmpty()) {
                            seriesDao.getAllEpisodesBySource(source.id).forEach { e ->
                                episodeToSeries[e.episodeId] = e.seriesId
                            }
                        }
                        seriesId = episodeToSeries[epId] ?: seriesId
                    }
                    series.find { it.seriesId == seriesId }?.cover
                }
                "live" -> live.find { it.streamId == wp.contentId.removePrefix("live_").toIntOrNull() }?.streamIcon
                else -> null
            }
            val finalId = if (wp.contentType == "series") {
                val epId = wp.contentId.removePrefix("series_")
                if (episodeToSeries.isEmpty() && series.none { it.seriesId == epId.toIntOrNull() }) {
                    seriesDao.getAllEpisodesBySource(source.id).forEach { e ->
                        episodeToSeries[e.episodeId] = e.seriesId
                    }
                }
                val seriesId = episodeToSeries[epId] ?: epId.toIntOrNull()
                seriesId?.let { "series_$it" } ?: wp.contentId
            } else wp.contentId
            wp.copy(icon = icon ?: wp.icon, contentId = finalId)
        }.groupBy { it.contentId }
            .map { (_, items) -> items.maxByOrNull { it.position } ?: items.first() }
            .sortedByDescending { it.lastWatched }
            .take(10)
        val catNames = enriched.associate { wp ->
            val id = wp.contentId.removePrefix("vod_").removePrefix("series_").removePrefix("live_").toIntOrNull()
            val name = when (wp.contentType) {
                "live" -> live.find { it.streamId == id }?.categoryId?.let { cid -> liveCatMap[cid] }
                "vod" -> vod.find { it.streamId == id }?.categoryId?.let { cid -> vodCatMap[cid] }
                "series" -> series.find { it.seriesId == id }?.categoryId?.let { cid -> seriesCatMap[cid] }
                else -> null
            }
            wp.contentId to (name ?: "")
        }.filter { it.value.isNotEmpty() }

        val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val fmtFull = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())

        fun parseTimestamp(raw: String?): Long {
            if (raw.isNullOrBlank()) return 0L
            val s = raw.trim()
            s.toLongOrNull()?.let { return it * 1000 }
            return try { fmtFull.parse(s)?.time ?: 0L } catch (_: Exception) { 0L }
                .let { if (it != 0L) it else try { fmt.parse(s)?.time ?: 0L } catch (_: Exception) { 0L } }
        }

        val recentItems = buildList {
            live.forEach { add(RecentItem.Live(it, parseTimestamp(it.added))) }
            vod.forEach { add(RecentItem.Movie(it, parseTimestamp(it.added))) }
            series.forEach { add(RecentItem.Series(it, parseTimestamp(it.lastModified))) }
        }.sortedByDescending { it.timestamp }

        return HomeSection(
            username = source.username,
            liveCount = live.size,
            movieCount = vod.size,
            seriesCount = series.size,
            favoriteStreams = favStreams.filter { it.categoryId !in lockedLiveIds },
            favoriteMovies = favVods.filter { it.type == "movie" && it.categoryId !in lockedVodIds },
            favoriteSeries = favVods.filter { it.type == "series" && it.categoryId !in lockedSeriesIds },
            recentItems = recentItems,
            continueWatching = enriched.take(10),
             continueCategoryNames = catNames,
             liveCategoryNames = liveCatMap,
             vodCategoryNames = vodCatMap,
             seriesCategoryNames = seriesCatMap,
             seriesIdToCategoryName = series.filter { it.categoryId != null }.associate { it.seriesId to (seriesCatMap[it.categoryId] ?: "") }.filterValues { it.isNotEmpty() },
            vodRating = vodRatingMap,
            seriesRating = seriesRatingMap
        )
    }

    private fun buildRatingMaps(vod: List<VodStreamEntity>, series: List<SeriesEntity>): Pair<Map<Int, String>, Map<Int, String>> {
        val vodMap = vod.filter { !it.rating.isNullOrBlank() }.associate { it.streamId to it.rating!! }
        val seriesMap = series.filter { !it.rating.isNullOrBlank() }.associate { it.seriesId to it.rating!! }
        return vodMap to seriesMap
    }

    private fun loadUserInfo() {
        viewModelScope.launch {
            val source = sourceRepository.getActiveSource().first()
            val expiry = sourcePreferences.expDate.first()
            _data.value = _data.value.copy(
                username = source?.username ?: "",
                expiryDate = formatExpiry(expiry)
            )
        }
    }

    private fun formatExpiry(dateStr: String?): String {
        if (dateStr == null || dateStr.isBlank()) return ""
        val timestamp = dateStr.toLongOrNull()
        if (timestamp != null) {
            val cal = java.util.Calendar.getInstance().apply { timeInMillis = timestamp * 1000 }
            return "%04d-%02d-%02d".format(cal.get(java.util.Calendar.YEAR), cal.get(java.util.Calendar.MONTH) + 1, cal.get(java.util.Calendar.DAY_OF_MONTH))
        }
        return dateStr.take(10)
    }

    fun removeFavorite(item: Any) {
        viewModelScope.launch {
            val source = sourceRepository.getActiveSource().first() ?: return@launch
            when (item) {
                is FavoriteStreamEntity -> favoriteStreamDao.delete(item.streamId, source.id)
                is FavoriteVodEntity -> favoriteVodDao.delete(item.vodId, source.id, item.type)
            }
        }
    }

    fun refresh() {
        _isRefreshing.value = true
        _refreshTrigger.value = System.currentTimeMillis()
    }
}