package com.dream.wowiptv.domain.model

data class UserInfo(
    val username: String?,
    val expDate: String?,
    val maxConnections: String?,
    val allowedOutputFormats: List<String>?
)