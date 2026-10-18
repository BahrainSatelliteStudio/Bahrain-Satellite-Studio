package com.dream.wowiptv.data.remote.xtream.dto

import com.google.gson.annotations.SerializedName

data class VodInfoDto(
    val info: VodInfoData? = null,
    @SerializedName("movie_data")
    val movieData: VodMovieData? = null
)

data class VodInfoData(
    @SerializedName("movie_image")
    val movieImage: String? = null,
    @SerializedName("tmdb_id")
    val tmdbId: String? = null,
    @SerializedName("backdrop_path")
    val backdropPath: List<String>? = null,
    @SerializedName("youtube_trailer")
    val youtubeTrailer: String? = null,
    val genre: String? = null,
    val plot: String? = null,
    val cast: String? = null,
    val rating: String? = null,
    val director: String? = null,
    val releasedate: String? = null,
    @SerializedName("duration_secs")
    val durationSecs: String? = null,
    val duration: String? = null
)

data class VodMovieData(
    @SerializedName("stream_id")
    val streamId: Int? = null,
    val name: String? = null,
    val added: String? = null,
    @SerializedName("category_id")
    val categoryId: String? = null,
    @SerializedName("container_extension")
    val containerExtension: String? = null
)
