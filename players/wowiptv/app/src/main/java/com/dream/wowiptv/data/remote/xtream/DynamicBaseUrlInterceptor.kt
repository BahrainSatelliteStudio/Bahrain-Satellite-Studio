package com.dream.wowiptv.data.remote.xtream

import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

class DynamicBaseUrlInterceptor : Interceptor {

    @Volatile
    private var currentBaseUrl: String? = null

    fun setBaseUrl(url: String) {
        currentBaseUrl = url
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val baseUrl = currentBaseUrl ?: return chain.proceed(request)

        val headerUrl = request.header("X-Dynamic-Base-Url")
        val effectiveBaseUrl = headerUrl ?: baseUrl

        val parsedUrl = effectiveBaseUrl.toHttpUrlOrNull() ?: return chain.proceed(request)
        val originalUrl = request.url

        val rebuiltUrl = originalUrl.newBuilder()
            .scheme(parsedUrl.scheme)
            .host(parsedUrl.host)
            .port(parsedUrl.port)
            .build()

        val newRequest = request.newBuilder()
            .url(rebuiltUrl)
            .removeHeader("X-Dynamic-Base-Url")
            .build()

        return chain.proceed(newRequest)
    }
}
