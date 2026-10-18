package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.data.remote.xtream.DynamicBaseUrlInterceptor
import com.dream.wowiptv.data.remote.xtream.XtreamApi
import com.dream.wowiptv.domain.model.UserInfo
import com.dream.wowiptv.domain.repository.SourceRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.first
import javax.inject.Inject

class GetUserInfoUseCase @Inject constructor(
    private val sourceRepository: SourceRepository,
    private val xtreamApi: XtreamApi,
    private val baseUrlInterceptor: DynamicBaseUrlInterceptor
) {
    suspend operator fun invoke(): UserInfo? {
        val source = sourceRepository.getActiveSource().first() ?: return null
        baseUrlInterceptor.setBaseUrl("http://${source.serverUrl}:${source.port}")
        return try {
            val response = xtreamApi.authenticate(source.username, source.password)
            val info = response.userInfo
            if (info != null) {
                UserInfo(
                    username = info.username,
                    expDate = info.expDate,
                    maxConnections = info.maxConnections,
                    allowedOutputFormats = info.allowedOutputFormats
                )
            } else {
                null
            }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            null
        }
    }
}