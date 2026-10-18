package com.dream.wowiptv.data.local.entity

import androidx.room.Entity

@Entity(tableName = "cached_vod_info", primaryKeys = ["vodId", "sourceId"])
data class CachedVodInfoEntity(
    val vodId: Int,
    val name: String,
    val cover: String?,
    val backdropPath: String?,
    val plot: String?,
    val cast: String?,
    val director: String?,
    val genre: String?,
    val releasedate: String?,
    val durationSecs: Int?,
    val rating: Double?,
    val youtubeTrailer: String?,
    val categoryId: Int,
    val sourceId: Long
)
