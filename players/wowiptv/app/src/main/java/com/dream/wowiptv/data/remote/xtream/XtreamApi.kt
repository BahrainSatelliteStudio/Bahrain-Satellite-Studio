package com.dream.wowiptv.data.remote.xtream

import com.dream.wowiptv.data.remote.xtream.dto.AuthResponseDto
import com.dream.wowiptv.data.remote.xtream.dto.LiveCategoryDto
import com.dream.wowiptv.data.remote.xtream.dto.LiveStreamDto
import com.dream.wowiptv.data.remote.xtream.dto.SeriesCategoryDto
import com.dream.wowiptv.data.remote.xtream.dto.SeriesDto
import com.dream.wowiptv.data.remote.xtream.dto.SeriesInfoDto
import com.dream.wowiptv.data.remote.xtream.dto.ShortEpgResponseDto
import com.dream.wowiptv.data.remote.xtream.dto.VodCategoryDto
import com.dream.wowiptv.data.remote.xtream.dto.VodInfoDto
import com.dream.wowiptv.data.remote.xtream.dto.VodStreamDto
import retrofit2.http.GET
import retrofit2.http.Query

interface XtreamApi {

    @GET("player_api.php")
    suspend fun authenticate(
        @Query("username") username: String,
        @Query("password") password: String
    ): AuthResponseDto

    @GET("player_api.php")
    suspend fun getLiveCategories(
        @Query("username") username: String,
        @Query("password") password: String,
        @Query("action") action: String = "get_live_categories"
    ): List<LiveCategoryDto>

    @GET("player_api.php")
    suspend fun getLiveStreams(
        @Query("username") username: String,
        @Query("password") password: String,
        @Query("action") action: String = "get_live_streams",
        @Query("category_id") categoryId: Int? = null
    ): List<LiveStreamDto>

    @GET("player_api.php")
    suspend fun getShortEpg(
        @Query("username") username: String,
        @Query("password") password: String,
        @Query("action") action: String = "get_short_epg",
        @Query("stream_id") streamId: Int,
        @Query("limit") limit: Int = 4
    ): ShortEpgResponseDto

    @GET("player_api.php")
    suspend fun getVodCategories(
        @Query("username") username: String,
        @Query("password") password: String,
        @Query("action") action: String = "get_vod_categories"
    ): List<VodCategoryDto>

    @GET("player_api.php")
    suspend fun getVodStreams(
        @Query("username") username: String,
        @Query("password") password: String,
        @Query("action") action: String = "get_vod_streams",
        @Query("category_id") categoryId: Int? = null
    ): List<VodStreamDto>

    @GET("player_api.php")
    suspend fun getVodInfo(
        @Query("username") username: String,
        @Query("password") password: String,
        @Query("action") action: String = "get_vod_info",
        @Query("vod_id") vodId: Int
    ): VodInfoDto

    @GET("player_api.php")
    suspend fun getSeriesCategories(
        @Query("username") username: String,
        @Query("password") password: String,
        @Query("action") action: String = "get_series_categories"
    ): List<SeriesCategoryDto>

    @GET("player_api.php")
    suspend fun getSeries(
        @Query("username") username: String,
        @Query("password") password: String,
        @Query("action") action: String = "get_series",
        @Query("category_id") categoryId: Int? = null
    ): List<SeriesDto>

    @GET("player_api.php")
    suspend fun getSeriesInfo(
        @Query("username") username: String,
        @Query("password") password: String,
        @Query("action") action: String = "get_series_info",
        @Query("series_id") seriesId: Int
    ): SeriesInfoDto
}
