package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.data.parser.M3uPlaylistParser
import com.dream.wowiptv.data.remote.xtream.dto.AuthResponseDto
import com.google.gson.Gson
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request

data class SourceTestResult(
    val ok: Boolean,
    val message: String,
    val channels: Int = 0,
    val movies: Int = 0,
    val series: Int = 0
)

class TestSourceUseCase @Inject constructor(
    private val gson: Gson
) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    suspend fun testXtream(host: String, port: Int, username: String, password: String): SourceTestResult =
        withContext(Dispatchers.IO) {
            try {
                val base = "http://$host:$port/"
                val cred = "username=$username&password=$password"
                val authJson = get("${base}player_api.php?$cred")
                val auth = gson.fromJson(authJson, AuthResponseDto::class.java)
                val user = auth.userInfo
                if (user?.auth != 1) {
                    return@withContext SourceTestResult(false, user?.message ?: "认证失败")
                }
                val live = gson.fromJson(get("${base}player_api.php?$cred&action=get_live_streams"), Array<Any>::class.java).size
                val vod = gson.fromJson(get("${base}player_api.php?$cred&action=get_vod_streams"), Array<Any>::class.java).size
                val series = gson.fromJson(get("${base}player_api.php?$cred&action=get_series"), Array<Any>::class.java).size
                val message = "认证成功\n频道 $live · 电影 $vod · 剧集 $series"
                SourceTestResult(true, message, live, vod, series)
            } catch (e: Exception) {
                SourceTestResult(false, "连接失败: ${e.message}")
            }
        }

    suspend fun testM3u(url: String?, content: String?): SourceTestResult =
        withContext(Dispatchers.IO) {
            try {
                val text = if (content != null) content else {
                    val req = Request.Builder().url(url!!).build()
                    client.newCall(req).execute().use { it.body?.string() ?: "" }
                }
                val channels = M3uPlaylistParser.parse(text, "") { "Channel $it" }
                if (channels.isEmpty()) {
                    SourceTestResult(false, "解析失败或无有效频道")
                } else {
                    SourceTestResult(true, "解析正常,共 ${channels.size} 个频道", channels.size)
                }
            } catch (e: Exception) {
                SourceTestResult(false, "下载/解析失败: ${e.message}")
            }
        }

    private fun get(url: String): String {
        val request = Request.Builder().url(url).build()
        return client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw Exception("HTTP ${response.code}")
            response.body?.string() ?: throw Exception("空响应")
        }
    }
}
