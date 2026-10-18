package com.dream.wowiptv.presentation.common.theme

import com.dream.wowiptv.data.local.AppPreferences
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ThemeController @Inject constructor(
    private val appPreferences: AppPreferences
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _current = MutableStateFlow(ThemeAccent.PURPLE)
    val current: StateFlow<ThemeAccent> = _current.asStateFlow()

    init {
        scope.launch {
            appPreferences.themeColor.collect { key ->
                _current.value = ThemeAccent.fromKey(key)
            }
        }
    }

    fun setAccent(accent: ThemeAccent) {
        scope.launch {
            _current.value = accent
            appPreferences.setThemeColor(accent.key)
        }
    }
}
