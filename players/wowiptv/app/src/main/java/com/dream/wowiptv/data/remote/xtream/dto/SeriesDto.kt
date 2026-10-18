package com.dream.wowiptv.data.remote.xtream.dto

import com.google.gson.annotations.SerializedName

data class SeriesDto(
    @SerializedName("series_id")
    val seriesId: Int? = null,
    val name: String? = null,
    val cover: String? = null,
    val plot: String? = null,
    val cast: String? = null,
    val director: String? = null,
    val genre: String? = null,
    val releaseDate: String? = null,
    val rating: String? = null,
    @SerializedName("last_modified")
    val lastModified: String? = null,
    @SerializedName("category_id")
    val categoryId: String? = null
)
