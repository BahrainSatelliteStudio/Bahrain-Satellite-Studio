package com.dream.wowiptv.di

import com.dream.wowiptv.data.repository.LiveTvRepositoryImpl
import com.dream.wowiptv.data.repository.SeriesRepositoryImpl
import com.dream.wowiptv.data.repository.SourceRepositoryImpl
import com.dream.wowiptv.data.repository.TmdbRepositoryImpl
import com.dream.wowiptv.data.repository.VodRepositoryImpl
import com.dream.wowiptv.domain.repository.LiveTvRepository
import com.dream.wowiptv.domain.repository.SeriesRepository
import com.dream.wowiptv.domain.repository.SourceRepository
import com.dream.wowiptv.domain.repository.TmdbRepository
import com.dream.wowiptv.domain.repository.VodRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindSourceRepository(impl: SourceRepositoryImpl): SourceRepository

    @Binds
    @Singleton
    abstract fun bindLiveTvRepository(impl: LiveTvRepositoryImpl): LiveTvRepository

    @Binds
    @Singleton
    abstract fun bindVodRepository(impl: VodRepositoryImpl): VodRepository

    @Binds
    @Singleton
    abstract fun bindSeriesRepository(impl: SeriesRepositoryImpl): SeriesRepository

    @Binds
    @Singleton
    abstract fun bindTmdbRepository(impl: TmdbRepositoryImpl): TmdbRepository
}
