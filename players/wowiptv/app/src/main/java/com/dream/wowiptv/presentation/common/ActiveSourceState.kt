package com.dream.wowiptv.presentation.common

import com.dream.wowiptv.domain.repository.SourceRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ActiveSourceState @Inject constructor(
    sourceRepository: SourceRepository
) {
    val sourceType: StateFlow<String?> = sourceRepository.getActiveSource()
        .map { it?.type }
        .stateIn(
            CoroutineScope(SupervisorJob() + Dispatchers.Default),
            SharingStarted.Eagerly,
            null
        )
}
