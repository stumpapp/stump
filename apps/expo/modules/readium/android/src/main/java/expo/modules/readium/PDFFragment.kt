package expo.modules.readium

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.View
import androidx.fragment.app.Fragment
import androidx.fragment.app.commitNow
import com.github.barteksc.pdfviewer.PDFView as PdfiumPDFView
import org.readium.adapter.pdfium.navigator.PdfiumEngineProvider
import org.readium.adapter.pdfium.navigator.PdfiumNavigatorFactory
import org.readium.r2.navigator.pdf.PdfNavigatorFragment
import org.readium.r2.shared.ExperimentalReadiumApi
import org.readium.r2.shared.publication.Publication

// https://github.com/readium/kotlin-toolkit/blob/develop/test-app/src/main/java/org/readium/r2/testapp/reader/PdfReaderFragment.kt

@SuppressLint("ViewConstructor")
@OptIn(ExperimentalReadiumApi::class)
class PDFFragment(
    private val publication: Publication,
    private val pdfProps: FinalizedPDFProps,
    private val pdfViewListener: PDFView
) : Fragment(R.layout.fragment_reader) {
    var navigator: PdfNavigatorFragment<*, *>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        val pdfiumEngineProvider = PdfiumEngineProvider(
            listener = object : PdfiumEngineProvider.Listener {
                override fun onConfigurePdfView(configurator: PdfiumPDFView.Configurator) {
                    configurator.apply {
                        spacing(pdfProps.pageSpacing.toInt())
                        swipeHorizontal(pdfProps.scrollAxis == "horizontal")
                        enableSwipe(pdfProps.scroll)
                    }
                }
            }
        )

        val navigatorFactory = PdfiumNavigatorFactory(
            publication = publication,
            pdfEngineProvider = pdfiumEngineProvider
        )

        childFragmentManager.fragmentFactory = navigatorFactory.createFragmentFactory(
            initialLocator = pdfProps.locator,
            listener = pdfViewListener as? PdfNavigatorFragment.Listener
        )

        super.onCreate(savedInstanceState)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val navigatorFragmentTag = getString(R.string.pdf_fragment_tag)

        if (savedInstanceState == null) {
            childFragmentManager.commitNow {
                setReorderingAllowed(true)
                add(
                    R.id.fragment_reader_container,
                    PdfNavigatorFragment::class.java,
                    Bundle(),
                    navigatorFragmentTag
                )
            }
        }
        
        navigator = childFragmentManager.findFragmentByTag(navigatorFragmentTag) as? PdfNavigatorFragment<*, *>
    }
}
