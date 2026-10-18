package com.dream.wowiptv.data.remote.xtream.dto

import com.google.gson.annotations.SerializedName

data class VodStreamDto(
    val num: Int? = null,
    val name: String? = null,
    @SerializedName("stream_type")
    val streamType: String? = null,
    @SerializedName("stream_id")
    val streamId: Int? = null,
    @SerializedName("stream_icon")
    val streamIcon: String? = null,
    val rating: String? = null,
    val added: String? = null,
    @SerializedName("category_id")
    val categoryId: String? = null,
    @SerializedName("container_extension")
    val containerExtension: String? = null
)
