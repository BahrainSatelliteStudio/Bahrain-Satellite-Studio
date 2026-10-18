package com.dream.wowiptv.presentation.common.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.dream.wowiptv.R
import com.dream.wowiptv.presentation.common.theme.LocalAccentPalette

@Composable
fun CategoryLockDialog(
    categoryName: String,
    onDismiss: () -> Unit,
    onVerifyPassword: (String) -> Boolean,
    onUnlocked: () -> Unit = onDismiss,
    hintText: String? = null
) {
    var input by remember { mutableStateOf("") }
    var error by remember { mutableStateOf(false) }
    val accent = LocalAccentPalette.current

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .clip(RoundedCornerShape(20.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(
                            accent.primary.copy(alpha = 0.30f),
                            accent.dark.copy(alpha = 0.85f)
                        )
                    )
                )
                .padding(20.dp)
        ) {
            Text(
                text = categoryName,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                maxLines = 1
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = hintText ?: stringResource(R.string.lock_enter_password),
                color = Color.White.copy(alpha = 0.7f),
                fontSize = 12.sp
            )
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = input,
                onValueChange = {
                    input = it
                    error = false
                },
                singleLine = true,
                isError = error,
                visualTransformation = PasswordVisualTransformation(),
                textStyle = androidx.compose.ui.text.TextStyle(color = Color.White),
                placeholder = {
                    Text(
                        text = stringResource(R.string.lock_password_hint),
                        color = Color.White.copy(alpha = 0.4f),
                        fontSize = 13.sp
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    cursorColor = accent.vibrant,
                    focusedBorderColor = accent.vibrant,
                    unfocusedBorderColor = Color.White.copy(alpha = 0.4f),
                    focusedContainerColor = Color.Black.copy(alpha = 0.25f),
                    unfocusedContainerColor = Color.Black.copy(alpha = 0.25f)
                )
            )
            if (error) {
                Text(
                    text = stringResource(R.string.lock_error),
                    color = Color(0xFFFF6B6B),
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onDismiss) {
                    Text(stringResource(R.string.common_cancel), color = Color.White.copy(alpha = 0.8f))
                }
                Spacer(modifier = Modifier.height(0.dp))
                TextButton(onClick = {
                    if (onVerifyPassword(input.trim())) {
                        onUnlocked()
                    } else {
                        error = true
                    }
                }) {
                    Text(stringResource(R.string.lock_unlock), color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}