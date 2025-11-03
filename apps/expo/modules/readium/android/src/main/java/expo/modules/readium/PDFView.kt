@file:OptIn(ExperimentalReadiumApi::class)

package expo.modules.readium

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.PointF
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import android.widget.TextView
import androidx.annotation.ColorInt
import androidx.fragment.app.FragmentActivity
import androidx.fragment.app.commitNow
import androidx.lifecycle.lifecycleScope
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import kotlinx.coroutines.*
import org.readium.r2.navigator.DecorableNavigator
import org.readium.r2.navigator.input.InputListener
import org.readium.r2.navigator.input.TapEvent
import org.readium.r2.navigator.pdf.PdfNavigatorFragment
import org.readium.r2.shared.ExperimentalReadiumApi
import org.readium.r2.shared.InternalReadiumApi
import org.readium.r2.shared.extensions.toMap
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.ReadingProgression
import org.readium.r2.shared.publication.services.positions
import java.net.URL

data class PDFProps(
    var bookId: String? = null,
    var locator: Locator? = null,
    var initialLocator: Locator? = null,
    var url: String? = null,
    @ColorInt var background: Int? = null,
    var pageSpacing: Double? = null,
    var scrollAxis: String? = null,
    var scroll: Boolean? = null,
    var readingProgression: ReadingProgression? = null,
    var spread: org.readium.r2.navigator.preferences.Spread? = null
)

data class FinalizedPDFProps(
    val bookId: String,
    val locator: Locator?,
    val url: String,
    @ColorInt val background: Int,
    val pageSpacing: Double,
    val scrollAxis: String,
    val scroll: Boolean,
    val readingProgression: ReadingProgression,
    val spread: org.readium.r2.navigator.preferences.Spread
)

@SuppressLint("ViewConstructor", "ResourceType")
class PDFView(context: Context, appContext: AppContext) : ExpoView(context, appContext),
    DecorableNavigator.Listener, PdfNavigatorFragment.Listener {

    // Required for proper layout! Forces Expo to
    // use the Android layout system for this view,
    // rather than React Native's. Without this,
    // the ViewPager and WebViews will be laid out
    // incorrectly
    override val shouldUseAndroidLayout = true

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        Log.d("PDFView", "onLayout: changed=$changed, dimensions=${right-left}x${bottom-top}")
    }

    var bookService: BookService? = null

    val onLocatorChange by EventDispatcher()
    val onPageChange by EventDispatcher()
    val onBookLoaded by EventDispatcher()
    val onMiddleTouch by EventDispatcher()
    val onError by EventDispatcher()

    var navigator: PdfNavigatorFragment<*, *>? = null
    private var publication: Publication? = null
    private var pdfFragment: PDFFragment? = null

    val pendingProps = PDFProps()
    var props: FinalizedPDFProps? = null

    private val placeholderView = TextView(context).apply {
        layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = android.view.Gravity.CENTER
        }
