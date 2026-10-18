package com.dream.wowiptv.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.dream.wowiptv.data.local.entity.CachedVodInfoEntity

@Dao
interface VodInfoDao {

    @Query("SELECT * FROM cached_vod_info WHERE vodId = :vodId AND sourceId = :sourceId")
    suspend fun get(vodId: Int, sourceId: Long): CachedVodInfoEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(info: CachedVodInfoEntity)

    @Query("DELETE FROM cached_vod_info WHERE sourceId = :sourceId")
    suspend fun deleteBySource(sourceId: Long)
}
