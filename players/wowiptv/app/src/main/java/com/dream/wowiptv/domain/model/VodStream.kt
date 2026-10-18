package com.dream.wowiptv.domain.model

data class VodStream(
    val id: Int,
    val name: String,
    val icon: String?,
    val rating: Double?,
    val added: String,
    val categoryId: Int,
    val containerExtension: String
)
