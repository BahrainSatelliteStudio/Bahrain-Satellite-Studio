package com.dream.wowiptv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.dream.wowiptv.data.local.entity.WatchProgressEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface WatchProgressDao {

    @Query("SELECT * FROM watch_progress WHERE sourceId = :sourceId ORDER BY lastWatched DESC")
    fun getAllBySource(sourceId: Long): Flow<List<WatchProgressEntity>>

    @Query("SELECT * FROM watch_progress WHERE contentId = :contentId AND sourceId = :sourceId LIMIT 1")
    suspend fun getByContentId(contentId: String, sourceId: Long): WatchProgressEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(progress: WatchProgressEntity)

    @Query("DELETE FROM watch_progress WHERE contentId = :contentId AND sourceId = :sourceId")
    suspend fun delete(contentId: String, sourceId: Long)

    @Query("DELETE FROM watch_progress WHERE sourceId = :sourceId")
    suspend fun deleteBySource(sourceId: Long)
}