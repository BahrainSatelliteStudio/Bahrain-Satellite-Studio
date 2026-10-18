package com.dream.wowiptv.data.local.entity

import androidx.room.Entity

@Entity(tableName = "live_categories", primaryKeys = ["categoryId", "sourceId"])
data class LiveCategoryEntity(
    val categoryId: Int,
    val name: String,
    val sourceId: Long
)
