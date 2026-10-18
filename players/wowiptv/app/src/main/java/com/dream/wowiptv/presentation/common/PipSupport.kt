package com.dream.wowiptv.presentation.common

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.PackageManager
import android.util.Rational

object PipState {
    @Volatile
    var videoActive: Boolean = false
    @Volatile
    var videoWidth: Int = 0
    @Volatile
    var videoHeight: Int = 0
    @Volatile
    var pixelRatio: Float = 1f
    @Volatile
    var rotationDegrees: Int = 0
}

fun buildPipRational(): Rational {
    val w = PipState.videoWidth
    val h = PipState.videoHeight
    if (w <= 0 || h <= 0) return Rational(16, 9)
    var effW = w * PipState.pixelRatio
    var effH = h.toFloat()
    if (PipState.rotationDegrees == 90 || PipState.rotationDegrees == 270) {
        val t = effW
        effW = effH
        effH = t
    }
    val maxRatio = 1.6f
    if (effW / effH > maxRatio) {
        effW = effH * maxRatio
    } else if (effH / effW > maxRatio) {
        effH = effW * maxRatio
    }
    return Rational((effW * 100).toInt().coerceAtLeast(1), (effH * 100).toInt().coerceAtLeast(1))
}

fun enterPictureInPicture(activity: Activity?) {
    val act = activity ?: return
    if (!act.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) return
    act.enterPictureInPictureMode(PictureInPictureParams.Builder().setAspectRatio(buildPipRational()).build())
}
