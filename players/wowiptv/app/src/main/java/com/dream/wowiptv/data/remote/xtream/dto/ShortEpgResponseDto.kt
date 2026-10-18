package com.dream.wowiptv.data.remote.xtream.dto

import com.google.gson.annotations.SerializedName

data class ShortEpgResponseDto(
    @SerializedName("epg_listings")
    val epgListings: List<EpgEntryDto>? = null
)

data class EpgEntryDto(
    val id: String? = null,
    @SerializedName("epg_id")
    val epgId: String? = null,
    val title: String? = null,
    val lang: String? = null,
    val start: String? = null,
    val end: String? = null,
    val description: String? = null,
    @SerializedName("channel_id")
    val channelId: String? = null,
    @SerializedName("start_timestamp")
    val startTimestamp: Long? = null,
    @SerializedName("stop_timestamp")
    val stopTimestamp: Long? = null,
    @SerializedName("now_playing")
    val nowPlaying: Int? = null,
    @SerializedName("has_archive")
    val hasArchive: Int? = null
)
