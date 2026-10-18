package com.dream.wowiptv.presentation.common.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = AccentBlue,
    onPrimary = OnAccentBlue,
    primaryContainer = AccentBlueVariant,
    secondary = AccentBlueVariant,
    background = LightBackground,
    onBackground = LightOnBackground,
    surface = LightSurface,
    onSurface = LightOnSurface,
    surfaceVariant = LightSurfaceVariant,
    error = LightError,
    onError = LightOnError,
    outline = LightOutline
)

val DarkColorScheme = darkColorScheme(
    primary = AccentBlue,
    onPrimary = OnAccentBlue,
    primaryContainer = AccentBlueVariant,
    secondary = AccentBlueVariant,
    background = DarkBackground,
    onBackground = DarkOnBackground,
    surface = DarkSurface,
    onSurface = DarkOnSurface,
    surfaceVariant = DarkSurfaceVariant,
    error = DarkError,
    onError = DarkOnError,
    outline = DarkOutline
)

@Composable
fun WowIPTVTheme(
    accent: AccentPalette = ThemeAccent.PURPLE.palette,
    content: @Composable () -> Unit
) {
    val darkScheme = darkColorScheme(
        primary = accent.vibrant,
        onPrimary = Color.White,
        primaryContainer = accent.dark,
        secondary = accent.vibrant,
        onSecondary = Color.White,
        background = DarkBackground,
        onBackground = DarkOnBackground,
        surface = DarkSurface,
        onSurface = DarkOnSurface,
        surfaceVariant = DarkSurfaceVariant,
        error = DarkError,
        onError = DarkOnError,
        outline = DarkOutline
    )
    CompositionLocalProvider(LocalAccentPalette provides accent) {
        MaterialTheme(
            colorScheme = darkScheme,
            typography = WowIPTVTypography,
            content = content
        )
    }
}
