package com.dream.wowiptv.presentation.player

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dream.wowiptv.data.local.AppPreferences
import com.dream.wowiptv.domain.model.EpgEntry
import com.dream.wowiptv.domain.usecase.GetShortEpgUseCase
import com.dream.wowiptv.domain.usecase.PlayStreamUseCase
import com.dream.wowiptv.domain.usecase.ResolveStreamMimeUseCase
import com.dream.wowiptv.domain.usecase.WatchProgressUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PlayerViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val playStreamUseCase: PlayStreamUseCase,
    private val getShortEpgUseCase: GetShortEpgUseCase,
    private val watchProgressUseCase: WatchProgressUseCase,
    private val resolveStreamMimeUseCase: ResolveStreamMimeUseCase,
    appPreferences: AppPreferences
) : ViewModel() {

    val streamType: String = savedStateHandle["streamType"] ?: "live"
    val streamId: String = savedStateHandle["streamId"] ?: "0"
    val streamName: String = decodeName(savedStateHandle["name"] ?: "")
    val episodeIds: List<String> = (savedStateHandle["episodes"] ?: "").split(",").filter { it.isNotBlank() }

    val defaultPlaybackSpeed: StateFlow<Float> = appPreferences.defaultPlaybackSpeed
        .stateIn(viewModelScope, SharingStarted.Eagerly, 1f)

    val showPlayerStatus: StateFlow<Boolean> = appPreferences.showPlayerStatus
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val autoplayNextEpisode: StateFlow<Boolean> = appPreferences.autoplayNextEpisode
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    private val _streamUrl = MutableStateFlow("")
    val streamUrl: StateFlow<String> = _streamUrl.asStateFlow()

    private val _streamMimeType = MutableStateFlow<String?>(null)
    val streamMimeType: StateFlow<String?> = _streamMimeType.asStateFlow()

    private val _epgEntries = MutableStateFlow<List<EpgEntry>>(emptyList())
    val epgEntries: StateFlow<List<EpgEntry>> = _epgEntries.asStateFlow()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _currentEpisodeId = MutableStateFlow(streamId)
    val currentEpisodeId: StateFlow<String> = _currentEpisodeId.asStateFlow()

    private val _currentTitle = MutableStateFlow(streamName)
    val currentTitle: StateFlow<String> = _currentTitle.asStateFlow()

    init {
        loadStreamUrl()
        if (streamType == "live") {
            observeEpg()
        }
    }

    fun nextEpisodeId(): String? {
        if (streamType != "series") return null
        val idx = episodeIds.indexOfFirst { it == _currentEpisodeId.value }
        if (idx < 0 || idx >= episodeIds.lastIndex) return null
        return episodeIds[idx + 1]
    }

    fun playNextEpisode(episodeId: String, title: String) {
        viewModelScope.launch {
            _currentEpisodeId.value = episodeId
            if (title.isNotBlank()) _currentTitle.value = title
            try {
                _streamUrl.value = playStreamUseCase(
                    PlayStreamUseCase.StreamType.Series(episodeId)
                )
                _streamMimeType.value = try {
                    resolveStreamMimeUseCase(_streamUrl.value)
                } catch (e: Exception) {
                    android.util.Log.e("PlayerVM", "resolve mime failed", e)
                    null
                }
            } catch (e: Exception) {
                android.util.Log.e("PlayerVM", "playNextEpisode failed", e)
            }
        }
    }

    private fun loadStreamUrl() {
        viewModelScope.launch {
            try {
                val idNum = streamId.toIntOrNull() ?: 0
                val type = when (streamType) {
                    "live" -> PlayStreamUseCase.StreamType.Live(idNum)
                    "vod" -> PlayStreamUseCase.StreamType.Vod(idNum)
                    "series" -> PlayStreamUseCase.StreamType.Series(streamId)
                    else -> PlayStreamUseCase.StreamType.Live(idNum)
                }
                _streamUrl.value = playStreamUseCase(type)
                _streamMimeType.value = try {
                    resolveStreamMimeUseCase(_streamUrl.value)
                } catch (e: Exception) {
                    android.util.Log.e("PlayerVM", "resolve mime failed", e)
                    null
                }
                if (streamType == "live") {
                    val contentId = "live_$streamId"
                    val pos = System.currentTimeMillis() / 1000
                    watchProgressUseCase.saveProgress(contentId, "live", streamName, null, pos, 0L)
                }
            } catch (e: Exception) {
                android.util.Log.e("PlayerVM", "loadStreamUrl failed", e)
            }
        }
    }

    private fun observeEpg() {
        viewModelScope.launch {
            getShortEpgUseCase(streamId.toIntOrNull() ?: 0).collect { entries ->
                _epgEntries.value = entries
            }
        }
    }

    fun saveProgress(contentId: String, position: Long, duration: Long) {
        viewModelScope.launch {
            try {
                val name = if (_currentTitle.value.isNotBlank()) _currentTitle.value else {
                    watchProgressUseCase.getProgressName(contentId) ?: streamName
                }
                val pos = if (streamType == "live") System.currentTimeMillis() / 1000 else position
                watchProgressUseCase.saveProgress(
                    contentId = contentId,
                    contentType = streamType,
                    name = name,
                    icon = null,
                    position = pos,
                    duration = duration
                )
            } catch (e: Exception) {
                android.util.Log.e("PlayerVM", "save failed", e)
            }
        }
    }

    fun play() {
        _isPlaying.value = true
    }

    fun pause() {
        _isPlaying.value = false
    }

    fun togglePlay() {
        _isPlaying.value = !_isPlaying.value
    }

    private fun decodeName(raw: String): String {
        return try {
            java.net.URLDecoder.decode(raw, "UTF-8")
        } catch (_: Exception) {
            raw
        }
    }
}
