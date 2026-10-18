package com.dream.wowiptv.data.remote.xtream.dto

import com.google.gson.annotations.SerializedName

data class LiveStreamDto(
    val num: Int? = null,
    val name: String? = null,
    @SerializedName("stream_type")
    val streamType: String? = null,
    @SerializedName("stream_id")
    val streamId: Int? = null,
    @SerializedName("stream_icon")
    val streamIcon: String? = null,
    @SerializedName("epg_channel_id")
    val epgChannelId: String? = null,
    val added: String? = null,
    @SerializedName("category_id")
    val categoryId: String? = null,
    @SerializedName("tv_archive")
    val tvArchive: Int? = null,
    @SerializedName("tv_archive_duration")
    val tvArchiveDuration: Int? = null
)
