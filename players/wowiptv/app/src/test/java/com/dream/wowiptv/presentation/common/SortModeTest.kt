package com.dream.wowiptv.presentation.common

import org.junit.Assert.assertEquals
import org.junit.Test

data class FakeItem(val name: String, val date: String?)

class SortModeTest {

    private val items = listOf(
        FakeItem("Movie A", null),
        FakeItem("movie c", "2024-03-01 10:00:00"),
        FakeItem("Movie B", "2024-05-02 10:00:00"),
        FakeItem("Movie D", "2024-04-01 10:00:00")
    )

    @Test
    fun `AZ sorts by name ignoring case`() {
        val sorted = applySort(items, SortMode.AZ, { it.name }, { it.date })
        assertEquals(listOf("Movie A", "Movie B", "movie c", "Movie D"), sorted.map { it.name })
    }

    @Test
    fun `ZA sorts by name descending ignoring case`() {
        val sorted = applySort(items, SortMode.ZA, { it.name }, { it.date })
        assertEquals(listOf("Movie D", "movie c", "Movie B", "Movie A"), sorted.map { it.name })
    }

    @Test
    fun `NEWEST sorts by date descending with nulls last`() {
        val sorted = applySort(items, SortMode.NEWEST, { it.name }, { it.date })
        assertEquals(listOf("Movie B", "Movie D", "movie c", "Movie A"), sorted.map { it.name })
        assertEquals(listOf("2024-05-02 10:00:00", "2024-04-01 10:00:00", "2024-03-01 10:00:00", null), sorted.map { it.date })
    }

    @Test
    fun `OLDEST sorts by date ascending with nulls last`() {
        val sorted = applySort(items, SortMode.OLDEST, { it.name }, { it.date })
        assertEquals(listOf("movie c", "Movie D", "Movie B", "Movie A"), sorted.map { it.name })
        assertEquals(listOf("2024-03-01 10:00:00", "2024-04-01 10:00:00", "2024-05-02 10:00:00", null), sorted.map { it.date })
    }

    @Test
    fun `NEWEST all null dates keeps original order`() {
        val allNull = listOf(FakeItem("b", null), FakeItem("a", null), FakeItem("c", null))
        val sorted = applySort(allNull, SortMode.NEWEST, { it.name }, { it.date })
        assertEquals(listOf("b", "a", "c"), sorted.map { it.name })
    }

    @Test
    fun `empty list stays empty`() {
        val sorted = applySort(emptyList<FakeItem>(), SortMode.AZ, { it.name }, { it.date })
        assertEquals(0, sorted.size)
    }
}