package com.dream.wowiptv.data.local.entity

import androidx.room.Entity

@Entity(tableName = "series_list", primaryKeys = ["seriesId", "sourceId"])
data class SeriesEntity(
    val seriesId: Int,
    val name: String?,
    val cover: String?,
    val plot: String?,
    val cast: String?,
    val director: String?,
    val genre: String?,
    val rating: String?,
    val releaseDate: String?,
    val lastModified: String?,
    val categoryId: Int?,
    val sourceId: Long
)
