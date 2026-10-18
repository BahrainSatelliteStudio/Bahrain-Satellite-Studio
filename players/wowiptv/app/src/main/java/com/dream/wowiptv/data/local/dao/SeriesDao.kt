package com.dream.wowiptv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.dream.wowiptv.data.local.entity.EpisodeEntity
import com.dream.wowiptv.data.local.entity.SeasonEntity
import com.dream.wowiptv.data.local.entity.SeriesEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SeriesDao {

    @Query("SELECT * FROM series_list WHERE sourceId = :sourceId")
    fun getBySource(sourceId: Long): Flow<List<SeriesEntity>>

    @Query("SELECT * FROM series_list WHERE sourceId = :sourceId AND (categoryId = :categoryId OR :categoryId IS NULL)")
    fun getBySourceAndCategory(sourceId: Long, categoryId: Int?): Flow<List<SeriesEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAllSeries(series: List<SeriesEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAllSeasons(seasons: List<SeasonEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAllEpisodes(episodes: List<EpisodeEntity>)

    @Query("SELECT * FROM seasons WHERE sourceId = :sourceId AND seriesId = :seriesId")
    suspend fun getSeasons(seriesId: Int, sourceId: Long): List<SeasonEntity>

    @Query("SELECT * FROM episodes WHERE sourceId = :sourceId AND seriesId = :seriesId")
    suspend fun getEpisodes(seriesId: Int, sourceId: Long): List<EpisodeEntity>

    @Query("SELECT * FROM series_list WHERE sourceId = :sourceId AND seriesId = :seriesId LIMIT 1")
    suspend fun getBySourceAndId(sourceId: Long, seriesId: Int): SeriesEntity?

    @Query("SELECT * FROM episodes WHERE sourceId = :sourceId")
    suspend fun getAllEpisodesBySource(sourceId: Long): List<EpisodeEntity>

    @Query("DELETE FROM series_list WHERE sourceId = :sourceId")
    suspend fun deleteSeriesBySource(sourceId: Long)

    @Query("DELETE FROM seasons WHERE sourceId = :sourceId")
    suspend fun deleteSeasonsBySource(sourceId: Long)

    @Query("DELETE FROM episodes WHERE sourceId = :sourceId")
    suspend fun deleteEpisodesBySource(sourceId: Long)
}
