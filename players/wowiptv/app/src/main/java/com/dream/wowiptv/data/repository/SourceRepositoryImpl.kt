package com.dream.wowiptv.data.repository

import com.dream.wowiptv.data.local.SourcePreferences
import com.dream.wowiptv.data.local.dao.SourceDao
import com.dream.wowiptv.data.local.entity.SourceEntity
import com.dream.wowiptv.domain.model.XtreamSource
import com.dream.wowiptv.domain.repository.SourceRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SourceRepositoryImpl @Inject constructor(
    private val sourceDao: SourceDao,
    private val sourcePreferences: SourcePreferences
) : SourceRepository {

    override fun getSources(): Flow<List<XtreamSource>> {
        return sourceDao.getAll().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override fun getActiveSource(): Flow<XtreamSource?> {
        return sourceDao.getActive().map { it?.toDomain() }
    }

    override suspend fun addSource(
        name: String,
        serverUrl: String,
        port: Int,
        username: String,
        password: String,
        type: String
    ): Long {
        val entity = SourceEntity(
            name = name,
            serverUrl = serverUrl,
            port = port,
            username = username,
            password = password,
            type = type
        )
        val newId = sourceDao.insert(entity)

        val count = sourceDao.getAll().first().size
        if (count == 1) {
            sourceDao.setActive(newId)
            sourcePreferences.setActiveSourceId(newId)
        }

        return newId
    }

    override suspend fun updateSource(source: XtreamSource) {
        val existing = sourceDao.getById(source.id)
        val entity = SourceEntity(
            id = source.id,
            name = source.name,
            serverUrl = source.serverUrl,
            port = source.port,
            username = source.username,
            password = source.password,
            type = existing?.type ?: source.type,
            isActive = existing?.isActive ?: false
        )
        sourceDao.update(entity)
    }

    override suspend fun deleteSource(id: Long) {
        val wasActive = sourceDao.getById(id)?.isActive == true
        sourceDao.deleteById(id)

        if (wasActive) {
            sourceDao.deactivateAll()
            sourcePreferences.setActiveSourceId(null)

            val nextSource = sourceDao.getFirst()
            if (nextSource != null) {
                sourceDao.setActive(nextSource.id)
                sourcePreferences.setActiveSourceId(nextSource.id)
            }
        }
    }

    override suspend fun switchSource(id: Long) {
        sourceDao.deactivateAll()
        sourceDao.setActive(id)
        sourcePreferences.setActiveSourceId(id)
    }

    private fun SourceEntity.toDomain(): XtreamSource {
        return XtreamSource(
            id = id,
            name = name,
            serverUrl = serverUrl,
            port = port,
            username = username,
            password = password,
            type = type
        )
    }
}
