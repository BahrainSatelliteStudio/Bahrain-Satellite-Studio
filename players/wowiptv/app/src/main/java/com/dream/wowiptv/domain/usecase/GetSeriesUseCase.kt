package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.domain.model.SeriesItem
import com.dream.wowiptv.domain.repository.SeriesRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetSeriesUseCase @Inject constructor(
    private val repository: SeriesRepository
) {
    operator fun invoke(categoryId: Int? = null): Flow<List<SeriesItem>> = repository.getSeries(categoryId)
}
