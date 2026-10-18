package com.dream.wowiptv.data.remote.tmdb

import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

data class SearchMovieResponse(val results: List<SearchMovieResult> = emptyList())

data class SearchMovieResult(
    val id: Int = 0,
    val title: String? = null,
    val release_date: String? = null
)

data class CreditsResponse(val cast: List<CreditCast> = emptyList())

data class CreditCast(
    val name: String? = null,
    val profile_path: String? = null
)

data class SearchPersonResponse(val results: List<PersonResult> = emptyList())

data class PersonResult(
    val name: String? = null,
    val profile_path: String? = null
)

interface TmdbApi {

    @GET("search/movie")
    suspend fun searchMovie(
        @Query("api_key") apiKey: String,
        @Query("query") query: String,
        @Query("page") page: Int = 1
    ): SearchMovieResponse

    @GET("movie/{id}/credits")
    suspend fun getMovieCredits(
        @Path("id") movieId: Int,
        @Query("api_key") apiKey: String
    ): CreditsResponse

    @GET("search/person")
    suspend fun searchPerson(
        @Query("api_key") apiKey: String,
        @Query("query") query: String
    ): SearchPersonResponse
}
