package com.dream.wowiptv.data.repository

import com.dream.wowiptv.data.local.dao.SeriesCategoryDao
import com.dream.wowiptv.data.local.dao.SeriesDao
import com.dream.wowiptv.data.mapper.toDomain
import com.dream.wowiptv.data.mapper.toEntity
import com.dream.wowiptv.data.remote.xtream.DynamicBaseUrlInterceptor
import com.dream.wowiptv.data.remote.xtream.XtreamApi
import com.dream.wowiptv.domain.model.Episode
import com.dream.wowiptv.domain.model.Season
import com.dream.wowiptv.domain.model.SeriesCategory
import com.dream.wowiptv.domain.model.SeriesInfo
import com.dream.wowiptv.domain.model.SeriesItem
import com.dream.wowiptv.domain.repository.SeriesRepository
import com.dream.wowiptv.domain.repository.SourceRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SeriesRepositoryImpl @Inject constructor(
    private val api: XtreamApi,
    private val seriesCategoryDao: SeriesCategoryDao,
    private val seriesDao: SeriesDao,
    private val sourceRepository: SourceRepository,
    private val baseUrlInterceptor: DynamicBaseUrlInterceptor
) : SeriesRepository {

    @OptIn(ExperimentalCoroutinesApi::class)
    override fun getCategories(): Flow<List<SeriesCategory>> =
        sourceRepository.getActiveSource().flatMapLatest { source ->
            if (source == null) {
                flowOf(emptyList())
            } else {
                seriesCategoryDao.getBySource(source.id).map { entities ->
                    entities.map { it.toDomain() }
                }
            }
        }

    @OptIn(ExperimentalCoroutinesApi::class)
    override fun getSeries(categoryId: Int?): Flow<List<SeriesItem>> =
        sourceRepository.getActiveSource().flatMapLatest { source ->
            if (source == null) {
                flowOf(emptyList())
            } else {
                seriesDao.getBySourceAndCategory(source.id, categoryId).map { entities ->
                    entities.map { it.toDomain() }
                }
            }
        }

    override suspend fun getInfo(seriesId: Int, forceRefresh: Boolean): SeriesInfo {
        val source = sourceRepository.getActiveSource().first() ?: error("No active source")
        val seasonEntities = seriesDao.getSeasons(seriesId, source.id)
        val episodeEntities = seriesDao.getEpisodes(seriesId, source.id)
        if (!forceRefresh && seasonEntities.isNotEmpty() && episodeEntities.isNotEmpty()) {
            val seasons = seasonEntities.map { it.toDomain() }
            val allEpisodes = episodeEntities.map { it.toDomain() }
            val episodes = allEpisodes.groupBy { it.seasonNum }
            return SeriesInfo(
                seasons = seasons,
                episodes = episodes,
                info = seriesDao.getBySourceAndId(source.id, seriesId)?.toDomain()
                    ?: SeriesItem(id = seriesId, name = "", cover = null, plot = null, cast = null, director = null, genre = null, rating = null, releaseDate = null, lastModified = null, categoryId = 0)
            )
        }
        configureBaseUrl(source.serverUrl, source.port)
        val dto = api.getSeriesInfo(username = source.username, password = source.password, seriesId = seriesId)
        val info = dto.toDomain(seriesId)
        seriesDao.insertAllSeasons(info.seasons.map { it.toEntity(seriesId, source.id) })
        seriesDao.insertAllEpisodes(info.episodes.flatMap { (_, episodes) -> episodes.map { it.toEntity(seriesId, source.id) } })
        seriesDao.insertAllSeries(listOf(info.info.toEntity(source.id)))
        return info
    }

    override suspend fun refreshAll() {
        val source = sourceRepository.getActiveSource().first() ?: return
        configureBaseUrl(source.serverUrl, source.port)

        val categories = api.getSeriesCategories(source.username, source.password)
        val seriesList = api.getSeries(source.username, source.password)

        seriesCategoryDao.deleteBySource(source.id)
        seriesCategoryDao.insertAll(categories.map { it.toDomain().toEntity(source.id) })

        seriesDao.deleteSeriesBySource(source.id)
        seriesDao.insertAllSeries(seriesList.map { it.toDomain().toEntity(source.id) })
    }

    private fun configureBaseUrl(serverUrl: String, port: Int) {
        baseUrlInterceptor.setBaseUrl("http://$serverUrl:$port")
    }
}
