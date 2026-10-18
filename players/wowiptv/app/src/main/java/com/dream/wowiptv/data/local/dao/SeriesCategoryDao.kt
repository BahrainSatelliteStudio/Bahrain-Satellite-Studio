package com.dream.wowiptv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.dream.wowiptv.data.local.entity.SeriesCategoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SeriesCategoryDao {

    @Query("SELECT * FROM series_categories WHERE sourceId = :sourceId")
    fun getBySource(sourceId: Long): Flow<List<SeriesCategoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(categories: List<SeriesCategoryEntity>)

    @Query("DELETE FROM series_categories WHERE sourceId = :sourceId")
    suspend fun deleteBySource(sourceId: Long)
}
