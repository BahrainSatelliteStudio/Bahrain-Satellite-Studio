package com.dream.wowiptv.data.local.entity

import androidx.room.Entity

@Entity(tableName = "vod_streams", primaryKeys = ["streamId", "sourceId"])
data class VodStreamEntity(
    val streamId: Int,
    val name: String?,
    val streamIcon: String?,
    val rating: String?,
    val added: String?,
    val categoryId: Int?,
    val containerExtension: String?,
    val sourceId: Long
)
