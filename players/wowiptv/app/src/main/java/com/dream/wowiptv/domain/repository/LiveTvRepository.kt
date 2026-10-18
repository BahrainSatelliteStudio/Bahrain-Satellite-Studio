package com.dream.wowiptv.domain.repository

import com.dream.wowiptv.domain.model.EpgEntry
import com.dream.wowiptv.domain.model.LiveCategory
import com.dream.wowiptv.domain.model.LiveStream
import kotlinx.coroutines.flow.Flow

interface LiveTvRepository {
    fun getCategories(): Flow<List<LiveCategory>>
    fun getStreams(categoryId: Int?): Flow<List<LiveStream>>
    fun getShortEpg(streamId: Int): Flow<List<EpgEntry>>
    suspend fun refreshAll()
    suspend fun refreshAllEpg()
    suspend fun refreshEpg(streamId: Int)
    fun getAllEpg(): Flow<Map<Int, List<EpgEntry>>>
}
