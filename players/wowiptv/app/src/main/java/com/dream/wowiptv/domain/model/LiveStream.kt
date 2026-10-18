package com.dream.wowiptv.domain.model

data class LiveStream(
    val id: Int,
    val name: String,
    val iconUrl: String?,
    val epgChannelId: String?,
    val categoryId: Int,
    val hasArchive: Boolean,
    val added: String? = null,
    val m3uUrl: String? = null
)
