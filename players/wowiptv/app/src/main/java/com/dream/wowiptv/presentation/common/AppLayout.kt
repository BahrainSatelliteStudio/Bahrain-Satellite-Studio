package com.dream.wowiptv.presentation.common

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalConfiguration

@Composable
fun rememberIsTablet(): Boolean {
    val config = LocalConfiguration.current
    return config.smallestScreenWidthDp >= 600
}

fun effectiveGridColumns(gridColumns: Int, isTablet: Boolean): Int =
    if (isTablet) {
        if (gridColumns in 6..8) gridColumns else 8
    } else {
        gridColumns
    }
