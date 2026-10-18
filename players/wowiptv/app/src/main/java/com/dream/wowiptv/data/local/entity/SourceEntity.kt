package com.dream.wowiptv.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sources")
data class SourceEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val serverUrl: String,
    val port: Int = 25461,
    val username: String,
    val password: String,
    val type: String = "xtream",
    val isActive: Boolean = false
)
