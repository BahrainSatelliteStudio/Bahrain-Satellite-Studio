package com.dream.wowiptv.di

import com.dream.wowiptv.data.remote.xtream.XtreamApi
import com.dream.wowiptv.data.remote.tmdb.TmdbApi
import com.dream.wowiptv.data.remote.github.GithubApi
import com.google.gson.Gson
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideXtreamApi(okHttpClient: OkHttpClient, gson: Gson): XtreamApi {
        return Retrofit.Builder()
            .baseUrl("http://0.0.0.0/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(XtreamApi::class.java)
    }

    @Provides
    @Singleton
    fun provideTmdbApi(gson: Gson): TmdbApi {
        return Retrofit.Builder()
            .baseUrl("https://api.themoviedb.org/3/")
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(TmdbApi::class.java)
    }

    @Provides
    @Singleton
    fun provideGithubApi(gson: Gson): GithubApi {
        return Retrofit.Builder()
            .baseUrl("https://api.github.com/")
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(GithubApi::class.java)
    }
}
