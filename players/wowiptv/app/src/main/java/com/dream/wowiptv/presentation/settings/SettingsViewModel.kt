package com.dream.wowiptv.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dream.wowiptv.BuildConfig
import com.dream.wowiptv.data.local.AppPreferences
import com.dream.wowiptv.data.local.SourcePreferences
import com.dream.wowiptv.data.local.dao.DataCleanupDao
import com.dream.wowiptv.domain.model.UserInfo
import com.dream.wowiptv.domain.model.XtreamSource
import com.dream.wowiptv.domain.usecase.GetUserInfoUseCase
import com.dream.wowiptv.domain.usecase.ManageSourcesUseCase
import com.dream.wowiptv.domain.usecase.SwitchSourceUseCase
import com.dream.wowiptv.domain.usecase.TestSourceUseCase
import com.dream.wowiptv.domain.usecase.SourceTestResult
import com.dream.wowiptv.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val manageSourcesUseCase: ManageSourcesUseCase,
    private val switchSourceUseCase: SwitchSourceUseCase,
    private val getUserInfoUseCase: GetUserInfoUseCase,
    private val sourcePreferences: SourcePreferences,
    private val appPreferences: AppPreferences,
    private val dataCleanupDao: DataCleanupDao,
    private val testSourceUseCase: TestSourceUseCase,
) : ViewModel() {

    val versionName: String = BuildConfig.VERSION_NAME

    val userInfo: StateFlow<UserInfo?> = sourcePreferences.userInfo
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    private val _refreshingUser = MutableStateFlow(false)
    val refreshingUser: StateFlow<Boolean> = _refreshingUser.asStateFlow()

    private val _syncingAll = MutableStateFlow(false)
    val syncingAll: StateFlow<Boolean> = _syncingAll.asStateFlow()

    private val _clearingCache = MutableStateFlow(false)
    val clearingCache: StateFlow<Boolean> = _clearingCache.asStateFlow()

    val defaultPlaybackSpeed: StateFlow<Float> = appPreferences.defaultPlaybackSpeed
        .stateIn(viewModelScope, SharingStarted.Eagerly, 1f)

    val showPlayerStatus: StateFlow<Boolean> = appPreferences.showPlayerStatus
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val autoplayNextEpisode: StateFlow<Boolean> = appPreferences.autoplayNextEpisode
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val showContinueWatching: StateFlow<Boolean> = appPreferences.showContinueWatching
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val showFavorites: StateFlow<Boolean> = appPreferences.showFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val showRecent: StateFlow<Boolean> = appPreferences.showRecent
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val splashPreload: StateFlow<Boolean> = appPreferences.splashPreload
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val showCastAvatars: StateFlow<Boolean> = appPreferences.showCastAvatars
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val tmdbApiKey: StateFlow<String> = appPreferences.tmdbApiKey
        .stateIn(viewModelScope, SharingStarted.Eagerly, "")

    val themeColor: StateFlow<String> = appPreferences.themeColor
        .stateIn(viewModelScope, SharingStarted.Eagerly, "purple")

    val contentGridColumns: StateFlow<Int> = appPreferences.contentGridColumns
        .stateIn(viewModelScope, SharingStarted.Eagerly, 2)

    val posterContentScale: StateFlow<String> = appPreferences.posterContentScale
        .stateIn(viewModelScope, SharingStarted.Eagerly, "cover")

    val categoryLockPassword: StateFlow<String> = appPreferences.categoryLockPassword
        .stateIn(viewModelScope, SharingStarted.Eagerly, "")

    init {
        viewModelScope.launch {
            // Only auto-fetch VIP info when there is no cached copy; otherwise
            // entering settings would trigger a network request every time.
            val cached = sourcePreferences.userInfo.first()
            if (cached == null) {
                refreshUserInfo()
            }
        }
        observeActiveSourceForUserInfo()
    }

    private fun observeActiveSourceForUserInfo() {
        viewModelScope.launch {
            var lastSourceId: Long? = null
            manageSourcesUseCase.getActiveSource().collect { source ->
                val newId = source?.id
                if (lastSourceId != null && newId != lastSourceId) {
                    refreshUserInfo()
                }
                lastSourceId = newId
            }
        }
    }

    suspend fun testXtream(host: String, port: Int, username: String, password: String): SourceTestResult =
        testSourceUseCase.testXtream(host, port, username, password)

    suspend fun testM3u(url: String?, content: String?): SourceTestResult =
        testSourceUseCase.testM3u(url, content)

    fun setDefaultPlaybackSpeed(speed: Float) {
        viewModelScope.launch { appPreferences.setDefaultPlaybackSpeed(speed) }
    }

    fun setShowPlayerStatus(show: Boolean) {
        viewModelScope.launch { appPreferences.setShowPlayerStatus(show) }
    }

    fun setAutoplayNextEpisode(enabled: Boolean) {
        viewModelScope.launch { appPreferences.setAutoplayNextEpisode(enabled) }
    }

    fun setShowContinueWatching(show: Boolean) {
        viewModelScope.launch { appPreferences.setShowContinueWatching(show) }
    }

    fun setShowFavorites(show: Boolean) {
        viewModelScope.launch { appPreferences.setShowFavorites(show) }
    }

    fun setShowRecent(show: Boolean) {
        viewModelScope.launch { appPreferences.setShowRecent(show) }
    }

    fun setSplashPreload(enabled: Boolean) {
        viewModelScope.launch { appPreferences.setSplashPreload(enabled) }
    }

    fun setShowCastAvatars(show: Boolean) {
        viewModelScope.launch { appPreferences.setShowCastAvatars(show) }
    }

    fun setTmdbApiKey(key: String) {
        viewModelScope.launch { appPreferences.setTmdbApiKey(key) }
    }

    fun setThemeColor(key: String) {
        viewModelScope.launch { appPreferences.setThemeColor(key) }
    }

    fun setContentGridColumns(columns: Int) {
        viewModelScope.launch { appPreferences.setContentGridColumns(columns) }
    }

    fun setPosterContentScale(scale: String) {
        viewModelScope.launch { appPreferences.setPosterContentScale(scale) }
    }

    fun setCategoryLockPassword(password: String) {
        viewModelScope.launch {
            appPreferences.setCategoryLockPassword(password)
            if (password.trim().isEmpty()) {
                appPreferences.setCategoryLocks(emptySet())
            }
        }
    }

    fun refreshUserInfo() {
        viewModelScope.launch {
            if (_refreshingUser.value) return@launch
            _refreshingUser.value = true
            val result = getUserInfoUseCase()
            if (result != null) {
                sourcePreferences.saveUserInfo(result)
            }
            _refreshingUser.value = false
        }
    }

    fun clearHistory() {
        viewModelScope.launch {
            dataCleanupDao.clearWatchProgress()
        }
    }

    fun clearFavorites() {
        viewModelScope.launch {
            dataCleanupDao.clearFavoriteStreams()
            dataCleanupDao.clearFavoriteVod()
        }
    }

    fun clearCacheAndResync() {
        viewModelScope.launch {
            _clearingCache.value = true
            try {
                dataCleanupDao.clearContentCache()
                val active = manageSourcesUseCase.getActiveSource().first()
                if (active != null) {
                    switchSourceUseCase(active.id)
                }
            } finally {
                _clearingCache.value = false
            }
        }
    }

    fun syncAllSources() {
        viewModelScope.launch {
            _syncingAll.value = true
            try {
                val all = manageSourcesUseCase.getSources().first()
                val activeId = manageSourcesUseCase.getActiveSource().first()?.id
                all.forEach { source ->
                    switchSourceUseCase(source.id)
                }
                if (activeId != null) {
                    switchSourceUseCase(activeId)
                }
            } finally {
                _syncingAll.value = false
            }
        }
    }

    val sources: StateFlow<UiState<List<XtreamSource>>> = manageSourcesUseCase.getSources()
        .map { list ->
            if (list.isEmpty()) UiState.Empty else UiState.Success(list)
        }
        .catch { e -> emit(UiState.Error(e.message ?: "Unknown error")) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, UiState.Loading)

    val activeSourceId: StateFlow<Long?> = manageSourcesUseCase.getActiveSource()
        .map { it?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    private val _syncingIds = MutableStateFlow<Set<Long>>(emptySet())
    val syncingIds: StateFlow<Set<Long>> = _syncingIds.asStateFlow()

    suspend fun addSource(name: String, serverUrl: String, port: Int, username: String, password: String, type: String = "xtream"): Long {
        val newId = manageSourcesUseCase.addSource(name, serverUrl, port, username, password, type)
        switchSourceUseCase(newId)
        return newId
    }

    suspend fun updateSource(id: Long, name: String, serverUrl: String, port: Int, username: String, password: String) {
        manageSourcesUseCase.updateSource(
            XtreamSource(id, name, serverUrl, port, username, password)
        )
    }

    fun deleteSource(id: Long) {
        viewModelScope.launch {
            manageSourcesUseCase.deleteSource(id)
        }
    }

    fun switchSource(id: Long) {
        viewModelScope.launch {
            _syncingIds.update { it + id }
            try {
                switchSourceUseCase(id)
            } finally {
                _syncingIds.update { it - id }
            }
        }
    }

    fun syncSource(id: Long) {
        viewModelScope.launch {
            _syncingIds.update { it + id }
            try {
                switchSourceUseCase(id)
            } finally {
                _syncingIds.update { it - id }
            }
        }
    }
}
