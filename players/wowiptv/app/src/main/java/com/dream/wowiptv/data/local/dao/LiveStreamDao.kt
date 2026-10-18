package com.dream.wowiptv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.dream.wowiptv.data.local.entity.LiveStreamEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface LiveStreamDao {

    @Query("SELECT * FROM live_streams WHERE sourceId = :sourceId")
    fun getBySource(sourceId: Long): Flow<List<LiveStreamEntity>>

    @Query("SELECT * FROM live_streams WHERE sourceId = :sourceId AND (categoryId = :categoryId OR :categoryId IS NULL)")
    fun getBySourceAndCategory(sourceId: Long, categoryId: Int?): Flow<List<LiveStreamEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(streams: List<LiveStreamEntity>)

    @Query("DELETE FROM live_streams WHERE sourceId = :sourceId")
    suspend fun deleteBySource(sourceId: Long)
}
