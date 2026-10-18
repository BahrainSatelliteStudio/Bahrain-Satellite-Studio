package com.dream.wowiptv.domain.repository

interface TmdbRepository {

    suspend fun fetchPeopleImages(
        title: String?,
        releaseDate: String?,
        names: List<String>,
        apiKey: String
    ): Map<String, String?>
}
