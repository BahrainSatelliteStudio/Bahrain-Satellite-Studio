package com.dream.wowiptv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.dream.wowiptv.data.local.entity.EpgEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface EpgDao {

    @Query("SELECT * FROM epg_entries WHERE sourceId = :sourceId")
    fun getBySource(sourceId: Long): Flow<List<EpgEntity>>

    @Query("SELECT * FROM epg_entries WHERE streamId = :streamId AND sourceId = :sourceId")
    fun getByStream(streamId: Int, sourceId: Long): Flow<List<EpgEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(entries: List<EpgEntity>)

    @Query("DELETE FROM epg_entries WHERE streamId = :streamId AND sourceId = :sourceId")
    suspend fun deleteByStream(streamId: Int, sourceId: Long)

    @Query("DELETE FROM epg_entries WHERE sourceId = :sourceId")
    suspend fun deleteBySource(sourceId: Long)
}
