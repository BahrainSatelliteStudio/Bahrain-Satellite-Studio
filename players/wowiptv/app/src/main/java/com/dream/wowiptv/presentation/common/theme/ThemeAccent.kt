package com.dream.wowiptv.presentation.common.theme

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

data class AccentPalette(
    val primary: Color,
    val vibrant: Color,
    val light: Color,
    val dark: Color
)

enum class ThemeAccent(val key: String, val palette: AccentPalette) {
    PURPLE(
        "purple",
        AccentPalette(Color(0xFF6366F1), Color(0xFF8B5CF6), Color(0xFF818CF8), Color(0xFFA855F7))
    ),
    BLUE(
        "blue",
        AccentPalette(Color(0xFF1E88E5), Color(0xFF42A5F5), Color(0xFF64B5F6), Color(0xFF1565C0))
    ),
    GREEN(
        "green",
        AccentPalette(Color(0xFF10B981), Color(0xFF34D399), Color(0xFF6EE7B7), Color(0xFF059669))
    ),
    ORANGE(
        "orange",
        AccentPalette(Color(0xFFFB8C00), Color(0xFFFFA726), Color(0xFFFFB74D), Color(0xFFEF6C00))
    ),
    PINK(
        "pink",
        AccentPalette(Color(0xFFEC4899), Color(0xFFF472B6), Color(0xFFF9A8D4), Color(0xFFDB2777))
    ),
    CYAN(
        "cyan",
        AccentPalette(Color(0xFF06B6D4), Color(0xFF22D3EE), Color(0xFF67E8F9), Color(0xFF0891B2))
    ),
    RED(
        "red",
        AccentPalette(Color(0xFFE53935), Color(0xFFEF5350), Color(0xFFE57373), Color(0xFFC62828))
    ),
    TEAL(
        "teal",
        AccentPalette(Color(0xFF14B8A6), Color(0xFF2DD4BF), Color(0xFF5EEAD4), Color(0xFF0D9488))
    ),
    AMBER(
        "amber",
        AccentPalette(Color(0xFFF59E0B), Color(0xFFFBBF24), Color(0xFFFCD34D), Color(0xFFD97706))
    ),
    INDIGO(
        "indigo",
        AccentPalette(Color(0xFF4F46E5), Color(0xFF6366F1), Color(0xFF818CF8), Color(0xFF4338CA))
    ),
    ROSE(
        "rose",
        AccentPalette(Color(0xFFF43F5E), Color(0xFFFB7185), Color(0xFFFDA4AF), Color(0xFFE11D48))
    ),
    LIME(
        "lime",
        AccentPalette(Color(0xFF84CC16), Color(0xFFA3E635), Color(0xFFBEF264), Color(0xFF65A30D))
    ),
    SKY(
        "sky",
        AccentPalette(Color(0xFF0EA5E9), Color(0xFF38BDF8), Color(0xFF7DD3FC), Color(0xFF0284C7))
    ),
    FUCHSIA(
        "fuchsia",
        AccentPalette(Color(0xFFD946EF), Color(0xFFE879F9), Color(0xFFF0ABFC), Color(0xFFC026D3))
    );

    companion object {
        fun fromKey(key: String): ThemeAccent = entries.firstOrNull { it.key == key } ?: PURPLE
    }
}

val LocalAccentPalette = staticCompositionLocalOf { ThemeAccent.PURPLE.palette }