//        TODO: Spinner
        text = "Loading PDF..."
        textAlignment = View.TEXT_ALIGNMENT_CENTER
        setTextColor(Color.BLACK)
    }

    private var coroutineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var locatorCollectionJob: Job? = null

    fun finalizeProps() {
        val oldProps = props

        val bookId = pendingProps.bookId ?: return
        val url = pendingProps.url ?: return

        props = FinalizedPDFProps(
            bookId = bookId,
            locator = pendingProps.locator ?: pendingProps.initialLocator ?: oldProps?.locator,
            url = url,
            background = pendingProps.background
                ?: oldProps?.background ?: Color.parseColor("#000000"),
            pageSpacing = pendingProps.pageSpacing ?: oldProps?.pageSpacing ?: 0.0,
            scrollAxis = pendingProps.scrollAxis ?: oldProps?.scrollAxis ?: "vertical",
            scroll = pendingProps.scroll ?: oldProps?.scroll ?: true,
            readingProgression = pendingProps.readingProgression 
                ?: oldProps?.readingProgression ?: ReadingProgression.LTR,
            spread = pendingProps.spread 
                ?: oldProps?.spread ?: org.readium.r2.navigator.preferences.Spread.AUTO
        )

        // If book ID or URL changed, reload the publication
        if (props!!.bookId != oldProps?.bookId || props!!.url != oldProps?.url) {
            Log.d("PDFView", "Book ID or URL changed, reloading publication")
            destroyNavigator()
            coroutineScope.launch {
                loadPublication()
            }
            return
        }

        // Check if any preferences changed
        val prefsChanged = oldProps != null && (
            props!!.pageSpacing != oldProps.pageSpacing ||
            props!!.scrollAxis != oldProps.scrollAxis ||
            props!!.scroll != oldProps.scroll ||
            props!!.readingProgression != oldProps.readingProgression ||
            props!!.spread != oldProps.spread
        )

        if (prefsChanged) {
            destroyNavigator()
            coroutineScope.launch {
                loadPublication()
            }
            return
        }

        // If locator changed, navigate to it
        if (props!!.locator != oldProps?.locator && props!!.locator != null) {
            go(props!!.locator!!)
        }
    }

    private suspend fun loadPublication() {
        val props = props ?: return
        
        Log.d("PDFView", "Loading publication from: ${props.url}")
        
        withContext(Dispatchers.Main) {
            addView(placeholderView)
        }

        try {
            val url = URL(props.url)
            bookService?.openPublication(props.bookId, url)
            
            withContext(Dispatchers.Main) {
                initializeNavigator()
                removeView(placeholderView)
            }
        } catch (e: Exception) {
            Log.e("PDFView", "Failed to load publication", e)
            withContext(Dispatchers.Main) {
                removeView(placeholderView)
                onError(
                    mapOf(
                        "errorDescription" to (e.message ?: "Unknown error"),
                        "failureReason" to "Failed to load PDF",
                        "recoverySuggestion" to "Check the URL and try again"
                    )
                )
            }
        }
    }

    fun initializeNavigator() {
        val publication = bookService?.getPublication(props!!.bookId) ?: run {
            Log.e("PDFView", "Publication not found for bookId: ${props!!.bookId}")
            return
        }

        Log.d("PDFView", "Publication loaded successfully: ${publication.metadata.title}")

        val fragmentTag = resources.getString(R.string.pdf_fragment_tag)
        val activity: FragmentActivity? = appContext.currentActivity as FragmentActivity?

        if (activity == null) {
            Log.e("PDFView", "Cannot initialize navigator: activity is null")
            return
        }

        val listener = this
        pdfFragment = PDFFragment(
            publication,
            props!!,
            listener
        )

        Log.d("PDFView", "Adding PDFFragment to activity FragmentManager")
        activity.supportFragmentManager.commitNow {
            setReorderingAllowed(true)
            add(pdfFragment!!, fragmentTag)
        }
        
        addView(pdfFragment!!.view, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
        
        post {
            val fragment = pdfFragment ?: run {
                Log.e("PDFView", "[POST] pdfFragment is null!?")
                return@post
            }
            
            navigator = fragment.navigator
            
            if (navigator == null) {
                Log.e("PDFView", "[POST] Navigator is null!?")
                return@post
            }
            
            setupNavigatorListeners(publication)
            
            // Navigate to initial locator if provided
            props?.locator?.let { locator ->
                go(locator)
            }
        }
    }

    private fun setupNavigatorListeners(publication: Publication) {
        navigator?.addInputListener(TapInputListener())
        
        locatorCollectionJob = coroutineScope.launch {
            try {
                navigator?.currentLocator?.collect { locator ->
                    if (isAttachedToWindow) {
                        emitCurrentLocator(locator)
                    }
                }
            } catch (e: Exception) {
                Log.e("PDFView", "Error collecting locator", e)
            }
        }

        coroutineScope.launch {
            try {
                if (isAttachedToWindow) {
                    emitBookLoaded(publication)
                }
            } catch (e: Exception) {
                Log.e("PDFView", "Error emitting book loaded", e)
            }
        }
    }

    fun destroyNavigator() {
        Log.d("PDFView", "destroyNavigator called")
        
        val fragment = this.pdfFragment ?: run {
            Log.d("PDFView", "Navigator already destroyed")
            return
        }
        
        this.navigator = null
        this.pdfFragment = null
        
        locatorCollectionJob?.cancel()
        locatorCollectionJob = null
        
        // Remove the fragment's view from PDFView
        try {
            removeView(fragment.view)
        } catch (e: Exception) {
            Log.e("PDFView", "Error removing fragment view", e)
        }
        
        val activity: FragmentActivity? = appContext.currentActivity as? FragmentActivity
        if (activity == null || activity.isDestroyed || activity.isFinishing) {
            Log.w("PDFView", "Cannot remove fragment: activity is gone")
        } else {
            try {
                activity.supportFragmentManager.commitNow {
                    setReorderingAllowed(true)
                    remove(fragment)
                }
            } catch (e: IllegalStateException) {
                Log.e("PDFView", "Failed to remove fragment: ${e.message}")
            }
        }
        
        val bookId = props?.bookId
        if (bookId != null) {
            bookService?.closePublication(bookId)
        }
    }

    @OptIn(InternalReadiumApi::class)
    private fun emitCurrentLocator(locator: Locator) {
        onLocatorChange(locator.toJSON().toMap())
        
        val pageIndex = locator.locations.position ?: 1
        onPageChange(
            mapOf(
                "page" to pageIndex,
                "progression" to (locator.locations.progression ?: 0.0)
            )
        )
    }

    private suspend fun emitBookLoaded(publication: Publication) {
        val positions = publication.positions()
        val totalPages = positions.size
        
        onBookLoaded(
            mapOf(
                "success" to true,
                "bookMetadata" to mapOf(
                    "title" to (publication.metadata.title ?: ""),
                    "author" to publication.metadata.authors.joinToString(", ") { it.name.toString() },
                    "publisher" to publication.metadata.publishers.joinToString(", ") { it.name.toString() },
                    "identifier" to (publication.metadata.identifier ?: ""),
                    "language" to (publication.metadata.languages.firstOrNull() ?: "en"),
                    "totalPages" to totalPages
                )
            )
        )
    }

    // Navigation methods
    fun go(locator: Locator) {
        navigator?.go(locator, animated = true)
    }

    fun goToLocation(locator: Locator) {
        go(locator)
    }

    fun goToPage(page: Int) {
        coroutineScope.launch {
            try {
                val publication = bookService?.getPublication(props!!.bookId) ?: return@launch
                val positions = publication.positions()
                
                // Ensure page is within bounds
                if (page <= 0 || page > positions.size) {
                    Log.e("PDFView", "Invalid page number: $page")
                    return@launch
                }
                
                val locator = positions[page - 1]
                navigator?.go(locator, animated = true)
            } catch (e: Exception) {
                Log.e("PDFView", "Error navigating to page", e)
            }
        }
    }

    fun goForward() {
        navigator?.goForward(animated = true)
    }

    fun goBackward() {
        navigator?.goBackward(animated = true)
    }

    // Handle tap events for navigation and middle touch
    fun handleTap(point: PointF): Boolean {
        if (point.x < width * 0.2) {
            navigator?.goBackward(animated = true)
            return true
        }
        if (point.x > width * 0.8) {
            navigator?.goForward(animated = true)
            return true
        }
        onMiddleTouch(mapOf())
        return false
    }

    // TODO: Support decoration events
    override fun onDecorationActivated(event: DecorableNavigator.OnActivatedEvent): Boolean {
        return false
    }

    /**
     * Input listener to handle tap events for navigation
     */
    private inner class TapInputListener : InputListener {
        override fun onTap(event: TapEvent): Boolean {
            return handleTap(event.point)
        }
    }
}
