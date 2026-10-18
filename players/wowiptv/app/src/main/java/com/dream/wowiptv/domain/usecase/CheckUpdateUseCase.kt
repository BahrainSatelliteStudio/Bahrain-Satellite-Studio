package com.dream.wowiptv.domain.usecase

import com.dream.wowiptv.data.remote.github.GithubApi
import javax.inject.Inject

data class UpdateInfo(
    val latestVersion: String,
    val downloadUrl: String
)

class CheckUpdateUseCase @Inject constructor(
    private val githubApi: GithubApi
) {

    suspend operator fun invoke(owner: String, repo: String, currentVersion: String): UpdateInfo? {
        return try {
            val release = githubApi.getLatestRelease(owner, repo)
            val tag = release.tag_name?.removePrefix("v").orEmpty()
            if (tag.isBlank()) return null
            val asset = release.assets.firstOrNull { it.name?.endsWith(".apk") == true } ?: return null
            val url = asset.browser_download_url ?: return null
            if (!isNewer(tag, currentVersion)) return null
            UpdateInfo(latestVersion = tag, downloadUrl = url)
        } catch (_: Exception) {
            null
        }
    }

    private fun isNewer(latest: String, current: String): Boolean {
        val l = latest.split(".").mapNotNull { it.toIntOrNull() }
        val c = current.split(".").mapNotNull { it.toIntOrNull() }
        val max = maxOf(l.size, c.size)
        for (i in 0 until max) {
            val lv = l.getOrElse(i) { 0 }
            val cv = c.getOrElse(i) { 0 }
            if (lv != cv) return lv > cv
        }
        return false
    }
}
