package com.dream.wowiptv.domain.model

data class SeriesInfo(
    val seasons: List<Season>,
    val episodes: Map<Int, List<Episode>>,
    val info: SeriesItem
)
