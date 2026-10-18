package com.dream.wowiptv.presentation.update

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dream.wowiptv.R
import com.dream.wowiptv.presentation.common.theme.LocalAccentPalette

@Composable
fun UpdateCheckDialog(
    state: UpdateState,
    currentVersion: String,
    onDismiss: () -> Unit,
    onDownload: () -> Unit,
    onInstall: () -> Unit,
    onRetry: () -> Unit
) {
    val accent = LocalAccentPalette.current
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF2C2C2C),
        title = { Text(stringResource(R.string.settings_check_update), color = Color.White) },
        text = {
            when (state) {
                is UpdateState.Checking -> Text(stringResource(R.string.common_loading), color = Color(0xFFCCCCCC))
                is UpdateState.UpToDate -> Text(stringResource(R.string.update_up_to_date), color = Color(0xFFCCCCCC))
                is UpdateState.Available -> Column {
                    Text(stringResource(R.string.update_available, state.version), color = Color.White)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = stringResource(R.string.update_current, currentVersion),
                        color = Color(0xFF999999),
                        fontSize = 13.sp
                    )
                }
                is UpdateState.Downloading -> Column {
                    Text(
                        text = stringResource(R.string.update_downloading, (state.progress * 100).toInt()),
                        color = Color(0xFFCCCCCC)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = { state.progress },
                        color = accent.vibrant,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                is UpdateState.Downloaded -> Text(stringResource(R.string.update_downloaded), color = Color(0xFFCCCCCC))
                is UpdateState.Error -> Text(stringResource(R.string.update_failed), color = Color(0xFFCCCCCC))
                is UpdateState.Idle -> Text("")
            }
        },
        confirmButton = {
            when (state) {
                is UpdateState.Available -> TextButton(onClick = onDownload) {
                    Text(stringResource(R.string.update_download), color = accent.vibrant)
                }
                is UpdateState.Downloaded -> TextButton(onClick = onInstall) {
                    Text(stringResource(R.string.update_install), color = accent.vibrant)
                }
                is UpdateState.Error -> TextButton(onClick = onRetry) {
                    Text(stringResource(R.string.update_retry), color = accent.vibrant)
                }
                is UpdateState.Checking, is UpdateState.UpToDate, is UpdateState.Idle -> TextButton(onClick = onDismiss) {
                    Text(stringResource(R.string.common_ok), color = accent.vibrant)
                }
                is UpdateState.Downloading -> {}
            }
        },
        dismissButton = {
            if (state is UpdateState.Available || state is UpdateState.Downloaded || state is UpdateState.Error) {
                TextButton(onClick = onDismiss) {
                    Text(stringResource(R.string.update_later), color = Color(0xFF999999))
                }
            }
        }
    )
}
