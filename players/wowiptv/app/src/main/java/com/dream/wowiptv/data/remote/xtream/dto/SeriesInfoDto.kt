package com.dream.wowiptv.data.remote.xtream.dto

import com.google.gson.annotations.SerializedName

data class SeriesInfoDto(
    val seasons: List<SeasonDto>? = null,
    val info: SeriesInfoData? = null,
    val episodes: Map<String, List<EpisodeDto>>? = null
)

data class SeasonDto(
    val id: Int? = null,
    @SerializedName("season_number")
    val seasonNumber: Int? = null,
    val name: String? = null,
    @SerializedName("episode_count")
    val episodeCount: Int? = null
)

data class SeriesInfoData(
    val name: String? = null,
    val plot: String? = null,
    val cast: String? = null,
    val director: String? = null,
    val genre: String? = null,
    val releaseDate: String? = null,
    val rating: String? = null,
    val cover: String? = null,
    @SerializedName("backdrop_path")
    val backdropPath: List<String>? = null
)

data class EpisodeDto(
    val id: String? = null,
    @SerializedName("episode_num")
    val episodeNum: String? = null,
    val title: String? = null,
    @SerializedName("container_extension")
    val containerExtension: String? = null,
    val info: EpisodeInfoDto? = null,
    @SerializedName("custom_sid")
    val customSid: String? = null,
    val added: String? = null,
    val season: Int? = null,
    @SerializedName("direct_source")
    val directSource: String? = null
)

data class EpisodeInfoDto(
    val tmdbId: String? = null,
    val releasedate: String? = null,
    val plot: String? = null,
    @SerializedName("duration_secs")
    val durationSecs: String? = null,
    val duration: String? = null,
    @SerializedName("movie_image")
    val movieImage: String? = null,
    val bitrate: String? = null,
    val rating: String? = null,
    val genre: String? = null
)
