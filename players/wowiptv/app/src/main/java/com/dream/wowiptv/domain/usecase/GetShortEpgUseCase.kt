package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.domain.model.EpgEntry
import com.dream.wowiptv.domain.repository.LiveTvRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetShortEpgUseCase @Inject constructor(
    private val repository: LiveTvRepository
) {
    operator fun invoke(streamId: Int): Flow<List<EpgEntry>> = repository.getShortEpg(streamId)
}
