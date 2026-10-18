package com.dream.wowiptv.presentation.navigation

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.PlaylistPlay
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Settings
import androidx.compose.ui.graphics.vector.ImageVector
import com.dream.wowiptv.R

sealed class BottomNavItem(val route: String, val icon: ImageVector, @StringRes val labelRes: Int) {
    object Home : BottomNavItem("home", Icons.Default.Home, R.string.nav_home)
    object Live : BottomNavItem("live", Icons.Default.LiveTv, R.string.nav_live)
    object Movies : BottomNavItem("movies", Icons.Default.Movie, R.string.nav_movies)
    object Series : BottomNavItem("series", Icons.AutoMirrored.Filled.PlaylistPlay, R.string.nav_series)
    object Settings : BottomNavItem("settings", Icons.Default.Settings, R.string.nav_settings)

    companion object {
        val items = listOf(Home, Live, Movies, Series, Settings)
    }
}
