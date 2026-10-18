package com.dream.wowiptv.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.dream.wowiptv.domain.model.UserInfo
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.sourceDataStore: DataStore<Preferences> by preferencesDataStore(name = "source_preferences")

class SourcePreferences(private val context: Context) {

    companion object {
        private val ACTIVE_SOURCE_ID = longPreferencesKey("active_source_id")
        private val USERNAME = stringPreferencesKey("user_info_username")
        private val EXP_DATE = stringPreferencesKey("user_info_exp_date")
        private val MAX_CONNECTIONS = stringPreferencesKey("user_info_max_connections")
        private val ALLOWED_OUTPUT_FORMATS = stringPreferencesKey("user_info_allowed_output_formats")
    }

    val activeSourceId: Flow<Long?> = context.sourceDataStore.data.map { preferences ->
        preferences[ACTIVE_SOURCE_ID]
    }

    val username: Flow<String?> = context.sourceDataStore.data.map { it[USERNAME] }

    val expDate: Flow<String?> = context.sourceDataStore.data.map { it[EXP_DATE] }

    val userInfo: Flow<UserInfo?> = context.sourceDataStore.data.map { p ->
        val name = p[USERNAME]
        if (name.isNullOrEmpty()) {
            null
        } else {
            UserInfo(
                username = name,
                expDate = p[EXP_DATE],
                maxConnections = p[MAX_CONNECTIONS],
                allowedOutputFormats = p[ALLOWED_OUTPUT_FORMATS]?.split(",")?.filter { it.isNotEmpty() }
            )
        }
    }

    suspend fun saveUserInfo(info: UserInfo) {
        context.sourceDataStore.edit { p ->
            p[USERNAME] = info.username ?: ""
            p[EXP_DATE] = info.expDate ?: ""
            p[MAX_CONNECTIONS] = info.maxConnections ?: ""
            p[ALLOWED_OUTPUT_FORMATS] = info.allowedOutputFormats?.joinToString(",") ?: ""
        }
    }

    suspend fun clearUserInfo() {
        context.sourceDataStore.edit { p ->
            p.remove(USERNAME)
            p.remove(EXP_DATE)
            p.remove(MAX_CONNECTIONS)
            p.remove(ALLOWED_OUTPUT_FORMATS)
        }
    }

    suspend fun setActiveSourceId(id: Long?) {
        context.sourceDataStore.edit { preferences ->
            if (id != null) {
                preferences[ACTIVE_SOURCE_ID] = id
            } else {
                preferences.remove(ACTIVE_SOURCE_ID)
            }
        }
    }
}
