package com.dream.wowiptv.data.repository

import com.dream.wowiptv.data.local.dao.PersonCacheDao
import com.dream.wowiptv.data.local.entity.CachedPersonEntity
import com.dream.wowiptv.data.remote.tmdb.TmdbApi
import com.dream.wowiptv.domain.repository.TmdbRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TmdbRepositoryImpl @Inject constructor(
    private val tmdbApi: TmdbApi,
    private val personCacheDao: PersonCacheDao
) : TmdbRepository {

    override suspend fun fetchPeopleImages(
        title: String?,
        releaseDate: String?,
        names: List<String>,
        apiKey: String
    ): Map<String, String?> {
        val cleaned = names.map { it.trim() }.filter { it.isNotEmpty() }.distinct()
        if (cleaned.isEmpty() || apiKey.isBlank()) return emptyMap()

        val result: MutableMap<String, String?> = personCacheDao.getByNames(cleaned)
            .associate { it.name to it.profilePath }
            .toMutableMap()
        val missing = cleaned.filter { it !in result }
        if (missing.isEmpty()) return result

        val creditsByName = if (!title.isNullOrBlank()) {
            try {
                val search = tmdbApi.searchMovie(apiKey, title)
                val movie = search.results.firstOrNull { it.release_date?.take(4)?.toIntOrNull() == releaseDate?.take(4)?.toIntOrNull() }
                    ?: search.results.firstOrNull()
                if (movie != null) {
                    tmdbApi.getMovieCredits(movie.id, apiKey)
                        .cast
                        .filter { !it.name.isNullOrBlank() }
                        .associate { it.name!!.trim() to profileUrl(it.profile_path) }
                } else {
                    emptyMap()
                }
            } catch (_: Exception) {
                emptyMap()
            }
        } else {
            emptyMap()
        }

        for (name in missing) {
            result[name] = creditsByName[name] ?: searchPersonPath(apiKey, name)
        }

        val toSave = missing
            .mapNotNull { name -> result[name]?.let { CachedPersonEntity(name, it) } }
        if (toSave.isNotEmpty()) {
            personCacheDao.upsertAll(toSave)
        }

        return result
    }

    private suspend fun searchPersonPath(apiKey: String, name: String): String? {
        return try {
            val response = tmdbApi.searchPerson(apiKey, name)
            response.results.firstOrNull()?.profile_path?.let { profileUrl(it) }
        } catch (_: Exception) {
            null
        }
    }

    private fun profileUrl(path: String?): String? =
        path?.takeIf { it.isNotBlank() }?.let { "https://image.tmdb.org/t/p/w185$it" }
}
