package com.dream.wowiptv.data.local.entity

import androidx.room.Entity

@Entity(tableName = "seasons", primaryKeys = ["seasonId", "sourceId"])
data class SeasonEntity(
    val seasonId: Int,
    val seriesId: Int,
    val seasonNumber: Int?,
    val name: String?,
    val episodeCount: Int?,
    val sourceId: Long
)
