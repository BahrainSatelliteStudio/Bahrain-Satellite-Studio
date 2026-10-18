package com.dream.wowiptv.data.parser

import java.net.URI

data class M3uChannel(
    val name: String,
    val logo: String?,
    val groupTitle: String?,
    val url: String
)

object M3uPlaylistParser {

    fun parse(content: String, baseUrl: String, nameFormatter: (Int) -> String = { "Channel $it" }): List<M3uChannel> {
        val channels = mutableListOf<M3uChannel>()
        val lines = content.lineSequence().toList()
        var i = 0
        while (i < lines.size) {
            val line = lines[i].trim()
            if (line.startsWith("#EXTINF")) {
                val attrs = parseAttributes(line)
                val name = attrs["tvg-name"]?.takeIf { it.isNotBlank() }
                    ?: line.substringAfterLast(",").trim().ifBlank { nameFormatter(channels.size + 1) }
                var url = ""
                var j = i + 1
                while (j < lines.size) {
                    val next = lines[j].trim()
                    if (next.startsWith("#EXTINF") || next.startsWith("#EXTM3U")) break
                    if (next.isNotEmpty() && !next.startsWith("#")) {
                        url = next
                        break
                    }
                    j++
                }
                if (url.isNotEmpty()) {
                    channels.add(
                        M3uChannel(
                            name = name,
                            logo = attrs["tvg-logo"]?.takeIf { it.isNotBlank() },
                            groupTitle = attrs["group-title"]?.takeIf { it.isNotBlank() },
                            url = resolveUrl(url, baseUrl)
                        )
                    )
                }
                i = j
            } else {
                i++
            }
        }
        return channels
    }

    private fun parseAttributes(extinf: String): Map<String, String> {
        val map = mutableMapOf<String, String>()
        val regex = Regex("([a-zA-Z0-9-]+)=\"([^\"]*)\"")
        regex.findAll(extinf).forEach { match ->
            map[match.groupValues[1]] = match.groupValues[2]
        }
        return map
    }

    private fun resolveUrl(url: String, baseUrl: String): String {
        if (url.startsWith("http://") || url.startsWith("https://")) return url
        return try {
            URI(baseUrl).resolve(url).toString()
        } catch (_: Exception) {
            url
        }
    }
}
