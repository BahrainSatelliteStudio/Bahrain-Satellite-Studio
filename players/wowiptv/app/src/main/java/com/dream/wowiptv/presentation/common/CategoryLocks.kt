package com.dream.wowiptv.presentation.common

object CategoryLocks {
    const val TYPE_LIVE = "live"
    const val TYPE_VOD = "vod"
    const val TYPE_SERIES = "series"

    fun key(type: String, sourceId: Long, categoryId: Int): String = "$type:$sourceId:$categoryId"

    fun lockedIds(type: String, locks: Set<String>, sourceId: Long?): Set<Int> {
        if (sourceId == null) return emptySet()
        val prefix = "$type:$sourceId:"
        return locks.mapNotNull { lock ->
            if (lock.startsWith(prefix)) lock.substringAfterLast(':').toIntOrNull() else null
        }.toSet()
    }
}