package expo.modules.readium

import android.graphics.Color
import android.os.Build
import androidx.annotation.RequiresApi
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.URL
import java.util.Base64
import org.json.JSONObject
import org.readium.r2.shared.extensions.toMap
import org.readium.r2.shared.publication.Link
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.ExperimentalReadiumApi
import android.util.Log
import org.readium.r2.navigator.preferences.FontFamily
import org.readium.r2.navigator.preferences.ImageFilter
import org.readium.r2.shared.InternalReadiumApi
import org.readium.r2.shared.util.getOrElse

class ReadiumModule : Module() {
    // Each module class must implement the definition function. The definition consists of
    // components
    // that describes the module's functionality and behavior.
    // See https://docs.expo.dev/modules/module-api for more details about available components.
  @RequiresApi(Build.VERSION_CODES.O)
  @OptIn(ExperimentalReadiumApi::class, InternalReadiumApi::class)
  override fun definition() = ModuleDefinition {
    val bookService = BookService(appContext.reactContext!!)

    Name("Readium")

    AsyncFunction("extractArchive") Coroutine { archiveUrl: URL, extractedUrl: URL ->
      bookService.extractArchive(archiveUrl, extractedUrl)
    }

    AsyncFunction("openPublication") Coroutine { bookId: String, publicationUri: URL ->
       return@Coroutine bookService.openPublication(bookId, publicationUri)
                            .manifest
    }

    AsyncFunction("getResource") Coroutine { bookId: String, linkMap: Map<String, Any> ->
      val linkJson = JSONObject(linkMap)
      val link = Link.fromJSON(linkJson) ?: return@Coroutine null
      val resource = bookService.getResource(bookId, link) ?: return@Coroutine null
      val mediaType = link.mediaType?.toString() ?: ""
      if (mediaType.startsWith("image/")) {
          val data = resource.read().getOrNull() ?: return@Coroutine null
          return@Coroutine String(Base64.getEncoder().encode(data))
      }
      return@Coroutine resource.read().getOrElse { null }?.let { String(it) }
    }

    AsyncFunction("getPositions") Coroutine { bookId: String ->
      val positions = bookService.getPositions(bookId)
      return@Coroutine positions.map { it.toJSON().toMap() }
    }

    AsyncFunction("locateLink") { bookId: String, linkMap: Map<String, Any> ->
      val linkJson = JSONObject(linkMap)
      val link = Link.fromJSON(linkJson) ?: throw Exception("Failed to parse link from json")
      val locator = bookService.locateLink(bookId, link)
      return@AsyncFunction locator?.toJSON()?.toMap()
    }

    AsyncFunction("goForward") { view: EPUBView ->
      val navigator = view.navigator ?: return@AsyncFunction
      navigator.goForward(animated = false)
    }

    AsyncFunction("goBackward") { view: EPUBView ->
      val navigator = view.navigator ?: return@AsyncFunction
      navigator.goBackward(animated = false)
    }

    AsyncFunction("goToLocation") { view: EPUBView, locatorMap: Map<String, Any> ->
      val navigator = view.navigator ?: return@AsyncFunction
      val jsonLocator = JSONObject(locatorMap)
      val locator = Locator.fromJSON(jsonLocator) ?: throw Exception("Failed to parse locator from JSON")
      navigator.go(locator, animated = false)
    }

    View(EPUBView::class) {
      Events("onLocatorChange", "onPageChange", "onBookLoaded", "onLayoutChange", "onMiddleTouch", "onSelection", "onDoubleTouch", "onError")

      Prop("bookId") { view: EPUBView, prop: String ->
        if (view.bookService == null) {
          view.bookService = bookService
        }
        view.pendingProps.bookId = prop
      }

      AsyncFunction("goForward") { view: EPUBView ->
        val navigator = view.navigator ?: return@AsyncFunction
        navigator.goForward(animated = false)
      }

      AsyncFunction("goBackward") { view: EPUBView ->
        val navigator = view.navigator ?: return@AsyncFunction
        navigator.goBackward(animated = false)
      }

      AsyncFunction("goToLocation") { view: EPUBView, locatorMap: Map<String, Any> ->
          Log.d("ReadiumModule", "goToLocation called with locatorMap: $locatorMap")
          val navigator = view.navigator ?: return@AsyncFunction
          Log.d("ReadiumModule", "Navigator found: $navigator")
          val jsonLocator = JSONObject(locatorMap)
          Log.d("ReadiumModule", "JSON Locator: $jsonLocator")
          val locator = Locator.fromJSON(jsonLocator) ?: throw Exception("Failed to parse locator from JSON")
          Log.d("ReadiumModule", "Parsed Locator: $locator")
          view.go(locator, animated = false)
      }

      AsyncFunction("destroy") { view: EPUBView ->
        Log.d("ReadiumModule", "destroy called - cleaning up EPUBView resources")
        view.destroyNavigator()
      }

      Prop("locator") { view: EPUBView, prop: Map<String, Any?>? ->
        if (prop == null) {
          Log.d("ReadiumModule", "Received null locator prop")
          view.pendingProps.locator = null
          return@Prop
        }
        Log.d("ReadiumModule", "Received locator prop: $prop")
        val locator = Locator.fromJSON(JSONObject(prop)) ?: return@Prop
        view.pendingProps.locator = locator
      }

      Prop("url") { view: EPUBView, prop: String ->
        view.pendingProps.url = prop
      }

      Prop("colors") { view: EPUBView, prop: Map<String, String> ->
        val foregroundHex = prop["foreground"] ?: "#000000"
        val backgroundHex = prop["background"] ?: "#FFFFFF"
        view.pendingProps.foreground = Color.parseColor(foregroundHex)
        view.pendingProps.background = Color.parseColor(backgroundHex)
      }

      Prop("fontSize") { view: EPUBView, prop: Double ->
        view.pendingProps.fontSize = prop / 16.0 // Normalize to scale
      }

      Prop("lineHeight") { view: EPUBView, prop: Double ->
        view.pendingProps.lineHeight = prop
      }

      Prop("fontFamily") { view: EPUBView, prop: String ->
        view.pendingProps.fontFamily = FontFamily(prop)
      }

      Prop("readingDirection") { view: EPUBView, prop: String ->
        view.pendingProps.readingDirection = prop
      }

      Prop("publisherStyles") { view: EPUBView, prop: Boolean ->
        view.pendingProps.publisherStyles = prop
      }

      Prop("imageFilter") { view: EPUBView, prop: String? ->
        view.pendingProps.imageFilter = when (prop) {
          "darken" -> ImageFilter.DARKEN
          "invert" -> ImageFilter.INVERT
          else -> null
        }
      }

      OnViewDidUpdateProps { view: EPUBView ->
        view.finalizeProps()
      }
    }

    View(PDFView::class) {
      Events("onLocatorChange", "onPageChange", "onBookLoaded", "onMiddleTouch", "onError")

      Prop("bookId") { view: PDFView, prop: String ->
        if (view.bookService == null) {
          view.bookService = bookService
        }
        view.pendingProps.bookId = prop
      }

      Prop("locator") { view: PDFView, prop: Map<String, Any?>? ->
        if (prop == null) {
          view.pendingProps.locator = null
          return@Prop
        }
        val locator = Locator.fromJSON(JSONObject(prop)) ?: return@Prop
        view.pendingProps.locator = locator
      }

      Prop("initialLocator") { view: PDFView, prop: Map<String, Any?>? ->
        if (prop == null) {
          view.pendingProps.initialLocator = null
          return@Prop
        }
        val locator = Locator.fromJSON(JSONObject(prop)) ?: return@Prop
        view.pendingProps.initialLocator = locator
      }

      Prop("url") { view: PDFView, prop: String ->
        view.pendingProps.url = prop
      }

      Prop("backgroundColor") { view: PDFView, prop: String ->
        view.pendingProps.background = Color.parseColor(prop)
      }

      Prop("pageSpacing") { view: PDFView, prop: Double ->
        view.pendingProps.pageSpacing = prop
      }

      Prop("scrollAxis") { view: PDFView, prop: String ->
        view.pendingProps.scrollAxis = prop
      }

      Prop("scroll") { view: PDFView, prop: Boolean ->
        view.pendingProps.scroll = prop
      }

      Prop("readingProgression") { view: PDFView, prop: String ->
        view.pendingProps.readingProgression = when (prop) {
          "rtl" -> org.readium.r2.shared.publication.ReadingProgression.RTL
          else -> org.readium.r2.shared.publication.ReadingProgression.LTR
        }
      }
      
      Prop("spread") { view: PDFView, prop: String ->
        view.pendingProps.spread = when (prop) {
          "never" -> org.readium.r2.navigator.preferences.Spread.NEVER
          "always" -> org.readium.r2.navigator.preferences.Spread.ALWAYS
          else -> org.readium.r2.navigator.preferences.Spread.AUTO
        }
      }

      AsyncFunction("goToLocation") { view: PDFView, locatorMap: Map<String, Any> ->
        val navigator = view.navigator ?: return@AsyncFunction
        val jsonLocator = JSONObject(locatorMap)
        val locator = Locator.fromJSON(jsonLocator) ?: throw Exception("Failed to parse locator from JSON")
        view.goToLocation(locator)
      }

      AsyncFunction("goToPage") { view: PDFView, page: Int ->
        view.goToPage(page)
      }

      AsyncFunction("goForward") { view: PDFView ->
        view.goForward()
      }

      AsyncFunction("goBackward") { view: PDFView ->
        view.goBackward()
      }

      AsyncFunction("destroy") { view: PDFView ->
        Log.d("ReadiumModule", "PDF destroy called - cleaning up PDFView resources")
        view.destroyNavigator()
      }

      OnViewDidUpdateProps { view: PDFView ->
        view.finalizeProps()
      }
    }
  }
}
