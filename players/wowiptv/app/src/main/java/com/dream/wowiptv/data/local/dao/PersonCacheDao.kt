package com.dream.wowiptv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.dream.wowiptv.data.local.entity.CachedPersonEntity

@Dao
interface PersonCacheDao {

    @Query("SELECT * FROM person_cache WHERE name IN (:names)")
    suspend fun getByNames(names: List<String>): List<CachedPersonEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entries: List<CachedPersonEntity>)
}
