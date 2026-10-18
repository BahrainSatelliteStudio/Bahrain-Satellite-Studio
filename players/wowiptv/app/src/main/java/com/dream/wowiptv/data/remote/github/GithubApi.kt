package com.dream.wowiptv.data.remote.github

import retrofit2.http.GET
import retrofit2.http.Path

data class GithubReleaseDto(
    val tag_name: String? = null,
    val assets: List<GithubAssetDto> = emptyList()
)

data class GithubAssetDto(
    val name: String? = null,
    val browser_download_url: String? = null
)

interface GithubApi {

    @GET("repos/{owner}/{repo}/releases/latest")
    suspend fun getLatestRelease(
        @Path("owner") owner: String,
        @Path("repo") repo: String
    ): GithubReleaseDto
}
