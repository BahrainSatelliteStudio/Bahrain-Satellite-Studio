package com.dream.wowiptv.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction

@Dao
interface DataCleanupDao {

    @Query("DELETE FROM watch_progress")
    suspend fun clearWatchProgress()

    @Query("DELETE FROM favorite_streams")
    suspend fun clearFavoriteStreams()

    @Query("DELETE FROM favorite_vod")
    suspend fun clearFavoriteVod()

    @Query("DELETE FROM live_streams")
    suspend fun clearLiveStreams()

    @Query("DELETE FROM live_categories")
    suspend fun clearLiveCategories()

    @Query("DELETE FROM vod_streams")
    suspend fun clearVodStreams()

    @Query("DELETE FROM vod_categories")
    suspend fun clearVodCategories()

    @Query("DELETE FROM series_list")
    suspend fun clearSeries()

    @Query("DELETE FROM series_categories")
    suspend fun clearSeriesCategories()

    @Query("DELETE FROM seasons")
    suspend fun clearSeasons()

    @Query("DELETE FROM episodes")
    suspend fun clearEpisodes()

    @Query("DELETE FROM epg_entries")
    suspend fun clearEpg()

    @Query("DELETE FROM cached_vod_info")
    suspend fun clearCachedVodInfo()

    @Transaction
    suspend fun clearHistoryAndFavorites() {
        clearWatchProgress()
        clearFavoriteStreams()
        clearFavoriteVod()
    }

    @Transaction
    suspend fun clearContentCache() {
        clearLiveStreams()
        clearLiveCategories()
        clearVodStreams()
        clearVodCategories()
        clearSeries()
        clearSeriesCategories()
        clearSeasons()
        clearEpisodes()
        clearEpg()
        clearCachedVodInfo()
    }

    @Transaction
    suspend fun clearAllCached() {
        clearHistoryAndFavorites()
        clearContentCache()
    }
}
