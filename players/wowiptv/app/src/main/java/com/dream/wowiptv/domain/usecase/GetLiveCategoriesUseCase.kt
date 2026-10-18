package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.domain.model.LiveCategory
import com.dream.wowiptv.domain.repository.LiveTvRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetLiveCategoriesUseCase @Inject constructor(
    private val repository: LiveTvRepository
) {
    operator fun invoke(): Flow<List<LiveCategory>> = repository.getCategories()
}
