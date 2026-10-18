package com.dream.wowiptv.domain.model

data class VodInfo(
    val id: Int,
    val name: String,
    val cover: String?,
    val backdropPath: String?,
    val plot: String?,
    val cast: String?,
    val director: String?,
    val genre: String?,
    val releasedate: String?,
    val durationSecs: Int?,
    val rating: Double?,
    val youtubeTrailer: String?,
    val categoryId: Int
)
