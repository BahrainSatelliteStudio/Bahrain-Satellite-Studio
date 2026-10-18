package com.dream.wowiptv.domain.repository

import com.dream.wowiptv.domain.model.VodCategory
import com.dream.wowiptv.domain.model.VodInfo
import com.dream.wowiptv.domain.model.VodStream
import kotlinx.coroutines.flow.Flow

interface VodRepository {
    fun getCategories(): Flow<List<VodCategory>>
    fun getStreams(categoryId: Int?): Flow<List<VodStream>>
    suspend fun getInfo(vodId: Int, forceRefresh: Boolean = false): VodInfo
    suspend fun refreshAll()
}
