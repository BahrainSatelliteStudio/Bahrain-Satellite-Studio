package com.dream.wowiptv.domain.repository

import com.dream.wowiptv.domain.model.XtreamSource
import kotlinx.coroutines.flow.Flow

interface SourceRepository {
    fun getSources(): Flow<List<XtreamSource>>
    fun getActiveSource(): Flow<XtreamSource?>
    suspend fun addSource(name: String, serverUrl: String, port: Int, username: String, password: String, type: String = "xtream"): Long
    suspend fun updateSource(source: XtreamSource)
    suspend fun deleteSource(id: Long)
    suspend fun switchSource(id: Long)
}
