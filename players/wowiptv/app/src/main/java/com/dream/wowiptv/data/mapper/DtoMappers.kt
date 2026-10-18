package com.dream.wowiptv.data.mapper

import com.dream.wowiptv.data.local.entity.CachedVodInfoEntity
import com.dream.wowiptv.data.local.entity.EpisodeEntity
import com.dream.wowiptv.data.local.entity.EpgEntity
import com.dream.wowiptv.data.local.entity.LiveCategoryEntity
import com.dream.wowiptv.data.local.entity.LiveStreamEntity
import com.dream.wowiptv.data.local.entity.SeasonEntity
import com.dream.wowiptv.data.local.entity.SeriesCategoryEntity
import com.dream.wowiptv.data.local.entity.SeriesEntity
import com.dream.wowiptv.data.local.entity.VodCategoryEntity
import com.dream.wowiptv.data.local.entity.VodStreamEntity
import com.dream.wowiptv.data.remote.xtream.dto.EpgEntryDto
import com.dream.wowiptv.data.remote.xtream.dto.LiveCategoryDto
import com.dream.wowiptv.data.remote.xtream.dto.LiveStreamDto
import com.dream.wowiptv.data.remote.xtream.dto.SeriesCategoryDto
import com.dream.wowiptv.data.remote.xtream.dto.SeriesDto
import com.dream.wowiptv.data.remote.xtream.dto.SeriesInfoDto
import com.dream.wowiptv.data.remote.xtream.dto.ShortEpgResponseDto
import com.dream.wowiptv.data.remote.xtream.dto.VodCategoryDto
import com.dream.wowiptv.data.remote.xtream.dto.VodInfoDto
import com.dream.wowiptv.data.remote.xtream.dto.VodStreamDto
import com.dream.wowiptv.domain.model.Episode
import com.dream.wowiptv.domain.model.EpgEntry
import com.dream.wowiptv.domain.model.LiveCategory
import com.dream.wowiptv.domain.model.LiveStream
import com.dream.wowiptv.domain.model.Season
import com.dream.wowiptv.domain.model.SeriesCategory
import com.dream.wowiptv.domain.model.SeriesInfo
import com.dream.wowiptv.domain.model.SeriesItem
import com.dream.wowiptv.domain.model.VodCategory
import com.dream.wowiptv.domain.model.VodInfo
import com.dream.wowiptv.domain.model.VodStream

// ── DTO → Domain ──────────────────────────────────────────────

fun LiveCategoryDto.toDomain(): LiveCategory {
    return LiveCategory(
        id = categoryId.toIntOrNull() ?: 0,
        name = categoryName
    )
}

fun LiveStreamDto.toDomain(): LiveStream {
    return LiveStream(
        id = streamId ?: 0,
        name = name.orEmpty(),
        iconUrl = streamIcon,
        epgChannelId = epgChannelId,
        categoryId = categoryId?.toIntOrNull() ?: 0,
        hasArchive = tvArchive == 1,
        added = added,
        m3uUrl = null
    )
}

fun ShortEpgResponseDto.toDomain(streamId: Int): List<EpgEntry> {
    return epgListings?.map { it.toDomain(streamId) } ?: emptyList()
}

fun EpgEntryDto.toDomain(streamId: Int): EpgEntry {
    return EpgEntry(
        streamId = streamId,
        title = title.orEmpty(),
        description = description,
        startTime = (startTimestamp ?: 0L).toEpochMillis(),
        endTime = (stopTimestamp ?: 0L).toEpochMillis(),
        isNowPlaying = nowPlaying == 1
    )
}

private fun Long.toEpochMillis(): Long =
    if (this > 1_000_000_000_000L) this else this * 1000

fun VodCategoryDto.toDomain(): VodCategory {
    return VodCategory(
        id = categoryId.toIntOrNull() ?: 0,
        name = categoryName
    )
}

fun VodStreamDto.toDomain(): VodStream {
    return VodStream(
        id = streamId ?: 0,
        name = name.orEmpty(),
        icon = streamIcon,
        rating = rating?.toDoubleOrNull(),
        added = added.orEmpty(),
        categoryId = categoryId?.toIntOrNull() ?: 0,
        containerExtension = containerExtension.orEmpty()
    )
}

