package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.data.local.dao.WatchProgressDao
import com.dream.wowiptv.data.local.entity.WatchProgressEntity
import com.dream.wowiptv.domain.repository.SourceRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import javax.inject.Inject

data class WatchProgressItem(
    val contentId: String,
    val contentType: String,
    val name: String,
    val icon: String?,
    val position: Long,
    val duration: Long
)

@OptIn(ExperimentalCoroutinesApi::class)
class WatchProgressUseCase @Inject constructor(
    private val watchProgressDao: WatchProgressDao,
    private val sourceRepository: SourceRepository
) {
    private suspend fun getSourceId(): Long {
        return sourceRepository.getActiveSource().first()?.id ?: error("No active source")
    }

    suspend fun saveProgress(contentId: String, contentType: String, name: String, icon: String?, position: Long, duration: Long) {
        val sourceId = getSourceId()
        watchProgressDao.insert(
            WatchProgressEntity(
                contentId = contentId,
                sourceId = sourceId,
                contentType = contentType,
                name = name,
                icon = icon,
                position = position,
                duration = duration,
                lastWatched = System.currentTimeMillis()
            )
        )
    }

    suspend fun getProgress(contentId: String): Long {
        val sourceId = getSourceId()
        return watchProgressDao.getByContentId(contentId, sourceId)?.position ?: 0L
    }

    suspend fun getProgressDuration(contentId: String): Long {
        val sourceId = getSourceId()
        return watchProgressDao.getByContentId(contentId, sourceId)?.duration ?: 0L
    }

    suspend fun getProgressName(contentId: String): String? {
        val source = sourceRepository.getActiveSource().first() ?: return null
        return watchProgressDao.getByContentId(contentId, source.id)?.name
    }

    suspend fun deleteProgress(contentId: String) {
        val sourceId = getSourceId()
        watchProgressDao.delete(contentId, sourceId)
    }

    fun getContinueWatching(): Flow<List<WatchProgressItem>> {
        return sourceRepository.getActiveSource().flatMapLatest { source ->
            if (source == null) kotlinx.coroutines.flow.flowOf(emptyList())
            else watchProgressDao.getAllBySource(source.id).map { list ->
                list.map {
                    WatchProgressItem(
                        contentId = it.contentId,
                        contentType = it.contentType,
                        name = it.name,
                        icon = it.icon,
                        position = it.position,
                        duration = it.duration
                    )
                }
            }
        }
    }
}