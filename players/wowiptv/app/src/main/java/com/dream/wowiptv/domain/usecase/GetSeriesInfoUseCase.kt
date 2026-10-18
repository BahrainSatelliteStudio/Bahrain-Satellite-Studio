package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.domain.model.SeriesInfo
import com.dream.wowiptv.domain.repository.SeriesRepository
import javax.inject.Inject

class GetSeriesInfoUseCase @Inject constructor(
    private val repository: SeriesRepository
) {
    suspend operator fun invoke(seriesId: Int, forceRefresh: Boolean = false): SeriesInfo = repository.getInfo(seriesId, forceRefresh)
}