fun VodInfoDto.toDomain(): VodInfo {
    val infoData = info
    val movieData = movieData
    return VodInfo(
        id = movieData?.streamId ?: 0,
        name = movieData?.name.orEmpty(),
        cover = infoData?.movieImage,
        backdropPath = infoData?.backdropPath?.firstOrNull(),
        plot = infoData?.plot,
        cast = infoData?.cast,
        director = infoData?.director,
        genre = infoData?.genre,
        releasedate = infoData?.releasedate,
        durationSecs = infoData?.durationSecs?.toIntOrNull(),
        rating = infoData?.rating?.toDoubleOrNull(),
        youtubeTrailer = infoData?.youtubeTrailer,
        categoryId = movieData?.categoryId?.toIntOrNull() ?: 0
    )
}

fun SeriesCategoryDto.toDomain(): SeriesCategory {
    return SeriesCategory(
        id = categoryId.toIntOrNull() ?: 0,
        name = categoryName
    )
}

fun SeriesDto.toDomain(): SeriesItem {
    return SeriesItem(
        id = seriesId ?: 0,
        name = name.orEmpty(),
        cover = cover,
        plot = plot,
        cast = cast,
        director = director,
        genre = genre,
        rating = rating,
        releaseDate = releaseDate,
        lastModified = lastModified,
        categoryId = categoryId?.toIntOrNull() ?: 0
    )
}

fun SeriesInfoDto.toDomain(seriesId: Int = 0): SeriesInfo {
    val infoData = info
    return SeriesInfo(
        seasons = seasons?.map { seasonDto ->
            Season(
                id = seasonDto.id ?: 0,
                seasonNumber = seasonDto.seasonNumber ?: 0,
                name = seasonDto.name.orEmpty(),
                cover = null,
                episodeCount = seasonDto.episodeCount ?: 0
            )
        } ?: emptyList(),
        episodes = episodes?.mapKeys { entry ->
            entry.key.toIntOrNull() ?: 0
        }?.mapValues { entry ->
            val seasonKey = entry.key
            entry.value.map { episodeDto ->
                Episode(
                    id = episodeDto.id ?: "",
                    seasonNum = episodeDto.season ?: seasonKey,
                    episodeNum = episodeDto.episodeNum?.toIntOrNull() ?: 0,
                    title = episodeDto.title.orEmpty(),
                    containerExtension = episodeDto.containerExtension.orEmpty(),
                    plot = episodeDto.info?.plot,
                    releasedate = episodeDto.info?.releasedate,
                    durationSecs = episodeDto.info?.durationSecs?.toIntOrNull()
                )
            }
        } ?: emptyMap(),
        info = SeriesItem(
            id = seriesId,
            name = infoData?.name.orEmpty(),
            cover = infoData?.cover,
            plot = infoData?.plot,
            cast = infoData?.cast,
            director = infoData?.director,
            genre = infoData?.genre,
            rating = infoData?.rating,
            releaseDate = infoData?.releaseDate,
            lastModified = null,
            categoryId = 0
        )
    )
}

// ── Domain → Entity ──────────────────────────────────────────

fun LiveCategory.toEntity(sourceId: Long): LiveCategoryEntity {
    return LiveCategoryEntity(
        categoryId = id,
        name = name,
        sourceId = sourceId
    )
}

fun LiveStream.toEntity(sourceId: Long): LiveStreamEntity {
    return LiveStreamEntity(
        streamId = id,
        name = name,
        streamIcon = iconUrl,
        epgChannelId = epgChannelId,
        categoryId = categoryId,
        tvArchive = hasArchive,
        added = added,
        m3uUrl = m3uUrl,
        sourceId = sourceId
    )
}

fun EpgEntry.toEntity(streamId: Int, sourceId: Long): EpgEntity {
    return EpgEntity(
        streamId = streamId,
        epgId = null,
        title = title,
        description = description,
        startTimestamp = startTime,
        stopTimestamp = endTime,
        nowPlaying = isNowPlaying,
        sourceId = sourceId
    )
}

fun VodCategory.toEntity(sourceId: Long): VodCategoryEntity {
    return VodCategoryEntity(
        categoryId = id,
        name = name,
        sourceId = sourceId
    )
}

fun VodStream.toEntity(sourceId: Long): VodStreamEntity {
    return VodStreamEntity(
        streamId = id,
        name = name,
        streamIcon = icon,
        rating = rating?.toString(),
        added = added,
        categoryId = categoryId,
        containerExtension = containerExtension,
        sourceId = sourceId
    )
}

