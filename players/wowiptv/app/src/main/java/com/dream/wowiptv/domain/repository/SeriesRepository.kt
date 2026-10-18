package com.dream.wowiptv.domain.repository

import com.dream.wowiptv.domain.model.SeriesCategory
import com.dream.wowiptv.domain.model.SeriesInfo
import com.dream.wowiptv.domain.model.SeriesItem
import kotlinx.coroutines.flow.Flow

interface SeriesRepository {
    fun getCategories(): Flow<List<SeriesCategory>>
    fun getSeries(categoryId: Int?): Flow<List<SeriesItem>>
    suspend fun getInfo(seriesId: Int, forceRefresh: Boolean = false): SeriesInfo
    suspend fun refreshAll()
}
