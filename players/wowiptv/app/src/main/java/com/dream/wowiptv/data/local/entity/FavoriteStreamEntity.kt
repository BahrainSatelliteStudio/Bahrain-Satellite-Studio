package com.dream.wowiptv.data.local.entity

import androidx.room.Entity

@Entity(
    tableName = "favorite_streams",
    primaryKeys = ["streamId", "sourceId"]
)
data class FavoriteStreamEntity(
    val streamId: Int,
    val sourceId: Long,
    val name: String,
    val iconUrl: String?,
    val categoryId: Int
)
