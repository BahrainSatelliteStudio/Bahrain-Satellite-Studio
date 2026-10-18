package com.dream.wowiptv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.dream.wowiptv.data.local.entity.LiveCategoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface LiveCategoryDao {

    @Query("SELECT * FROM live_categories WHERE sourceId = :sourceId")
    fun getBySource(sourceId: Long): Flow<List<LiveCategoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(categories: List<LiveCategoryEntity>)

    @Query("DELETE FROM live_categories WHERE sourceId = :sourceId")
    suspend fun deleteBySource(sourceId: Long)
}
