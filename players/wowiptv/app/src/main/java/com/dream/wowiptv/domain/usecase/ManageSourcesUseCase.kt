package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.domain.model.XtreamSource
import com.dream.wowiptv.domain.repository.SourceRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class ManageSourcesUseCase @Inject constructor(
    private val sourceRepository: SourceRepository
) {
    fun getSources(): Flow<List<XtreamSource>> = sourceRepository.getSources()

    fun getActiveSource(): Flow<XtreamSource?> = sourceRepository.getActiveSource()

    suspend fun addSource(
        name: String,
        serverUrl: String,
        port: Int,
        username: String,
        password: String,
        type: String = "xtream"
    ): Long = sourceRepository.addSource(name, serverUrl, port, username, password, type)

    suspend fun updateSource(source: XtreamSource) {
        sourceRepository.updateSource(source)
    }

    suspend fun deleteSource(id: Long) {
        sourceRepository.deleteSource(id)
    }

    suspend fun switchSource(id: Long) {
        sourceRepository.switchSource(id)
    }
}
