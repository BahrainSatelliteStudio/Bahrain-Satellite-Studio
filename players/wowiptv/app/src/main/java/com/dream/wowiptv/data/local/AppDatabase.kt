package com.dream.wowiptv.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.dream.wowiptv.data.local.dao.EpgDao
import com.dream.wowiptv.data.local.dao.DataCleanupDao
import com.dream.wowiptv.data.local.dao.FavoriteStreamDao
import com.dream.wowiptv.data.local.dao.FavoriteVodDao
import com.dream.wowiptv.data.local.dao.LiveCategoryDao
import com.dream.wowiptv.data.local.dao.PersonCacheDao
import com.dream.wowiptv.data.local.dao.WatchProgressDao
import com.dream.wowiptv.data.local.dao.LiveStreamDao
import com.dream.wowiptv.data.local.dao.SeriesCategoryDao
import com.dream.wowiptv.data.local.dao.SeriesDao
import com.dream.wowiptv.data.local.dao.SourceDao
import com.dream.wowiptv.data.local.dao.VodCategoryDao
import com.dream.wowiptv.data.local.dao.VodInfoDao
import com.dream.wowiptv.data.local.dao.VodStreamDao
import com.dream.wowiptv.data.local.entity.CachedVodInfoEntity
import com.dream.wowiptv.data.local.entity.CachedPersonEntity
import com.dream.wowiptv.data.local.entity.EpisodeEntity
import com.dream.wowiptv.data.local.entity.EpgEntity
import com.dream.wowiptv.data.local.entity.FavoriteStreamEntity
import com.dream.wowiptv.data.local.entity.FavoriteVodEntity
import com.dream.wowiptv.data.local.entity.LiveCategoryEntity
import com.dream.wowiptv.data.local.entity.WatchProgressEntity
import com.dream.wowiptv.data.local.entity.LiveStreamEntity
import com.dream.wowiptv.data.local.entity.SeasonEntity
import com.dream.wowiptv.data.local.entity.SeriesCategoryEntity
import com.dream.wowiptv.data.local.entity.SeriesEntity
import com.dream.wowiptv.data.local.entity.SourceEntity
import com.dream.wowiptv.data.local.entity.VodCategoryEntity
import com.dream.wowiptv.data.local.entity.VodStreamEntity

@Database(
    entities = [
        SourceEntity::class,
        LiveCategoryEntity::class,
        LiveStreamEntity::class,
        EpgEntity::class,
        VodCategoryEntity::class,
        VodStreamEntity::class,
        CachedVodInfoEntity::class,
        SeriesCategoryEntity::class,
        SeriesEntity::class,
        SeasonEntity::class,
        EpisodeEntity::class,
        FavoriteStreamEntity::class,
        FavoriteVodEntity::class,
        WatchProgressEntity::class,
        CachedPersonEntity::class
    ],
    version = 10
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun sourceDao(): SourceDao
    abstract fun liveCategoryDao(): LiveCategoryDao
    abstract fun liveStreamDao(): LiveStreamDao
    abstract fun epgDao(): EpgDao
    abstract fun vodCategoryDao(): VodCategoryDao
    abstract fun vodStreamDao(): VodStreamDao
    abstract fun vodInfoDao(): VodInfoDao
    abstract fun seriesCategoryDao(): SeriesCategoryDao
    abstract fun seriesDao(): SeriesDao
    abstract fun favoriteStreamDao(): FavoriteStreamDao
    abstract fun favoriteVodDao(): FavoriteVodDao
    abstract fun watchProgressDao(): WatchProgressDao
    abstract fun dataCleanupDao(): DataCleanupDao
    abstract fun personCacheDao(): PersonCacheDao
}