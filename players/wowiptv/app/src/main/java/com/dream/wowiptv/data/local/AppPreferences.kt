package com.dream.wowiptv.data.local

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.appDataStore: DataStore<Preferences> by preferencesDataStore(name = "app_preferences")

class AppPreferences(private val context: Context) {

    companion object {
        private val DEFAULT_PLAYBACK_SPEED = floatPreferencesKey("default_playback_speed")
        private val SHOW_PLAYER_STATUS = booleanPreferencesKey("show_player_status")
        private val AUTOPLAY_NEXT_EPISODE = booleanPreferencesKey("autoplay_next_episode")
        private val SHOW_CONTINUE_WATCHING = booleanPreferencesKey("show_continue_watching")
        private val SHOW_FAVORITES = booleanPreferencesKey("show_favorites")
        private val SHOW_RECENT = booleanPreferencesKey("show_recent")
        private val SPLASH_PRELOAD = booleanPreferencesKey("splash_preload")
        private val SHOW_CAST_AVATARS = booleanPreferencesKey("show_cast_avatars")
        private val TMDB_API_KEY = stringPreferencesKey("tmdb_api_key")
        private val THEME_COLOR = stringPreferencesKey("theme_color")
        private val AUTO_CHECK_UPDATE = booleanPreferencesKey("auto_check_update")
        private val CONTENT_GRID_COLUMNS = intPreferencesKey("content_grid_columns")
        private val POSTER_CONTENT_SCALE = stringPreferencesKey("poster_content_scale")
        private val CATEGORY_LOCK_PASSWORD = stringPreferencesKey("category_lock_password")
        private val CATEGORY_LOCKS = stringSetPreferencesKey("category_locks")

        private const val KEY_ALIAS = "tmdb_api_key_alias"
    }

    val defaultPlaybackSpeed: Flow<Float> = context.appDataStore.data.map { it[DEFAULT_PLAYBACK_SPEED] ?: 1f }

    val showPlayerStatus: Flow<Boolean> = context.appDataStore.data.map { it[SHOW_PLAYER_STATUS] ?: true }

    val autoplayNextEpisode: Flow<Boolean> = context.appDataStore.data.map { it[AUTOPLAY_NEXT_EPISODE] ?: true }

    val showContinueWatching: Flow<Boolean> = context.appDataStore.data.map { it[SHOW_CONTINUE_WATCHING] ?: true }

    val showFavorites: Flow<Boolean> = context.appDataStore.data.map { it[SHOW_FAVORITES] ?: true }

    val showRecent: Flow<Boolean> = context.appDataStore.data.map { it[SHOW_RECENT] ?: true }

    val splashPreload: Flow<Boolean> = context.appDataStore.data.map { it[SPLASH_PRELOAD] ?: true }

    val showCastAvatars: Flow<Boolean> = context.appDataStore.data.map { it[SHOW_CAST_AVATARS] ?: true }

    val tmdbApiKey: Flow<String> = context.appDataStore.data.map { prefs ->
        prefs[TMDB_API_KEY]?.let { decrypt(it) } ?: ""
    }

    val themeColor: Flow<String> = context.appDataStore.data.map { it[THEME_COLOR] ?: "purple" }

    val autoCheckUpdate: Flow<Boolean> = context.appDataStore.data.map { it[AUTO_CHECK_UPDATE] ?: true }

    val contentGridColumns: Flow<Int> = context.appDataStore.data.map {
        (it[CONTENT_GRID_COLUMNS] ?: 2)
    }

    val posterContentScale: Flow<String> = context.appDataStore.data.map {
        it[POSTER_CONTENT_SCALE] ?: "cover"
    }

    val categoryLockPassword: Flow<String> = context.appDataStore.data.map { prefs ->
        prefs[CATEGORY_LOCK_PASSWORD]?.let { decrypt(it) } ?: ""
    }

    val categoryLocks: Flow<Set<String>> = context.appDataStore.data.map {
        it[CATEGORY_LOCKS] ?: emptySet()
    }



    suspend fun setShowCastAvatars(show: Boolean) {
        context.appDataStore.edit { it[SHOW_CAST_AVATARS] = show }
    }

    suspend fun setTmdbApiKey(key: String) {
        val trimmed = key.trim()
        context.appDataStore.edit { p ->
            if (trimmed.isEmpty()) {
                p.remove(TMDB_API_KEY)
            } else {
                p[TMDB_API_KEY] = encrypt(trimmed)
            }
        }
    }

    suspend fun setThemeColor(key: String) {
        context.appDataStore.edit { it[THEME_COLOR] = key }
    }

    suspend fun setAutoCheckUpdate(enabled: Boolean) {
        context.appDataStore.edit { it[AUTO_CHECK_UPDATE] = enabled }
    }

    suspend fun setContentGridColumns(columns: Int) {
        context.appDataStore.edit { it[CONTENT_GRID_COLUMNS] = columns }
    }

    suspend fun setPosterContentScale(scale: String) {
        context.appDataStore.edit { it[POSTER_CONTENT_SCALE] = scale }
    }

    suspend fun setCategoryLockPassword(password: String) {
        val trimmed = password.trim()
        context.appDataStore.edit { p ->
            if (trimmed.isEmpty()) {
                p.remove(CATEGORY_LOCK_PASSWORD)
            } else {
                p[CATEGORY_LOCK_PASSWORD] = encrypt(trimmed)
            }
        }
    }

    suspend fun setCategoryLocks(locks: Set<String>) {
        context.appDataStore.edit { it[CATEGORY_LOCKS] = locks }
    }

    private fun getSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return generator.generateKey()
    }

    private fun encrypt(plain: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, getSecretKey())
        val iv = cipher.iv
        val ciphertext = cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(iv + ciphertext, Base64.NO_WRAP)
    }

    private fun decrypt(encoded: String): String? {
        return try {
            val raw = Base64.decode(encoded, Base64.NO_WRAP)
            val iv = raw.copyOfRange(0, 12)
            val ciphertext = raw.copyOfRange(12, raw.size)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, getSecretKey(), GCMParameterSpec(128, iv))
            String(cipher.doFinal(ciphertext), Charsets.UTF_8)
        } catch (_: Exception) {
            null
        }
    }

    suspend fun setDefaultPlaybackSpeed(speed: Float) {
        context.appDataStore.edit { it[DEFAULT_PLAYBACK_SPEED] = speed }
    }

    suspend fun setShowPlayerStatus(show: Boolean) {
        context.appDataStore.edit { it[SHOW_PLAYER_STATUS] = show }
    }

    suspend fun setAutoplayNextEpisode(enabled: Boolean) {
        context.appDataStore.edit { it[AUTOPLAY_NEXT_EPISODE] = enabled }
    }

    suspend fun setShowContinueWatching(show: Boolean) {
        context.appDataStore.edit { it[SHOW_CONTINUE_WATCHING] = show }
    }

    suspend fun setShowFavorites(show: Boolean) {
        context.appDataStore.edit { it[SHOW_FAVORITES] = show }
    }

    suspend fun setShowRecent(show: Boolean) {
        context.appDataStore.edit { it[SHOW_RECENT] = show }
    }

    suspend fun setSplashPreload(enabled: Boolean) {
        context.appDataStore.edit { it[SPLASH_PRELOAD] = enabled }
    }
}
