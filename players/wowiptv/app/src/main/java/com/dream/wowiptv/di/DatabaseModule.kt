package com.dream.wowiptv.di

import android.content.Context
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.dream.wowiptv.data.local.AppDatabase
import com.dream.wowiptv.data.local.MIGRATION_4_5
import com.dream.wowiptv.data.local.MIGRATION_5_6
import com.dream.wowiptv.data.local.MIGRATION_6_7
import com.dream.wowiptv.data.local.MIGRATION_7_8
import com.dream.wowiptv.data.local.MIGRATION_8_9
import com.dream.wowiptv.data.local.MIGRATION_9_10
import com.dream.wowiptv.data.local.dao.EpgDao
import com.dream.wowiptv.data.local.dao.DataCleanupDao
import com.dream.wowiptv.data.local.dao.FavoriteStreamDao
import com.dream.wowiptv.data.local.dao.FavoriteVodDao
import com.dream.wowiptv.data.local.dao.LiveCategoryDao
import com.dream.wowiptv.data.local.dao.LiveStreamDao
import com.dream.wowiptv.data.local.dao.PersonCacheDao
import com.dream.wowiptv.data.local.dao.SeriesCategoryDao
import com.dream.wowiptv.data.local.dao.SeriesDao
import com.dream.wowiptv.data.local.dao.SourceDao
import com.dream.wowiptv.data.local.dao.VodCategoryDao
import com.dream.wowiptv.data.local.dao.VodInfoDao
import com.dream.wowiptv.data.local.dao.VodStreamDao
import com.dream.wowiptv.data.local.dao.WatchProgressDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    private val MIGRATION_3_4 = object : Migration(3, 4) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                """CREATE TABLE IF NOT EXISTS `favorite_streams` (
                    `streamId` INTEGER NOT NULL,
                    `sourceId` INTEGER NOT NULL,
                    `name` TEXT NOT NULL,
                    `iconUrl` TEXT,
                    `categoryId` INTEGER NOT NULL,
                    PRIMARY KEY(`streamId`, `sourceId`)
                )"""
            )
        }
    }

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "wowiptv.db"
        ).addMigrations(MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6, MIGRATION_6_7, MIGRATION_7_8, MIGRATION_8_9, MIGRATION_9_10).build()
    }

    @Provides fun provideSourceDao(db: AppDatabase): SourceDao = db.sourceDao()
    @Provides fun provideLiveCategoryDao(db: AppDatabase): LiveCategoryDao = db.liveCategoryDao()
    @Provides fun provideLiveStreamDao(db: AppDatabase): LiveStreamDao = db.liveStreamDao()
    @Provides fun provideEpgDao(db: AppDatabase): EpgDao = db.epgDao()
    @Provides fun provideVodCategoryDao(db: AppDatabase): VodCategoryDao = db.vodCategoryDao()
    @Provides fun provideVodStreamDao(db: AppDatabase): VodStreamDao = db.vodStreamDao()
    @Provides fun provideVodInfoDao(db: AppDatabase): VodInfoDao = db.vodInfoDao()
    @Provides fun provideSeriesCategoryDao(db: AppDatabase): SeriesCategoryDao = db.seriesCategoryDao()
    @Provides fun provideSeriesDao(db: AppDatabase): SeriesDao = db.seriesDao()
    @Provides fun provideFavoriteStreamDao(db: AppDatabase): FavoriteStreamDao = db.favoriteStreamDao()
    @Provides fun provideFavoriteVodDao(db: AppDatabase): FavoriteVodDao = db.favoriteVodDao()
    @Provides fun provideWatchProgressDao(db: AppDatabase): WatchProgressDao = db.watchProgressDao()
    @Provides fun provideDataCleanupDao(db: AppDatabase): DataCleanupDao = db.dataCleanupDao()
    @Provides fun providePersonCacheDao(db: AppDatabase): PersonCacheDao = db.personCacheDao()
}