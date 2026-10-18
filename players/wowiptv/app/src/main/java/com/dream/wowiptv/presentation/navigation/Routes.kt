package com.dream.wowiptv.presentation.navigation

object Routes {
    const val SPLASH = "splash"
    const val MAIN = "main?liveStreamId={liveStreamId}"
    const val ALL_ITEMS = "all_items/{tab}"

    fun mainRoute(liveStreamId: Int? = null) =
        if (liveStreamId != null) "main?liveStreamId=$liveStreamId" else "main"
    const val ALL_FAVORITES = "all_favorites"
    const val ALL_HISTORY = "all_history"
    const val SETTINGS = "settings"
    const val GLOBAL_SEARCH = "global_search"

    fun allItemsRoute(tab: Int) = "all_items/$tab"
    const val PLAYER = "player/{streamType}/{streamId}?name={name}&position={position}&episodes={episodes}"
    const val EPG = "epg/{streamId}"
    const val VOD = "vod/{vodId}"
    const val SERIES = "series/{seriesId}"
    const val SOURCE_ADD = "source_add"
    const val SOURCE_EDIT = "source_edit/{sourceId}"
    const val MANAGE_LOCKS = "manage_locks"

    fun playerRoute(streamType: String, streamId: String, name: String = "", position: Long = 0L, episodes: List<String> = emptyList()) =
        "player/$streamType/$streamId?name=${java.net.URLEncoder.encode(name, "UTF-8")}&position=$position&episodes=${episodes.joinToString(",")}"
    fun epgRoute(streamId: Int) = "epg/$streamId"
    fun vodRoute(vodId: Int) = "vod/$vodId"
    fun seriesRoute(seriesId: Int) = "series/$seriesId"
    fun sourceEditRoute(sourceId: Int) = "source_edit/$sourceId"
}
