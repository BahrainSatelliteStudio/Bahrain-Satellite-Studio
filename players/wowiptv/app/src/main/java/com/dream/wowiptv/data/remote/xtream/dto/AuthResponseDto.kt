package com.dream.wowiptv.data.remote.xtream.dto

import com.google.gson.annotations.SerializedName

data class AuthResponseDto(
    @SerializedName("user_info")
    val userInfo: UserInfoDto? = null,
    @SerializedName("server_info")
    val serverInfo: ServerInfoDto? = null
)

data class UserInfoDto(
    val username: String? = null,
    val message: String? = null,
    val auth: Int? = null,
    val status: String? = null,
    @SerializedName("exp_date")
    val expDate: String? = null,
    @SerializedName("is_trial")
    val isTrial: String? = null,
    @SerializedName("active_cons")
    val activeCons: String? = null,
    @SerializedName("created_at")
    val createdAt: String? = null,
    @SerializedName("max_connections")
    val maxConnections: String? = null,
    @SerializedName("allowed_output_formats")
    val allowedOutputFormats: List<String>? = null
)

data class ServerInfoDto(
    val url: String? = null,
    val port: String? = null,
    @SerializedName("https_port")
    val httpsPort: String? = null,
    @SerializedName("server_protocol")
    val serverProtocol: String? = null,
    @SerializedName("rtmp_port")
    val rtmpPort: String? = null,
    val timezone: String? = null,
    @SerializedName("timestamp_now")
    val timestampNow: String? = null,
    @SerializedName("time_now")
    val timeNow: String? = null
)
