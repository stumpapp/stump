package expo.modules.volumelistener

import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.Window
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VolumeListenerModule : Module() {

    /**
     * Whether the JS side has called startListening(), volatile since it's accessed from both the main thread and the JS thread
     */
    @Volatile
    private var isListening = false

    /**
     * The original Window.Callback we replaced, restored on stopListening()
     **/
    private var originalCallback: Window.Callback? = null

    private val mainHandler = Handler(Looper.getMainLooper())

    override fun definition() = ModuleDefinition {
        Name("VolumeListener")

        Events("onVolumeUp", "onVolumeDown")

        Function("startListening") {
            isListening = true
            mainHandler.post { setupKeyInterceptor() }
        }

        Function("stopListening") {
            isListening = false
            mainHandler.post { removeKeyInterceptor() }
        }

        OnDestroy {
            isListening = false
            mainHandler.post { removeKeyInterceptor() }
        }
    }

    private fun setupKeyInterceptor() {
        val window = appContext.currentActivity?.window ?: return

        if (originalCallback != null) return

        originalCallback = window.callback
        window.callback = VolumeKeyCallback(originalCallback) { isUp ->
            sendEvent(if (isUp) "onVolumeUp" else "onVolumeDown")
        }
    }

    private fun removeKeyInterceptor() {
        val activity = appContext.currentActivity
        if (activity != null) {
            originalCallback?.let { activity.window?.callback = it }
        }
        originalCallback = null
    }

    /**
     * A class which will wrap the [Window.Callback] to intercept volume key events. returning
     * `true` from [dispatchKeyEvent] consumes the event, which prevents android from actually changing
     * the system volume.
     *
     * https://developer.android.com/reference/android/view/Window.Callback#dispatchKeyEvent(android.view.KeyEvent)
     */
    private inner class VolumeKeyCallback(
        private val delegate: Window.Callback?,
        private val onVolumeKey: (isUp: Boolean) -> Unit,
    ) : Window.Callback by delegate!! {

        override fun dispatchKeyEvent(event: KeyEvent): Boolean {
            if (isListening && event.action == KeyEvent.ACTION_DOWN) {
                when (event.keyCode) {
                    KeyEvent.KEYCODE_VOLUME_UP -> {
                        onVolumeKey(true)
                        return true
                    }

                    KeyEvent.KEYCODE_VOLUME_DOWN -> {
                        onVolumeKey(false)
                        return true
                    }
                }
            }
            return delegate?.dispatchKeyEvent(event) ?: false
        }
    }
}
