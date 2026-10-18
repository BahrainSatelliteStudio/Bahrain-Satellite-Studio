package com.dream.wowiptv.data.repository

import com.dream.wowiptv.data.local.dao.EpgDao
import com.dream.wowiptv.data.local.dao.LiveCategoryDao
import com.dream.wowiptv.data.local.dao.LiveStreamDao
import com.dream.wowiptv.data.local.entity.EpgEntity
import com.dream.wowiptv.data.local.entity.LiveStreamEntity
import com.dream.wowiptv.data.mapper.toDomain
import com.dream.wowiptv.data.mapper.toEntity
import com.dream.wowiptv.data.remote.xtream.DynamicBaseUrlInterceptor
import com.dream.wowiptv.data.remote.xtream.XtreamApi
import com.dream.wowiptv.domain.model.EpgEntry
import com.dream.wowiptv.domain.model.LiveCategory
import com.dream.wowiptv.domain.model.LiveStream
import com.dream.wowiptv.domain.model.XtreamSource
import com.dream.wowiptv.domain.repository.LiveTvRepository
import com.dream.wowiptv.domain.repository.SourceRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LiveTvRepositoryImpl @Inject constructor(
    private val api: XtreamApi,
    private val liveCategoryDao: LiveCategoryDao,
    private val liveStreamDao: LiveStreamDao,
    private val epgDao: EpgDao,
    private val sourceRepository: SourceRepository,
    private val baseUrlInterceptor: DynamicBaseUrlInterceptor
) : LiveTvRepository {

    @OptIn(ExperimentalCoroutinesApi::class)
    override fun getCategories(): Flow<List<LiveCategory>> =
        sourceRepository.getActiveSource().flatMapLatest { source ->
            if (source == null) {
                flowOf(emptyList())
            } else {
                liveCategoryDao.getBySource(source.id).map { entities ->
                    entities.map { it.toDomain() }
                }
            }
        }

    @OptIn(ExperimentalCoroutinesApi::class)
    override fun getStreams(categoryId: Int?): Flow<List<LiveStream>> =
        sourceRepository.getActiveSource().flatMapLatest { source ->
            if (source == null) {
                flowOf(emptyList())
            } else {
                liveStreamDao.getBySourceAndCategory(source.id, categoryId).map { entities ->
                    entities.map { it.toDomain() }
                }
            }
        }

    override fun getShortEpg(streamId: Int): Flow<List<EpgEntry>> = flow {
        val source = sourceRepository.getActiveSource().first()
        if (source == null) {
            emit(emptyList())
            return@flow
        }
        emitAll(
            epgDao.getByStream(streamId, source.id).map { entities ->
                entities.map { it.toDomain() }
            }
        )
    }

    override suspend fun refreshAll() {
        val source = sourceRepository.getActiveSource().first() ?: return
        configureBaseUrl(source.serverUrl, source.port)

        val liveCategories = api.getLiveCategories(source.username, source.password)
        val liveStreams = api.getLiveStreams(source.username, source.password)

        liveCategoryDao.deleteBySource(source.id)
        liveCategoryDao.insertAll(liveCategories.map { it.toDomain().toEntity(source.id) })

        liveStreamDao.deleteBySource(source.id)
        liveStreamDao.insertAll(liveStreams.map { it.toDomain().toEntity(source.id) })
    }

    override suspend fun refreshEpg(streamId: Int) {
        val source = sourceRepository.getActiveSource().first() ?: return
        configureBaseUrl(source.serverUrl, source.port)

        val epgResponse = api.getShortEpg(username = source.username, password = source.password, streamId = streamId)
        val entries = epgResponse.toDomain(streamId)

        epgDao.deleteByStream(streamId, source.id)
        epgDao.insertAll(entries.map { it.toEntity(streamId, source.id) })
    }

    override suspend fun refreshAllEpg() {
        val source = sourceRepository.getActiveSource().first() ?: return
        configureBaseUrl(source.serverUrl, source.port)

        val channels = liveStreamDao.getBySource(source.id).first()
        channels.chunked(8).forEach { batch ->
            coroutineScope {
                batch.map { channel ->
                    async(Dispatchers.IO) {
                        runCatching {
                            val entries = fetchShortEpg(channel.streamId, source)
                            epgDao.deleteByStream(channel.streamId, source.id)
                            epgDao.insertAll(entries)
                        }
                    }
                }.awaitAll()
            }
        }
    }

    private suspend fun fetchShortEpg(streamId: Int, source: XtreamSource): List<EpgEntity> {
        val resp = api.getShortEpg(source.username, source.password, streamId = streamId, limit = 12)
        return resp.toDomain(streamId).map { it.toEntity(streamId, source.id) }
    }

    override fun getAllEpg(): Flow<Map<Int, List<EpgEntry>>> = flow {
        val source = sourceRepository.getActiveSource().first()
        if (source == null) {
            emit(emptyMap())
            return@flow
        }
        emitAll(
            epgDao.getBySource(source.id).map { entities ->
                entities.map { it.toDomain() }.groupBy { it.streamId }
            }
        )
    }

    private fun configureBaseUrl(serverUrl: String, port: Int) {
        baseUrlInterceptor.setBaseUrl("http://$serverUrl:$port")
    }
}
