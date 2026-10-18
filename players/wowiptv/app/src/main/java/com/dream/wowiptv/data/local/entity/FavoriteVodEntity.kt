package com.dream.wowiptv.data.local.entity

import androidx.room.Entity

@Entity(tableName = "favorite_vod", primaryKeys = ["vodId", "sourceId", "type"])
data class FavoriteVodEntity(
    val vodId: Int,
    val sourceId: Long,
    val type: String,
    val name: String,
    val icon: String?,
    val categoryId: Int
)