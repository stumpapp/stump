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
import org.readium.r2.navigator.preferences.ColumnCount
import org.readium.r2.navigator.preferences.FontFamily
import org.readium.r2.navigator.preferences.ImageFilter
import org.readium.r2.navigator.preferences.TextAlign
import org.readium.r2.navigator.preferences.ReadingProgression
import org.readium.r2.navigator.epub.EpubNavigatorFragment
import org.readium.r2.navigator.epub.EpubPreferences
import org.readium.r2.shared.ExperimentalReadiumApi
import org.readium.r2.shared.InternalReadiumApi
import org.readium.r2.shared.extensions.toMap
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.services.positions
import org.readium.r2.shared.util.AbsoluteUrl
import org.readium.r2.navigator.input.InputListener
import org.readium.r2.navigator.input.TapEvent
import org.readium.r2.shared.publication.Link
import java.net.URL

data class Props(
    var bookId: String? = null,
    var locator: Locator? = null,
    var initialLocator: Locator? = null,
    var url: String? = null,
    @ColorInt var foreground: Int? = null,
    @ColorInt var background: Int? = null,
    var fontFamily: FontFamily? = null,
    var lineHeight: Double? = null,
    var fontSize: Double? = null,
    var fontWeight: Double? = null,
    var readingProgression: ReadingProgression? = null,
    var publisherStyles: Boolean? = null,
    var imageFilter: ImageFilter? = null,
    var pageMargins: Double? = null,
    var columnCount: ColumnCount? = null,
    var textAlign: TextAlign? = null,
    var typeScale: Double? = null,
    var paragraphIndent: Double? = null,
    var paragraphSpacing: Double? = null,
    var wordSpacing: Double? = null,
    var letterSpacing: Double? = null,
    var hyphens: Boolean? = null,
    var ligatures: Boolean? = null,
    var textNormalization: Boolean? = null,
    var verticalText: Boolean? = null
)

data class FinalizedProps(
    val bookId: String,
    val locator: Locator?,
    val url: String,
    @ColorInt var foreground: Int,
    @ColorInt var background: Int,
    val fontFamily: FontFamily,
    val lineHeight: Double,
    val fontSize: Double,
    val fontWeight: Double?,
    val readingProgression: ReadingProgression,
    val publisherStyles: Boolean,
    val imageFilter: ImageFilter?,
    val pageMargins: Double?,
    val columnCount: ColumnCount?,
    val textAlign: TextAlign?,
    val typeScale: Double?,
    val paragraphIndent: Double?,
    val paragraphSpacing: Double?,
    val wordSpacing: Double?,
    val letterSpacing: Double?,
    val hyphens: Boolean?,
    val ligatures: Boolean?,
    val textNormalization: Boolean?,
    val verticalText: Boolean?
)

