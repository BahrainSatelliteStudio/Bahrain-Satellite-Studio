package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.domain.model.VodStream
import com.dream.wowiptv.domain.repository.VodRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetVodStreamsUseCase @Inject constructor(
    private val repository: VodRepository
) {
    operator fun invoke(categoryId: Int? = null): Flow<List<VodStream>> = repository.getStreams(categoryId)
}
