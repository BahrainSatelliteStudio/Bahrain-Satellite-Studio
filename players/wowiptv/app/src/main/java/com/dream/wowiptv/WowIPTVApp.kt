package com.dream.wowiptv

import android.app.Application
import coil.Coil
import coil.ImageLoader
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class WowIPTVApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Coil.setImageLoader(
            ImageLoader.Builder(this)
                .placeholder(R.drawable.ic_poster_placeholder)
                .error(R.drawable.ic_poster_error)
                .crossfade(true)
                .build()
        )
    }
}
