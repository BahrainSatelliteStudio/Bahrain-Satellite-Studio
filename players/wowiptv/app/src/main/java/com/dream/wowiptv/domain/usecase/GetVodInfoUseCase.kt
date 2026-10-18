package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.domain.model.VodInfo
import com.dream.wowiptv.domain.repository.VodRepository
import javax.inject.Inject

class GetVodInfoUseCase @Inject constructor(
    private val repository: VodRepository
) {
    suspend operator fun invoke(vodId: Int, forceRefresh: Boolean = false): VodInfo = repository.getInfo(vodId, forceRefresh)
}
