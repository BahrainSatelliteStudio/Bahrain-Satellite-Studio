package com.dream.wowiptv.domain.model

data class Season(
    val id: Int,
    val seasonNumber: Int,
    val name: String,
    val cover: String?,
    val episodeCount: Int
)