@SuppressLint("ViewConstructor", "ResourceType")
class EPUBView(context: Context, appContext: AppContext) : ExpoView(context, appContext),
    EpubNavigatorFragment.Listener, DecorableNavigator.Listener {

    // Required for proper layout! Forces Expo to
    // use the Android layout system for this view,
    // rather than React Native's. Without this,
    // the ViewPager and WebViews will be laid out
    // incorrectly
    override val shouldUseAndroidLayout = true

    var bookService: BookService? = null

    val onLocatorChange by EventDispatcher()
    val onPageChange by EventDispatcher()
    val onBookLoaded by EventDispatcher()
    val onLayoutChange by EventDispatcher()
    val onMiddleTouch by EventDispatcher()
    val onSelection by EventDispatcher()
    val onDoubleTouch by EventDispatcher()
    val onError by EventDispatcher()

    var navigator: EpubNavigatorFragment? = null
    private var publication: Publication? = null
    private var changingResource = false

    val pendingProps = Props()
    var props: FinalizedProps? = null

    private val placeholderView = TextView(context).apply {
        layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = android.view.Gravity.CENTER
        }
//        TODO: Spinner
        text = "Loading EPUB..."
        textAlignment = View.TEXT_ALIGNMENT_CENTER
        setTextColor(Color.BLACK)
    }

    private var coroutineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var locatorCollectionJob: Job? = null

    fun finalizeProps() {
        val oldProps = props

        val bookId = pendingProps.bookId ?: return
        val url = pendingProps.url ?: return

        Log.d("EPUBView", "finalizeProps called with bookId: $bookId, url: $url")

        props = FinalizedProps(
            bookId = bookId,
            locator = pendingProps.locator ?: pendingProps.initialLocator ?: oldProps?.locator,
            url = url,
            foreground = pendingProps.foreground
                ?: oldProps?.foreground ?: Color.parseColor("#111111"),
            background = pendingProps.background
                ?: oldProps?.background ?: Color.parseColor("#FFFFFF"),
            fontFamily = pendingProps.fontFamily
                ?: oldProps?.fontFamily ?: FontFamily("Literata"),
            lineHeight = pendingProps.lineHeight ?: oldProps?.lineHeight ?: 1.4,
            fontSize = pendingProps.fontSize ?: oldProps?.fontSize ?: 1.0,
            fontWeight = pendingProps.fontWeight ?: oldProps?.fontWeight,
            readingProgression = pendingProps.readingProgression ?: oldProps?.readingProgression ?: ReadingProgression.LTR,
            publisherStyles = pendingProps.publisherStyles ?: oldProps?.publisherStyles ?: true,
            imageFilter = pendingProps.imageFilter ?: oldProps?.imageFilter,
            pageMargins = pendingProps.pageMargins ?: oldProps?.pageMargins,
            columnCount = pendingProps.columnCount ?: oldProps?.columnCount,
            textAlign = pendingProps.textAlign ?: oldProps?.textAlign,
            typeScale = pendingProps.typeScale ?: oldProps?.typeScale,
            paragraphIndent = pendingProps.paragraphIndent ?: oldProps?.paragraphIndent,
            paragraphSpacing = pendingProps.paragraphSpacing ?: oldProps?.paragraphSpacing,
            wordSpacing = pendingProps.wordSpacing ?: oldProps?.wordSpacing,
            letterSpacing = pendingProps.letterSpacing ?: oldProps?.letterSpacing,
            hyphens = pendingProps.hyphens ?: oldProps?.hyphens,
            ligatures = pendingProps.ligatures ?: oldProps?.ligatures,
            textNormalization = pendingProps.textNormalization ?: oldProps?.textNormalization,
            verticalText = pendingProps.verticalText ?: oldProps?.verticalText
        )

        if (props!!.bookId != oldProps?.bookId || props!!.url != oldProps?.url) {
            Log.d("EPUBView", "Book ID or URL changed, reloading publication")
            destroyNavigator()
            coroutineScope.launch {
                loadPublication()
            }
            return
        }

        if (props!!.locator != oldProps?.locator && props!!.locator != null) {
            go(props!!.locator!!)
        }

        val nav = navigator ?: run {
            Log.w("EPUBView", "Cannot update preferences: navigator is null")
            return
        }
        
        nav.submitPreferences(
            EpubPreferences(
                backgroundColor = org.readium.r2.navigator.preferences.Color(props!!.background),
                columnCount = props!!.columnCount,
                fontFamily = props!!.fontFamily,
                fontSize = props!!.fontSize,
                fontWeight = props!!.fontWeight,
                hyphens = props!!.hyphens,
                imageFilter = props!!.imageFilter,
                letterSpacing = props!!.letterSpacing,
                ligatures = props!!.ligatures,
                lineHeight = props!!.lineHeight,
                pageMargins = props!!.pageMargins,
                paragraphIndent = props!!.paragraphIndent,
                paragraphSpacing = props!!.paragraphSpacing,
                publisherStyles = props!!.publisherStyles,
                readingProgression = props!!.readingProgression,
                textAlign = props!!.textAlign,
                textColor = org.readium.r2.navigator.preferences.Color(props!!.foreground),
                textNormalization = props!!.textNormalization,
                typeScale = props!!.typeScale,
                verticalText = props!!.verticalText,
                wordSpacing = props!!.wordSpacing,
            )
        )
    }

    fun initializeNavigator() {
        val publication = bookService?.getPublication(props!!.bookId) ?: return

        Log.d("EPUBView", "Publication loaded successfully: ${publication.metadata.title}")

        val fragmentTag = resources.getString(R.string.epub_fragment_tag)
        val activity: FragmentActivity? = appContext.currentActivity as FragmentActivity?

        val listener = this
        val epubFragment = EPUBFragment(
            publication,
            listener
        )

        activity?.supportFragmentManager?.commitNow {
            setReorderingAllowed(true)
            add(epubFragment, fragmentTag)
        }

        addView(epubFragment.view)

        navigator = epubFragment.navigator

        navigator?.addInputListener(TapInputListener())

        locatorCollectionJob = coroutineScope.launch {
            try {
                navigator?.currentLocator?.collect { locator ->
                    locator?.let { 
                        // Only emit if view is still attached to prevent crashes
                        if (isAttachedToWindow) {
                            onLocatorChanged(it)
                        }
                    }
                }
            } catch (e: CancellationException) {
                Log.d("EPUBView", "Locator collection canceled")
            } catch (e: Exception) {
                Log.e("EPUBView", "Error collecting locator", e)
            }
        }
        
        // Emit initial locator
        coroutineScope.launch {
            try {
                if (isAttachedToWindow) {
                    emitCurrentLocator()
                }
            } catch (e: Exception) {
                Log.e("EPUBView", "Error emitting initial locator", e)
            }
        }
    }

    fun destroyNavigator() {
        Log.d("EPUBView", "destroyNavigator called")
        
        val navigator = this.navigator ?: run {
            Log.d("EPUBView", "Navigator already destroyed")
            return
        }
        
        this.navigator = null
        
        locatorCollectionJob?.cancel()
        locatorCollectionJob = null
        
        try {
            removeView(navigator.view)
        } catch (e: Exception) {
            Log.e("EPUBView", "Error removing navigator view", e)
        }
        
        val activity: FragmentActivity? = appContext.currentActivity as? FragmentActivity
        if (activity == null || activity.isDestroyed || activity.isFinishing) {
            Log.w("EPUBView", "Cannot remove fragment: activity is gone")
        } else {
            try {
                activity.supportFragmentManager.commitNow {
                    setReorderingAllowed(true)
                    remove(navigator)
                }
            } catch (e: IllegalStateException) {
                Log.e("EPUBView", "Failed to remove fragment: ${e.message}")
            }
        }
        
        coroutineScope.cancel()
        coroutineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    }

    @OptIn(InternalReadiumApi::class)
    private suspend fun emitCurrentLocator() {
        if (!isAttachedToWindow) {
            Log.d("EPUBView", "Skipping emitCurrentLocator: view detached")
            return
        }
        
        val nav = navigator ?: run {
            Log.d("EPUBView", "Skipping emitCurrentLocator: navigator is null")
            return
        }
        
        val currentLocator = nav.currentLocator?.value ?: return
        
        if (!isAttachedToWindow) return
        
        val found = nav.firstVisibleElementLocator()
        if (found == null) {
            if (isAttachedToWindow) {
                onLocatorChange(currentLocator.toJSON().toMap())
            }
            return
        }
        
        val merged = currentLocator.copy(
            locations = currentLocator.locations.copy(
                fragments = found.locations.fragments,
                otherLocations = found.locations.otherLocations,
            ),
        )
        
        if (isAttachedToWindow) {
            onLocatorChange(merged.toJSON().toMap())
        }
    }

    private suspend fun loadPublication() {
        val currentProps = props ?: return

        try {
            Log.d(
                "EPUBView",
                "Starting publication load for bookId: ${currentProps.bookId}, url: ${currentProps.url}"
            )
            val publication = bookService?.openPublication(currentProps.bookId!!, URL(currentProps.url!!)) ?: throw Exception("Failed to open publication")
            this.publication = publication
            Log.d("EPUBView", "Publication loaded successfully: ${publication?.metadata?.title}")

            initializeNavigator()

            val tableOfContents = convertLinksToToc(publication.tableOfContents)

            withContext(Dispatchers.Main) {
                onBookLoaded(mapOf(
                    "success" to true,
                    "bookMetadata" to mapOf(
                        "title" to publication.metadata.title,
                        "author" to publication.metadata.authors.joinToString(", ") { it.name },
                        "publisher" to publication.metadata.publishers.joinToString(", ") { it.name },
                        "identifier" to (publication.metadata.identifier ?: ""),
                        "language" to (publication.metadata.languages.firstOrNull() ?: "en"),
                        "totalPages" to publication.positions().size,
                        "chapterCount" to publication.readingOrder.size
                    ),
                    "tableOfContents" to tableOfContents
                ))
            }
        } catch (e: Exception) {
            Log.e("EPUBView", "Error loading publication", e)
            withContext(Dispatchers.Main) {
                placeholderView.text = "Error loading EPUB: ${e.message}"
                onError(
                    mapOf(
                        "errorDescription" to (e.message ?: "Unknown error"),
                        "failureReason" to "Failed to load publication",
                        "recoverySuggestion" to "Check the URL and try again"
                    )
                )
            }
        }
    }

    fun go(locator: Locator, animated: Boolean = true) {
        val nav = navigator ?: run {
            Log.w("EPUBView", "Cannot navigate: navigator is null")
            return
        }
        
        val currentHref = nav.currentLocator?.value?.href?.toString()
        val newHref = locator.href.toString()
        if (newHref != currentHref) {
            changingResource = true
        }
        nav.go(locator, animated)
    }

