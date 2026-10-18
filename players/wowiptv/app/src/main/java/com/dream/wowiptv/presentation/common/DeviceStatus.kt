package com.dream.wowiptv.presentation.common

import android.os.BatteryManager
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.BatteryFull
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.delay

data class DeviceStatusInfo(val time: String = "", val battery: Int = -1)

@Composable
fun rememberDeviceStatusInfo(): DeviceStatusInfo {
    val context = LocalContext.current
    val batteryManager = remember { context.getSystemService(BatteryManager::class.java) }
    var timeText by remember { mutableStateOf("") }
    var battery by remember { mutableIntStateOf(-1) }

    LaunchedEffect(Unit) {
        while (true) {
            timeText = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
            battery = batteryManager?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1
            delay(30000)
        }
    }

    return DeviceStatusInfo(timeText, battery)
}

@Composable
fun DeviceStatusIndicator(fontSize: TextUnit = 12.sp) {
    val status = rememberDeviceStatusInfo()
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = Icons.Filled.AccessTime,
            contentDescription = null,
            tint = Color(0xFFCCCCCC),
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(2.dp))
        Text(text = status.time, color = Color(0xFFCCCCCC), fontSize = fontSize)
        Spacer(modifier = Modifier.width(10.dp))
        Icon(
            imageVector = Icons.Filled.BatteryFull,
            contentDescription = null,
            tint = Color(0xFFCCCCCC),
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(2.dp))
        Text(text = "${status.battery}%", color = Color(0xFFCCCCCC), fontSize = fontSize)
    }
}
