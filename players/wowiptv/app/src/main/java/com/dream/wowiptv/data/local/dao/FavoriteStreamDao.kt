package com.dream.wowiptv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.dream.wowiptv.data.local.entity.FavoriteStreamEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface FavoriteStreamDao {

    @Query("SELECT * FROM favorite_streams WHERE sourceId = :sourceId")
    fun getAllBySource(sourceId: Long): Flow<List<FavoriteStreamEntity>>

    @Query("SELECT streamId FROM favorite_streams WHERE sourceId = :sourceId")
    suspend fun getFavoriteIdsBySource(sourceId: Long): List<Int>

    @Query("SELECT EXISTS(SELECT 1 FROM favorite_streams WHERE streamId = :streamId AND sourceId = :sourceId)")
    suspend fun isFavorite(streamId: Int, sourceId: Long): Boolean

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(favorite: FavoriteStreamEntity)

    @Query("DELETE FROM favorite_streams WHERE streamId = :streamId AND sourceId = :sourceId")
    suspend fun delete(streamId: Int, sourceId: Long)

    @Query("DELETE FROM favorite_streams WHERE sourceId = :sourceId")
    suspend fun deleteBySource(sourceId: Long)
}