//    TODO: Implement
    override fun onDecorationActivated(event: DecorableNavigator.OnActivatedEvent): Boolean {
        val rect = event.rect ?: return false
//        val x = ceil(rect.centerX() / this.resources.displayMetrics.density).toInt()
//        val y = ceil(rect.top / this.resources.displayMetrics.density).toInt() - 16
//        this.onHighlightTap(mapOf("decoration" to event.decoration.id, "x" to x, "y" to y))
//        return true
        return false
    }

    override fun onDetachedFromWindow() {
        Log.d("EPUBView", "onDetachedFromWindow called")
        
        locatorCollectionJob?.cancel()
        locatorCollectionJob = null
        
        destroyNavigator()
        
        super.onDetachedFromWindow()
    }

//    @JavascriptInterface
//    fun handleDoubleTap(fragment: String) {
//        val bookService = this.bookService ?: return
//        val currentLocator = navigator?.currentLocator?.value ?: return
//        val activity: FragmentActivity? = appContext.currentActivity as FragmentActivity?
//        activity?.lifecycleScope?.launch {
//            val locator = bookService.buildFragmentLocator(props!!.bookId, currentLocator.href, fragment)
//
//            onDoubleTouch(locator.toJSON().toMap())
//        }
//    }
    
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

    private suspend fun onLocatorChanged(locator: Locator) {
        // Check if view is still attached before processing
        if (!isAttachedToWindow) {
            Log.d("EPUBView", "Skipping onLocatorChanged: view detached")
            return
        }
        
        val currentHref = locator.href.toString()
        val propsHref = props?.locator?.href?.toString()
        if (currentHref != propsHref || changingResource) {
            changingResource = false
            emitCurrentLocator()
        } else {
            emitCurrentLocator()
        }
    }

    @ExperimentalReadiumApi
    override fun onExternalLinkActivated(url: AbsoluteUrl) {
//        TODO: Figure this out
//        if (!url. isHttp) return
//        val context = requireActivity()
//        val uri = url.toUri()
//        try {
//            CustomTabsIntent.Builder()
//                .build()
//                .launchUrl(context, uri)
//        } catch (e: ActivityNotFoundException) {
//            context.startActivity(Intent(Intent. ACTION_VIEW, uri))
//        }
    }

    private fun convertLinksToToc(links: List<Link>): List<Map<String, Any>> {
        return links.mapIndexed { index, link ->
            val item = mutableMapOf<String, Any>(
                "label" to (link.title ?: ""),
                "content" to link.href.toString(),
                "play_order" to index
            )
            if (link.children.isNotEmpty()) {
                item["children"] = convertLinksToToc(link.children)
            } else {
                item["children"] = emptyList<Map<String, Any>>()
            }
            item
        }
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