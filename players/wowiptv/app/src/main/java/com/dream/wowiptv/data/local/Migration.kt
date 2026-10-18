package com.dream.wowiptv.data.local

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.dream.wowiptv.data.local.dao.EpgDao
import com.dream.wowiptv.data.local.dao.FavoriteStreamDao
import com.dream.wowiptv.data.local.dao.FavoriteVodDao
import com.dream.wowiptv.data.local.dao.LiveCategoryDao
import com.dream.wowiptv.data.local.dao.LiveStreamDao
import com.dream.wowiptv.data.local.dao.SeriesCategoryDao
import com.dream.wowiptv.data.local.dao.SeriesDao
import com.dream.wowiptv.data.local.dao.SourceDao
import com.dream.wowiptv.data.local.dao.VodCategoryDao
import com.dream.wowiptv.data.local.dao.VodInfoDao
import com.dream.wowiptv.data.local.dao.VodStreamDao

val MIGRATION_4_5 = object : Migration(4, 5) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE series_list ADD COLUMN releaseDate TEXT")
        db.execSQL(
            """CREATE TABLE IF NOT EXISTS favorite_vod (
                vodId INTEGER NOT NULL,
                sourceId INTEGER NOT NULL,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                icon TEXT,
                categoryId INTEGER NOT NULL,
                PRIMARY KEY(vodId, sourceId)
            )"""
        )
    }
}

val MIGRATION_5_6 = object : Migration(5, 6) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""CREATE TABLE favorite_vod_new (
            vodId INTEGER NOT NULL,
            sourceId INTEGER NOT NULL,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            icon TEXT,
            categoryId INTEGER NOT NULL,
            PRIMARY KEY(vodId, sourceId, type)
        )""")
        db.execSQL("INSERT OR IGNORE INTO favorite_vod_new SELECT * FROM favorite_vod")
        db.execSQL("DROP TABLE favorite_vod")
        db.execSQL("ALTER TABLE favorite_vod_new RENAME TO favorite_vod")
    }
}

val MIGRATION_6_7 = object : Migration(6, 7) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """CREATE TABLE IF NOT EXISTS watch_progress (
                contentId TEXT NOT NULL,
                sourceId INTEGER NOT NULL,
                contentType TEXT NOT NULL,
                name TEXT NOT NULL,
                icon TEXT,
                position INTEGER NOT NULL,
                duration INTEGER NOT NULL,
                lastWatched INTEGER NOT NULL,
                PRIMARY KEY(contentId, sourceId)
            )"""
        )
    }
}

val MIGRATION_7_8 = object : Migration(7, 8) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE sources ADD COLUMN type TEXT NOT NULL DEFAULT 'xtream'")
        db.execSQL("ALTER TABLE live_streams ADD COLUMN m3uUrl TEXT")
    }
}

val MIGRATION_8_9 = object : Migration(8, 9) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """CREATE TABLE IF NOT EXISTS person_cache (
                name TEXT NOT NULL PRIMARY KEY,
                profilePath TEXT NOT NULL
            )"""
        )
    }
}

val MIGRATION_9_10 = object : Migration(9, 10) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE live_streams ADD COLUMN added TEXT")
        db.execSQL("ALTER TABLE series_list ADD COLUMN lastModified TEXT")
    }
}