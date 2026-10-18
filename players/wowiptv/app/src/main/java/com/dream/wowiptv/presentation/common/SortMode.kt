package com.dream.wowiptv.presentation.common

import com.dream.wowiptv.R

enum class SortMode(val labelRes: Int) {
    AZ(R.string.sort_az),
    ZA(R.string.sort_za),
    NEWEST(R.string.sort_recent),
    OLDEST(R.string.sort_oldest)
}

fun <T> applySort(
    items: List<T>,
    mode: SortMode,
    nameOf: (T) -> String,
    dateOf: (T) -> String?
): List<T> = when (mode) {
    SortMode.AZ -> items.sortedBy { nameOf(it).lowercase() }
    SortMode.ZA -> items.sortedByDescending { nameOf(it).lowercase() }
    SortMode.NEWEST -> items.sortedByDescending { dateOf(it) }
    SortMode.OLDEST -> items.sortedWith(compareBy(nullsLast<String>()) { dateOf(it) })
}