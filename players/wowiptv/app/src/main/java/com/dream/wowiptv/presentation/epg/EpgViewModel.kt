package com.dream.wowiptv.presentation.epg

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dream.wowiptv.domain.model.EpgEntry
import com.dream.wowiptv.domain.model.LiveStream
import com.dream.wowiptv.domain.repository.LiveTvRepository
import com.dream.wowiptv.domain.usecase.GetLiveStreamsUseCase
import com.dream.wowiptv.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class EpgViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val liveTvRepository: LiveTvRepository,
    private val getLiveStreamsUseCase: GetLiveStreamsUseCase
) : ViewModel() {

    private val streamId: Int? = savedStateHandle.get<Int>("streamId")?.takeIf { it > 0 }

    private val _selectedChannelId = MutableStateFlow(streamId)
    val selectedChannelId: StateFlow<Int?> = _selectedChannelId.asStateFlow()

    private val _epgData = MutableStateFlow<UiState<Map<Int, List<EpgEntry>>>>(UiState.Loading)
    val epgData: StateFlow<UiState<Map<Int, List<EpgEntry>>>> = _epgData.asStateFlow()

    private val _epgRequestedIds = MutableStateFlow<Set<Int>>(emptySet())

    val channels: StateFlow<UiState<List<LiveStream>>>

    init {
        val channelsFlow = getLiveStreamsUseCase(null)

        channels = channelsFlow
            .map { UiState.Success(it) as UiState<List<LiveStream>> }
            .catch { emit(UiState.Error(it.message ?: "Failed to load channels")) }
            .onStart { emit(UiState.Loading) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), UiState.Loading)

        loadEpg()

        if (streamId == null) {
            viewModelScope.launch {
                val state = channels.first { it is UiState.Success<*> }
                if (state is UiState.Success && state.data.isNotEmpty()) {
                    _selectedChannelId.value = state.data.first().id
                }
            }
        }
    }

    private fun loadEpg() {
        viewModelScope.launch {
            liveTvRepository.getAllEpg().collect { map ->
                _epgData.value = UiState.Success(map)
            }
        }
        viewModelScope.launch {
            _selectedChannelId.value?.let { id ->
                try {
                    liveTvRepository.refreshEpg(id)
                } catch (e: kotlinx.coroutines.CancellationException) {
                    throw e
                } catch (_: Exception) {
                    // 选中频道增量刷新失败忽略，缓存兜底
                }
            }
        }
    }

    fun retryLoadEpg() {
        loadEpg()
    }

    fun selectChannel(id: Int) {
        if (_selectedChannelId.value != id) {
            _selectedChannelId.value = id
        }
        viewModelScope.launch {
            try {
                liveTvRepository.refreshEpg(id)
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (_: Exception) {
                // 增量刷新失败忽略，缓存兜底
            }
        }
    }

    fun ensureEpg(streamId: Int) {
        if (streamId in _epgRequestedIds.value) return
        if (hasEpg(streamId)) {
            _epgRequestedIds.update { it + streamId }
            return
        }
        _epgRequestedIds.update { it + streamId }
        viewModelScope.launch {
            try {
                liveTvRepository.refreshEpg(streamId)
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (_: Exception) {
                // 单个频道 EPG 拉取失败忽略，缓存兜底
            }
        }
    }

    private fun hasEpg(streamId: Int): Boolean {
        val map = (_epgData.value as? UiState.Success)?.data ?: return false
        return map[streamId]?.isNotEmpty() == true
    }
}
