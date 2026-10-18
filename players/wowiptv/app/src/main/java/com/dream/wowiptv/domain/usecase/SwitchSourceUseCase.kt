package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.data.local.SourcePreferences
import com.dream.wowiptv.data.repository.M3uRepository
import com.dream.wowiptv.domain.repository.LiveTvRepository
import com.dream.wowiptv.domain.repository.SeriesRepository
import com.dream.wowiptv.domain.repository.SourceRepository
import com.dream.wowiptv.domain.repository.VodRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
import javax.inject.Inject

class SwitchSourceUseCase @Inject constructor(
    private val sourceRepository: SourceRepository,
    private val liveTvRepository: LiveTvRepository,
    private val vodRepository: VodRepository,
    private val seriesRepository: SeriesRepository,
    private val m3uRepository: M3uRepository,
    private val getUserInfoUseCase: GetUserInfoUseCase,
    private val sourcePreferences: SourcePreferences
) {
    suspend operator fun invoke(sourceId: Long) {
        supervisorScope {
            sourceRepository.switchSource(sourceId)
            val active = sourceRepository.getActiveSource().first()
            if (active?.type == "m3u") {
                active?.let { source ->
                    launch { runCatching { m3uRepository.refreshAll(source) } }
                }
            } else {
                launch { runCatching { liveTvRepository.refreshAll() } }
                launch { runCatching { vodRepository.refreshAll() } }
                launch { runCatching { seriesRepository.refreshAll() } }
            }
            launch { refreshMemberInfo() }
        }
    }

    private suspend fun refreshMemberInfo() {
        try {
            val info = getUserInfoUseCase()
            if (info != null) {
                sourcePreferences.saveUserInfo(info)
            } else {
                sourcePreferences.clearUserInfo()
            }
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (_: Exception) {
            sourcePreferences.clearUserInfo()
        }
    }
}
