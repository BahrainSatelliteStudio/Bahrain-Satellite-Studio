package com.dream.wowiptv.domain.model

data class XtreamSource(
    val id: Long,
    val name: String,
    val serverUrl: String,
    val port: Int,
    val username: String,
    val password: String,
    val type: String = "xtream"
)
