package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.domain.model.SeriesCategory
import com.dream.wowiptv.domain.repository.SeriesRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetSeriesCategoriesUseCase @Inject constructor(
    private val repository: SeriesRepository
) {
    operator fun invoke(): Flow<List<SeriesCategory>> = repository.getCategories()
}
