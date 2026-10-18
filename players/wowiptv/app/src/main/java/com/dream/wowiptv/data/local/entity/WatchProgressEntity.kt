package com.dream.wowiptv.data.local.entity

import androidx.room.Entity

@Entity(tableName = "watch_progress", primaryKeys = ["contentId", "sourceId"])
data class WatchProgressEntity(
    val contentId: String,
    val sourceId: Long,
    val contentType: String,
    val name: String,
    val icon: String?,
    val position: Long,
    val duration: Long,
    val lastWatched: Long
)