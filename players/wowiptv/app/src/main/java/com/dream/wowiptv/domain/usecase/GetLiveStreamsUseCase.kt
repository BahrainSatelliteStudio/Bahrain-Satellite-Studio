package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.domain.model.LiveStream
import com.dream.wowiptv.domain.repository.LiveTvRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetLiveStreamsUseCase @Inject constructor(
    private val repository: LiveTvRepository
) {
    operator fun invoke(categoryId: Int? = null): Flow<List<LiveStream>> = repository.getStreams(categoryId)
}
