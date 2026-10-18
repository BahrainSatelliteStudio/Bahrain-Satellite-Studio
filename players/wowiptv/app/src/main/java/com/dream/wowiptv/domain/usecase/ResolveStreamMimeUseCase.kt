package com.dream.wowiptv.domain.usecase

import androidx.media3.common.MimeTypes
import java.net.URI
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request

class ResolveStreamMimeUseCase @Inject constructor() {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val cache = ConcurrentHashMap<String, String?>()

    suspend operator fun invoke(url: String): String? = withContext(Dispatchers.IO) {
        cache[url]?.let { return@withContext it }
        val mime = inferFromExtension(url) ?: probeContentType(url)
        cache[url] = mime
        mime
    }

    private fun inferFromExtension(url: String): String? {
        val path = try {
            URI(url).path ?: ""
        } catch (_: Exception) {
            ""
        }
        val ext = path.substringAfterLast('.', "").lowercase()
        return when (ext) {
            "m3u8", "m3u" -> MimeTypes.APPLICATION_M3U8
            "mp4", "m4v" -> MimeTypes.VIDEO_MP4
            "flv", "f4v" -> MimeTypes.VIDEO_FLV
            "ts", "m2ts", "mts" -> MimeTypes.VIDEO_MP2T
            "mkv" -> MimeTypes.VIDEO_MATROSKA
            "webm" -> MimeTypes.VIDEO_WEBM
            "avi" -> "video/avi"
            "mpd" -> "application/dash+xml"
            "mp3" -> MimeTypes.AUDIO_MPEG
            "aac" -> MimeTypes.AUDIO_AAC
            "ac3" -> MimeTypes.AUDIO_AC3
            "ogg", "opus" -> MimeTypes.AUDIO_OGG
            else -> null
        }
    }

    private fun probeContentType(url: String): String? {
        headContentType(url)?.let { return it }
        return getContentType(url)
    }

    private fun headContentType(url: String): String? {
        return try {
            val request = Request.Builder().url(url).head().build()
            client.newCall(request).execute().use { response ->
                mimeFromHeader(response.header("Content-Type"))
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun getContentType(url: String): String? {
        return try {
            val request = Request.Builder()
                .url(url)
                .header("Range", "bytes=0-0")
                .build()
            client.newCall(request).execute().use { response ->
                mimeFromHeader(response.header("Content-Type"))
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun mimeFromHeader(contentType: String?): String? {
        val type = contentType?.substringBefore(';')?.trim()?.lowercase() ?: return null
        return when {
            type.contains("mpegurl") -> MimeTypes.APPLICATION_M3U8
            type.contains("flv") -> MimeTypes.VIDEO_FLV
            type.contains("mp2t") || type.contains("mpegts") || type == "video/ts" -> MimeTypes.VIDEO_MP2T
            type.contains("mp4") || type.contains("quicktime") -> MimeTypes.VIDEO_MP4
            type.startsWith("video/") || type.startsWith("audio/") -> type
            else -> null
        }
    }
}
