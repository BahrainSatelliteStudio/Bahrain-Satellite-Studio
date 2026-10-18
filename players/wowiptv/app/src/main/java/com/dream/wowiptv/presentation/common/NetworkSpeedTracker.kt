package com.dream.wowiptv.presentation.common

import android.os.SystemClock
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.TransferListener

class NetworkSpeedTracker : TransferListener {
    private val samples = ArrayDeque<Pair<Long, Long>>()
    private var totalBytes = 0L

    override fun onTransferInitializing(source: DataSource, dataSpec: DataSpec, isNetwork: Boolean) {}

    override fun onTransferStart(source: DataSource, dataSpec: DataSpec, isNetwork: Boolean) {}

    @Synchronized
    override fun onBytesTransferred(source: DataSource, dataSpec: DataSpec, isNetwork: Boolean, bytesTransferred: Int) {
        if (!isNetwork) return
        totalBytes += bytesTransferred
        samples.addLast(SystemClock.elapsedRealtime() to totalBytes)
    }

    override fun onTransferEnd(source: DataSource, dataSpec: DataSpec, isNetwork: Boolean) {}

    @Synchronized
    fun currentBps(): Long {
        val now = SystemClock.elapsedRealtime()
        while (samples.size > 1 && samples.first().first < now - 2000) {
            samples.removeFirst()
        }
        if (samples.isEmpty()) return 0L
        val (startTime, startBytes) = samples.first()
        val elapsed = (now - startTime).coerceAtLeast(1)
        return (totalBytes - startBytes) * 8000 / elapsed
    }
}

fun formatNetworkSpeed(bps: Long): String {
    val bytesPerSec = bps / 8.0
    return when {
        bytesPerSec >= 1024 * 1024 -> String.format("%.1fM/s", bytesPerSec / 1024 / 1024)
        bytesPerSec >= 1024 -> String.format("%.0fk/s", bytesPerSec / 1024)
        else -> "${bytesPerSec.toInt()}B/s"
    }
}
