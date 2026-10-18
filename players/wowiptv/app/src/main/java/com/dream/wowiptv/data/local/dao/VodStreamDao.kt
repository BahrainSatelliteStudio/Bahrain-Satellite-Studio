package com.dream.wowiptv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.dream.wowiptv.data.local.entity.VodStreamEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface VodStreamDao {

    @Query("SELECT * FROM vod_streams WHERE sourceId = :sourceId")
    fun getBySource(sourceId: Long): Flow<List<VodStreamEntity>>

    @Query("SELECT * FROM vod_streams WHERE sourceId = :sourceId AND (categoryId = :categoryId OR :categoryId IS NULL)")
    fun getBySourceAndCategory(sourceId: Long, categoryId: Int?): Flow<List<VodStreamEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(streams: List<VodStreamEntity>)

    @Query("DELETE FROM vod_streams WHERE sourceId = :sourceId")
    suspend fun deleteBySource(sourceId: Long)
}