fun VodInfo.toCachedEntity(sourceId: Long): CachedVodInfoEntity {
    return CachedVodInfoEntity(
        vodId = id,
        name = name,
        cover = cover,
        backdropPath = backdropPath,
        plot = plot,
        cast = cast,
        director = director,
        genre = genre,
        releasedate = releasedate,
        durationSecs = durationSecs,
        rating = rating,
        youtubeTrailer = youtubeTrailer,
        categoryId = categoryId,
        sourceId = sourceId
    )
}

fun CachedVodInfoEntity.toDomain(): VodInfo {
    return VodInfo(
        id = vodId,
        name = name,
        cover = cover,
        backdropPath = backdropPath,
        plot = plot,
        cast = cast,
        director = director,
        genre = genre,
        releasedate = releasedate,
        durationSecs = durationSecs,
        rating = rating,
        youtubeTrailer = youtubeTrailer,
        categoryId = categoryId
    )
}

fun SeriesCategory.toEntity(sourceId: Long): SeriesCategoryEntity {
    return SeriesCategoryEntity(
        categoryId = id,
        name = name,
        sourceId = sourceId
    )
}

fun SeriesItem.toEntity(sourceId: Long): SeriesEntity {
    return SeriesEntity(
        seriesId = id,
        name = name,
        cover = cover,
        plot = plot,
        cast = cast,
        director = director,
        genre = genre,
        rating = rating,
        releaseDate = releaseDate,
        lastModified = lastModified,
        categoryId = categoryId,
        sourceId = sourceId
    )
}

fun Season.toEntity(seriesId: Int, sourceId: Long): SeasonEntity {
    return SeasonEntity(
        seasonId = id,
        seriesId = seriesId,
        seasonNumber = seasonNumber,
        name = name,
        episodeCount = episodeCount,
        sourceId = sourceId
    )
}

fun Episode.toEntity(seriesId: Int, sourceId: Long): EpisodeEntity {
    return EpisodeEntity(
        episodeId = id,
        seriesId = seriesId,
        seasonNum = seasonNum,
        episodeNum = episodeNum,
        title = title,
        containerExtension = containerExtension,
        plot = plot,
        releasedate = releasedate,
        durationSecs = durationSecs,
        sourceId = sourceId
    )
}

// ── Entity → Domain ──────────────────────────────────────────

fun LiveCategoryEntity.toDomain(): LiveCategory {
    return LiveCategory(
        id = categoryId,
        name = name
    )
}

fun LiveStreamEntity.toDomain(): LiveStream {
    return LiveStream(
        id = streamId,
        name = name,
        iconUrl = streamIcon,
        epgChannelId = epgChannelId,
        categoryId = categoryId ?: 0,
        hasArchive = tvArchive,
        added = added,
        m3uUrl = m3uUrl
    )
}

fun EpgEntity.toDomain(): EpgEntry {
    return EpgEntry(
        streamId = streamId,
        title = title.orEmpty(),
        description = description,
        startTime = startTimestamp ?: 0L,
        endTime = stopTimestamp ?: 0L,
        isNowPlaying = nowPlaying
    )
}

fun VodCategoryEntity.toDomain(): VodCategory {
    return VodCategory(
        id = categoryId,
        name = name
    )
}

fun VodStreamEntity.toDomain(): VodStream {
    return VodStream(
        id = streamId,
        name = name.orEmpty(),
        icon = streamIcon,
        rating = rating?.toDoubleOrNull(),
        added = added.orEmpty(),
        categoryId = categoryId ?: 0,
        containerExtension = containerExtension.orEmpty()
    )
}

fun SeriesCategoryEntity.toDomain(): SeriesCategory {
    return SeriesCategory(
        id = categoryId,
        name = name
    )
}

fun SeriesEntity.toDomain(): SeriesItem {
    return SeriesItem(
        id = seriesId,
        name = name.orEmpty(),
        cover = cover,
        plot = plot,
        cast = cast,
        director = director,
        genre = genre,
        rating = rating,
        releaseDate = releaseDate,
        lastModified = lastModified,
        categoryId = categoryId ?: 0
    )
}

fun SeasonEntity.toDomain(): Season {
    return Season(
        id = seasonId,
        seasonNumber = seasonNumber ?: 0,
        name = name.orEmpty(),
        cover = null,
        episodeCount = episodeCount ?: 0
    )
}

fun EpisodeEntity.toDomain(): Episode {
    return Episode(
        id = episodeId,
        seasonNum = seasonNum ?: 0,
        episodeNum = episodeNum ?: 0,
        title = title.orEmpty(),
        containerExtension = containerExtension.orEmpty(),
        plot = plot,
        releasedate = releasedate,
        durationSecs = durationSecs
    )
}
