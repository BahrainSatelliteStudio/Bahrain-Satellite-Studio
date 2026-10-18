package com.dream.wowiptv.presentation.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dream.wowiptv.data.local.dao.LiveStreamDao
import com.dream.wowiptv.data.local.dao.SeriesDao
import com.dream.wowiptv.data.local.dao.VodStreamDao
import com.dream.wowiptv.data.local.entity.LiveStreamEntity
import com.dream.wowiptv.data.local.entity.SeriesEntity
import com.dream.wowiptv.data.local.entity.VodStreamEntity
import com.dream.wowiptv.domain.repository.SourceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class SearchResults(
    val live: List<LiveStreamEntity> = emptyList(),
    val movies: List<VodStreamEntity> = emptyList(),
    val series: List<SeriesEntity> = emptyList()
)

@HiltViewModel
class GlobalSearchViewModel @Inject constructor(
    private val sourceRepository: SourceRepository,
    private val liveStreamDao: LiveStreamDao,
    private val vodStreamDao: VodStreamDao,
    private val seriesDao: SeriesDao
) : ViewModel() {

    private val _all = MutableStateFlow<SearchResults?>(null)
    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    val results: StateFlow<SearchResults> = combine(_all, _query) { all, q ->
        val keyword = q.trim()
        if (all == null || keyword.isBlank()) {
            SearchResults()
        } else {
            SearchResults(
                live = all.live.filter { it.name.contains(keyword, ignoreCase = true) },
                movies = all.movies.filter { it.name.orEmpty().contains(keyword, ignoreCase = true) },
                series = all.series.filter { it.name.orEmpty().contains(keyword, ignoreCase = true) }
            )
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), SearchResults())

    fun setQuery(q: String) {
        _query.value = q
    }

    fun load() {
        viewModelScope.launch {
            val source = sourceRepository.getActiveSource().first() ?: return@launch
            _all.value = SearchResults(
                live = liveStreamDao.getBySource(source.id).first(),
                movies = vodStreamDao.getBySource(source.id).first(),
                series = seriesDao.getBySource(source.id).first()
            )
        }
    }
}
