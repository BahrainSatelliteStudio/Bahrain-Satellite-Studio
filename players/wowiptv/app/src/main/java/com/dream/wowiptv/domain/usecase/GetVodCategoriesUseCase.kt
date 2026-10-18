package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.domain.model.VodCategory
import com.dream.wowiptv.domain.repository.VodRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetVodCategoriesUseCase @Inject constructor(
    private val repository: VodRepository
) {
    operator fun invoke(): Flow<List<VodCategory>> = repository.getCategories()
}
