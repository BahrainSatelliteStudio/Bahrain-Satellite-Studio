package com.dream.wowiptv.data.repository

import android.content.Context
import com.dream.wowiptv.data.local.dao.LiveCategoryDao
import com.dream.wowiptv.data.local.dao.LiveStreamDao
import com.dream.wowiptv.data.local.entity.LiveCategoryEntity
import com.dream.wowiptv.data.local.entity.LiveStreamEntity
import com.dream.wowiptv.data.parser.M3uPlaylistParser
import com.dream.wowiptv.domain.model.XtreamSource
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request

@Singleton
class M3uRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val liveCategoryDao: LiveCategoryDao,
    private val liveStreamDao: LiveStreamDao
) {
    private val client = OkHttpClient()

    suspend fun refreshAll(source: XtreamSource) {
        val content = loadContent(source.serverUrl)
        val baseUrl = if (source.serverUrl.startsWith("file://")) "" else source.serverUrl
        val channels = M3uPlaylistParser.parse(content, baseUrl)
        if (channels.isEmpty()) throw IllegalStateException("No channels in M3U playlist")

        val groups = channels.mapNotNull { it.groupTitle }.distinct()
        val catMap = groups.mapIndexed { index, name -> name to (index + 1) }.toMap()

        liveCategoryDao.deleteBySource(source.id)
        liveCategoryDao.insertAll(groups.mapIndexed { index, name ->
            LiveCategoryEntity(categoryId = index + 1, name = name, sourceId = source.id)
        })

        liveStreamDao.deleteBySource(source.id)
        liveStreamDao.insertAll(channels.mapIndexed { index, ch ->
            LiveStreamEntity(
                streamId = index + 1,
                name = ch.name,
                streamIcon = ch.logo,
                epgChannelId = null,
                categoryId = ch.groupTitle?.let { catMap[it] },
                tvArchive = false,
                m3uUrl = ch.url,
                sourceId = source.id
            )
        })
    }

    private suspend fun loadContent(serverUrl: String): String = withContext(Dispatchers.IO) {
        if (serverUrl.startsWith("file://")) {
            val filePath = serverUrl.removePrefix("file://")
            val file = File(context.filesDir, filePath)
            file.readText()
        } else {
            val request = Request.Builder().url(serverUrl).build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) throw IllegalStateException("Download failed: ${response.code}")
                response.body?.string() ?: throw IllegalStateException("Empty response")
            }
        }
    }
}
