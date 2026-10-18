package com.dream.wowiptv.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "epg_entries")
data class EpgEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val streamId: Int,
    val epgId: String?,
    val title: String?,
    val description: String?,
    val startTimestamp: Long?,
    val stopTimestamp: Long?,
    val nowPlaying: Boolean,
    val sourceId: Long
)
