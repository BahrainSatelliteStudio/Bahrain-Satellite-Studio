package com.dream.wowiptv.data.local.entity

import androidx.room.Entity

@Entity(tableName = "episodes", primaryKeys = ["episodeId", "sourceId"])
data class EpisodeEntity(
    val episodeId: String,
    val seriesId: Int,
    val seasonNum: Int?,
    val episodeNum: Int?,
    val title: String?,
    val containerExtension: String?,
    val plot: String?,
    val releasedate: String?,
    val durationSecs: Int?,
    val sourceId: Long
)
