package com.dream.wowiptv

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.app.PictureInPictureParams
import android.os.Build
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.view.WindowInsetsControllerCompat
import androidx.navigation.compose.rememberNavController
import com.dream.wowiptv.presentation.common.PipState
import com.dream.wowiptv.presentation.common.buildPipRational
import com.dream.wowiptv.presentation.common.theme.ThemeController
import com.dream.wowiptv.presentation.common.theme.WowIPTVTheme
import com.dream.wowiptv.presentation.navigation.AppNavGraph
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    @Inject
    lateinit var themeController: ThemeController

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (PipState.videoActive && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            enterPictureInPictureMode(PictureInPictureParams.Builder().setAspectRatio(buildPipRational()).build())
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        window.setBackgroundDrawable(ColorDrawable(Color.parseColor("#1A1A1A")))
        window.navigationBarColor = Color.parseColor("#1A1A1A")
        WindowInsetsControllerCompat(window, window.decorView).let { controller ->
            controller.isAppearanceLightStatusBars = false
            controller.isAppearanceLightNavigationBars = false
        }

        setContent {
            val accent by themeController.current.collectAsState()
            WowIPTVTheme(accent = accent.palette) {
                val navController = rememberNavController()
                AppNavGraph(navController = navController)
            }
        }
    }
}
