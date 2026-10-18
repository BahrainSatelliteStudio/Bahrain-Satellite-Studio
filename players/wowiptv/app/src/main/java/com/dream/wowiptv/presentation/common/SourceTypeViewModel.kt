package com.dream.wowiptv.presentation.common

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class SourceTypeViewModel @Inject constructor(
    private val activeSourceState: ActiveSourceState
) : ViewModel() {
    val sourceType = activeSourceState.sourceType
}
