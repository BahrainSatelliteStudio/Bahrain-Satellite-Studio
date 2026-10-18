package com.dream.wowiptv.data.local.entity

import androidx.room.Entity

@Entity(tableName = "series_categories", primaryKeys = ["categoryId", "sourceId"])
data class SeriesCategoryEntity(
    val categoryId: Int,
    val name: String,
    val sourceId: Long
)
