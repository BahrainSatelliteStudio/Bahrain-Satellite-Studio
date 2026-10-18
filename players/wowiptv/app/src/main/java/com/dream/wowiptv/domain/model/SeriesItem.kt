package com.dream.wowiptv.domain.model

data class SeriesItem(
    val id: Int,
    val name: String,
    val cover: String?,
    val plot: String?,
    val cast: String?,
    val director: String?,
    val genre: String?,
    val rating: String?,
    val releaseDate: String?,
    val lastModified: String?,
    val categoryId: Int
)
