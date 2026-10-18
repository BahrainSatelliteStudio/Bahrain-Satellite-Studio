package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.domain.repository.SourceRepository
import kotlinx.coroutines.flow.first
import javax.inject.Inject

class PlayStreamUseCase @Inject constructor(
    private val sourceRepository: SourceRepository
) {
    sealed class StreamType {
        data class Live(val streamId: Int, val containerExtension: String = "ts", val m3uUrl: String? = null) : StreamType()
        data class Vod(val vodId: Int, val containerExtension: String = "mp4") : StreamType()
        data class Series(val episodeId: String, val containerExtension: String = "mp4") : StreamType()
    }

    suspend operator fun invoke(type: StreamType): String {
        val source = sourceRepository.getActiveSource().first()
            ?: throw NoActiveSourceException()
        if (source.type == "m3u") {
            return when (type) {
                is StreamType.Live -> type.m3uUrl ?: throw SourceNotSupportedException()
                else -> throw SourceNotSupportedException()
            }
        }
        val base = "http://${source.serverUrl}:${source.port}"
        val credentials = "${source.username}/${source.password}"
        return when (type) {
            is StreamType.Live -> "$base/live/$credentials/${type.streamId}.${type.containerExtension}"
            is StreamType.Vod -> "$base/movie/$credentials/${type.vodId}.${type.containerExtension}"
            is StreamType.Series -> "$base/series/$credentials/${type.episodeId}.${type.containerExtension}"
        }
    }
}
