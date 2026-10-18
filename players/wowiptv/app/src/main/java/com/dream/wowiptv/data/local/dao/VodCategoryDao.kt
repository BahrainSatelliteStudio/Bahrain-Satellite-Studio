package com.dream.wowiptv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.dream.wowiptv.data.local.entity.VodCategoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface VodCategoryDao {

    @Query("SELECT * FROM vod_categories WHERE sourceId = :sourceId")
    fun getBySource(sourceId: Long): Flow<List<VodCategoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(categories: List<VodCategoryEntity>)

    @Query("DELETE FROM vod_categories WHERE sourceId = :sourceId")
    suspend fun deleteBySource(sourceId: Long)
}
