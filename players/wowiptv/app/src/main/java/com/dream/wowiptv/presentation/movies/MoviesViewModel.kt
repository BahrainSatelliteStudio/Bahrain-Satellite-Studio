package com.dream.wowiptv.presentation.movies

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dream.wowiptv.R
import com.dream.wowiptv.data.local.AppPreferences
import com.dream.wowiptv.domain.model.VodCategory
import com.dream.wowiptv.domain.model.VodStream
import com.dream.wowiptv.domain.usecase.CreateFavoriteUseCase
import com.dream.wowiptv.domain.usecase.GetVodCategoriesUseCase
import com.dream.wowiptv.domain.usecase.GetVodStreamsUseCase
import com.dream.wowiptv.domain.repository.SourceRepository
import com.dream.wowiptv.presentation.common.CategoryLocks
import com.dream.wowiptv.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
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
class MoviesViewModel @Inject constructor(
    private val getVodCategoriesUseCase: GetVodCategoriesUseCase,
    private val getVodStreamsUseCase: GetVodStreamsUseCase,
    private val createFavoriteUseCase: CreateFavoriteUseCase,
    private val appPreferences: AppPreferences,
    private val sourceRepository: SourceRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    val gridColumns: StateFlow<Int> = appPreferences.contentGridColumns
        .stateIn(viewModelScope, SharingStarted.Eagerly, 2)

    val lockedCategories: StateFlow<Set<Int>> = combine(
        appPreferences.categoryLocks,
        sourceRepository.getActiveSource()
    ) { locks, source ->
        CategoryLocks.lockedIds(CategoryLocks.TYPE_VOD, locks, source?.id)
    }.stateIn(viewModelScope, SharingStarted.Eagerly, emptySet())

    private val _pendingLockedCategory = MutableStateFlow<Int?>(null)
    val pendingLockedCategory: StateFlow<Int?> = _pendingLockedCategory.asStateFlow()

    private val _unlockedCategories = MutableStateFlow<Set<Int>>(emptySet())
    val unlockedCategories: StateFlow<Set<Int>> = _unlockedCategories.asStateFlow()

    val categoryLockPassword: StateFlow<String> = appPreferences.categoryLockPassword
        .stateIn(viewModelScope, SharingStarted.Eagerly, "")

    val categories: StateFlow<UiState<List<VodCategory>>> = getVodCategoriesUseCase()
        .map { UiState.Success(it) as UiState<List<VodCategory>> }
        .catch { emit(UiState.Error(it.message ?: context.getString(R.string.err_load_categories))) }
        .onStart { emit(UiState.Loading) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, UiState.Loading)

    private val _selectedCategoryId = MutableStateFlow<Int?>(null)
    val selectedCategoryId: StateFlow<Int?> = _selectedCategoryId.asStateFlow()

    private val _refreshTrigger = MutableStateFlow(0L)

    val streams: StateFlow<UiState<List<VodStream>>> = combine(
        _selectedCategoryId,
        _refreshTrigger,
        lockedCategories,
        unlockedCategories
    ) { categoryId, _, locked, unlocked -> categoryId to (locked - unlocked) }
        .flatMapLatest { (categoryId, blockedCategoryIds) ->
            if (categoryId == null) {
                getVodStreamsUseCase(null)
                    .map { all ->
                        UiState.Success(all.filter { it.categoryId !in blockedCategoryIds }) as UiState<List<VodStream>>
                    }
                    .catch { emit(UiState.Error(it.message ?: context.getString(R.string.err_load_movies))) }
                    .onStart { emit(UiState.Loading) }
            } else {
                getVodStreamsUseCase(categoryId)
                    .map { UiState.Success(it) as UiState<List<VodStream>> }
                    .catch { emit(UiState.Error(it.message ?: context.getString(R.string.err_load_movies))) }
                    .onStart { emit(UiState.Loading) }
            }
        }
        .stateIn(viewModelScope, SharingStarted.Eagerly, UiState.Loading)

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    val filteredStreams: StateFlow<UiState<List<VodStream>>> = combine(
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
    ) { source, locked, unlocked -> Pair(source, locked - unlocked) }
        .flatMapLatest { (source, blockedCategoryIds) ->
            if (source == null) {
                flowOf(emptyMap())
            } else {
                getVodStreamsUseCase(null)
                    .map { all ->
                        all
                            .filter { it.categoryId !in blockedCategoryIds }
                            .groupBy { it.categoryId }
                            .mapValues { it.value.size }
                    }
            }
        }
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyMap())

    private val _favoriteIds = MutableStateFlow<Set<Int>>(emptySet())
    val favoriteIds: StateFlow<Set<Int>> = _favoriteIds.asStateFlow()

    init {
        viewModelScope.launch {
            createFavoriteUseCase.getMovieFavoriteIds().collect { ids ->
                _favoriteIds.value = ids
            }
        }
    }

    fun toggleFavorite(vodId: Int, name: String, icon: String?, categoryId: Int) {
        viewModelScope.launch {
            createFavoriteUseCase.toggleMovie(vodId, name, icon, categoryId)
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

    fun setContentGridColumns(columns: Int) {
        viewModelScope.launch { appPreferences.setContentGridColumns(columns) }
    }

    fun refresh() {
        _refreshTrigger.value = System.currentTimeMillis()
    }
}