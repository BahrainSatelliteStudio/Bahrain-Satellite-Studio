package com.dream.wowiptv.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "person_cache")
data class CachedPersonEntity(
    @PrimaryKey val name: String,
    val profilePath: String
)
