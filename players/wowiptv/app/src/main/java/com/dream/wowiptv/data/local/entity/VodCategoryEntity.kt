package com.dream.wowiptv.data.local.entity

import androidx.room.Entity

@Entity(tableName = "vod_categories", primaryKeys = ["categoryId", "sourceId"])
data class VodCategoryEntity(
    val categoryId: Int,
    val name: String,
    val sourceId: Long
)
