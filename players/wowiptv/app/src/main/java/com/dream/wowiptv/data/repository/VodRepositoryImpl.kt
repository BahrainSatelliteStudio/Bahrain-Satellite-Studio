package com.dream.wowiptv.data.repository

import com.dream.wowiptv.data.local.dao.VodCategoryDao
import com.dream.wowiptv.data.local.dao.VodInfoDao
import com.dream.wowiptv.data.local.dao.VodStreamDao
import com.dream.wowiptv.data.mapper.toCachedEntity
import com.dream.wowiptv.data.mapper.toDomain
import com.dream.wowiptv.data.mapper.toEntity
import com.dream.wowiptv.data.remote.xtream.DynamicBaseUrlInterceptor
import com.dream.wowiptv.data.remote.xtream.XtreamApi
import com.dream.wowiptv.domain.model.VodCategory
import com.dream.wowiptv.domain.model.VodInfo
import com.dream.wowiptv.domain.model.VodStream
import com.dream.wowiptv.domain.repository.SourceRepository
import com.dream.wowiptv.domain.repository.VodRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.flowOf
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class VodRepositoryImpl @Inject constructor(
    private val api: XtreamApi,
    private val vodCategoryDao: VodCategoryDao,
    private val vodStreamDao: VodStreamDao,
    private val vodInfoDao: VodInfoDao,
    private val sourceRepository: SourceRepository,
    private val baseUrlInterceptor: DynamicBaseUrlInterceptor
) : VodRepository {

    @OptIn(ExperimentalCoroutinesApi::class)
    override fun getCategories(): Flow<List<VodCategory>> =
        sourceRepository.getActiveSource().flatMapLatest { source ->
            if (source == null) {
                flowOf(emptyList())
            } else {
                vodCategoryDao.getBySource(source.id).map { entities ->
                    entities.map { it.toDomain() }
                }
            }
        }

    @OptIn(ExperimentalCoroutinesApi::class)
    override fun getStreams(categoryId: Int?): Flow<List<VodStream>> =
        sourceRepository.getActiveSource().flatMapLatest { source ->
            if (source == null) {
                flowOf(emptyList())
            } else {
                vodStreamDao.getBySourceAndCategory(source.id, categoryId).map { entities ->
                    entities.map { it.toDomain() }
                }
            }
        }

    override suspend fun getInfo(vodId: Int, forceRefresh: Boolean): VodInfo {
        val source = sourceRepository.getActiveSource().first() ?: error("No active source")
        if (!forceRefresh) {
            vodInfoDao.get(vodId, source.id)?.let { return it.toDomain() }
        }
        configureBaseUrl(source.serverUrl, source.port)
        val dto = api.getVodInfo(username = source.username, password = source.password, vodId = vodId)
        val info = dto.toDomain()
        vodInfoDao.insert(info.toCachedEntity(source.id))
        return info
    }

    override suspend fun refreshAll() {
        val source = sourceRepository.getActiveSource().first() ?: return
        configureBaseUrl(source.serverUrl, source.port)

        val categories = api.getVodCategories(source.username, source.password)
        val streams = api.getVodStreams(source.username, source.password)

        vodCategoryDao.deleteBySource(source.id)
        vodCategoryDao.insertAll(categories.map { it.toDomain().toEntity(source.id) })

        vodStreamDao.deleteBySource(source.id)
        vodStreamDao.insertAll(streams.map { it.toDomain().toEntity(source.id) })

        vodInfoDao.deleteBySource(source.id)
    }

    private fun configureBaseUrl(serverUrl: String, port: Int) {
        baseUrlInterceptor.setBaseUrl("http://$serverUrl:$port")
    }
}
