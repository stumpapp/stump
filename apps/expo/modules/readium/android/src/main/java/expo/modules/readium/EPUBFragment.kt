package expo.modules.readium

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.ActionMode
import android.view.Menu
import android.view.MenuItem
import android.view.View
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.fragment.app.commitNow
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import org.readium.r2.navigator.epub.EpubDefaults
import org.readium.r2.navigator.epub.EpubNavigatorFactory
import org.readium.r2.navigator.epub.EpubNavigatorFragment
import org.readium.r2.navigator.epub.EpubPreferences
import org.readium.r2.navigator.epub.css.FontStyle
import org.readium.r2.navigator.epub.css.FontWeight
import org.readium.r2.navigator.epub.css.Length
import org.readium.r2.navigator.epub.css.RsProperties
import org.readium.r2.navigator.preferences.FontFamily
import org.readium.r2.navigator.util.BaseActionModeCallback
import org.readium.r2.shared.ExperimentalReadiumApi
import org.readium.r2.shared.InternalReadiumApi
import org.readium.r2.shared.extensions.toMap
import org.readium.r2.shared.publication.Publication
import kotlin.math.ceil

class SelectionActionModeCallback(private val epubView: EPUBView) : BaseActionModeCallback() {
    @OptIn(InternalReadiumApi::class)
    override fun onCreateActionMode(mode: ActionMode?, menu: Menu?): Boolean {
        mode?.menuInflater?.inflate(R.menu.menu_action_mode, menu)
        return true
    }
    
    @OptIn(InternalReadiumApi::class)
    override fun onActionItemClicked(mode: ActionMode, item: MenuItem): Boolean {
        val activity = epubView.appContext.currentActivity as? FragmentActivity ?: return false
        
        activity.lifecycleScope.launch {
            val selection = epubView.navigator?.currentSelection() ?: return@launch
            val locator = selection.locator
            val text = locator.text.highlight ?: ""
            
            when (item.itemId) {
                R.id.action_highlight -> {
                    epubView.onHighlightRequest(mapOf(
                        "locator" to locator.toJSON().toMap(),
                        "text" to text
                    ))
                }
                R.id.action_note -> {
                    epubView.onNoteRequest(mapOf(
                        "locator" to locator.toJSON().toMap(),
                        "text" to text
                    ))
                }
                R.id.action_copy -> {
                    val clipboard = epubView.context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    val clip = ClipData.newPlainText("Selected Text", text)
                    clipboard.setPrimaryClip(clip)
                }
            }
            
            epubView.navigator?.clearSelection()
        }
        
        mode?.finish()
        return true
    }
}

@SuppressLint("ViewConstructor")
@OptIn(ExperimentalReadiumApi::class)
class EPUBFragment(
    private val publication: Publication,
    private val listener: EPUBView
) : Fragment(R.layout.fragment_reader) {
    var navigator: EpubNavigatorFragment? = null

    // FIXME(expo): Pretty much every font except OpenDyslexic isn't working right for Android
    override fun onCreate(savedInstanceState: Bundle?) {
        childFragmentManager.fragmentFactory = EpubNavigatorFactory(
            publication,
            EpubNavigatorFactory.Configuration(
                defaults = EpubDefaults(
                    publisherStyles = false
                ),
            ),
        ).createFragmentFactory(
            listener.props!!.locator,
            listener = listener,
            configuration = EpubNavigatorFragment.Configuration {
                // Note: This was an irritating issue. In the Readium source, they define CSS which TDLR;
                // applies a 39.99rem max line length for tablet-sized screens and up. Setting to `nil` does
                // nothing, so I set it to a very large value to effectively disable it.
                readiumCssRsProperties = RsProperties(
                    maxLineLength = Length.Rem(200.0)
                )

                servedAssets = listOf(
                    "fonts/OpenDyslexic-Regular.otf",
                    "fonts/OpenDyslexic-Bold.otf",
                    "fonts/OpenDyslexic-Italic.otf",
                    "fonts/OpenDyslexic-Bold-Italic.otf",
                    "fonts/Literata-VariableFont_opsz,wght.ttf",
                    "fonts/Literata-Italic-VariableFont_opsz,wght.ttf",
                    "fonts/Atkinson-Hyperlegible-Regular.ttf",
                    "fonts/Atkinson-Hyperlegible-Bold.ttf",
                    "fonts/Atkinson-Hyperlegible-Italic.ttf",
                    "fonts/Atkinson-Hyperlegible-BoldItalic.ttf",
                    "fonts/CharisSIL-Regular.ttf",
                    "fonts/CharisSIL-Bold.ttf",
                    "fonts/CharisSIL-Italic.ttf",
                    "fonts/CharisSIL-BoldItalic.ttf",
                    "fonts/Bitter-VariableFont_wght.ttf",
                    "fonts/Bitter-Italic-VariableFont_wght.ttf"
                )

                shouldApplyInsetsPadding = false

                // OpenDyslexic font family
                addFontFamilyDeclaration(FontFamily("OpenDyslexic")) {
                    addFontFace {
                        addSource("fonts/OpenDyslexic-Regular.otf")
                        setFontStyle(FontStyle.NORMAL)
                        setFontWeight(FontWeight.NORMAL)
                    }
                    addFontFace {
                        addSource("fonts/OpenDyslexic-Bold.otf")
                        setFontStyle(FontStyle.NORMAL)
                        setFontWeight(FontWeight.BOLD)
                    }
                    addFontFace {
                        addSource("fonts/OpenDyslexic-Italic.otf")
                        setFontStyle(FontStyle.ITALIC)
                        setFontWeight(FontWeight.NORMAL)
                    }
                    addFontFace {
                        addSource("fonts/OpenDyslexic-Bold-Italic.otf")
                        setFontStyle(FontStyle.ITALIC)
                        setFontWeight(FontWeight.BOLD)
                    }
                }

                // Literata
                addFontFamilyDeclaration(FontFamily("Literata")) {
                    // Regular weights
                    addFontFace {
                        addSource("fonts/Literata-VariableFont_opsz,wght.ttf")
                        setFontStyle(FontStyle.NORMAL)
                        setFontWeight(FontWeight.NORMAL)
                    }
                    addFontFace {
                        addSource("fonts/Literata-VariableFont_opsz,wght.ttf")
                        setFontStyle(FontStyle.NORMAL)
                        setFontWeight(FontWeight.BOLD)
                    }
                    addFontFace {
                        addSource("fonts/Literata-VariableFont_opsz,wght.ttf")
                        setFontStyle(FontStyle.NORMAL)
                        setFontWeight(FontWeight.LIGHT)
                    }
                    // Italic weights
                    addFontFace {
                        addSource("fonts/Literata-Italic-VariableFont_opsz,wght.ttf")
                        setFontStyle(FontStyle.ITALIC)
                        setFontWeight(FontWeight.NORMAL)
                    }
                    addFontFace {
                        addSource("fonts/Literata-Italic-VariableFont_opsz,wght.ttf")
                        setFontStyle(FontStyle.ITALIC)
                        setFontWeight(FontWeight.BOLD)
                    }
                    addFontFace {
                        addSource("fonts/Literata-Italic-VariableFont_opsz,wght.ttf")
                        setFontStyle(FontStyle.ITALIC)
                        setFontWeight(FontWeight.LIGHT)
                    }
                }

                // Atkinson-Hyperlegible-{Bold,Regular,Italic,BoldItalic}.ttf
                addFontFamilyDeclaration(FontFamily("Atkinson-Hyperlegible")) {
                    addFontFace {
                        addSource("fonts/Atkinson-Hyperlegible-Regular.ttf")
                        setFontStyle(FontStyle.NORMAL)
                        setFontWeight(FontWeight.NORMAL)
                    }
                    addFontFace {
                        addSource("fonts/Atkinson-Hyperlegible-Bold.ttf")
                        setFontStyle(FontStyle.NORMAL)
                        setFontWeight(FontWeight.BOLD)
                    }
                    addFontFace {
                        addSource("fonts/Atkinson-Hyperlegible-Italic.ttf")
                        setFontStyle(FontStyle.ITALIC)
                        setFontWeight(FontWeight.NORMAL)
                    }
                    addFontFace {
                        addSource("fonts/Atkinson-Hyperlegible-BoldItalic.ttf")
                        setFontStyle(FontStyle.ITALIC)
                        setFontWeight(FontWeight.BOLD)
                    }
                }

                 // CharisSIL-{Bold,Italic,BoldItalic,Regular}.ttf
                addFontFamilyDeclaration(FontFamily("CharisSIL")) {
                    addFontFace {
                        addSource("fonts/CharisSIL-Regular.ttf")
                        setFontStyle(FontStyle.NORMAL)
                        setFontWeight(FontWeight.NORMAL)
                    }
                    addFontFace {
                        addSource("fonts/CharisSIL-Bold.ttf")
                        setFontStyle(FontStyle.NORMAL)
                        setFontWeight(FontWeight.BOLD)
                    }
                    addFontFace {
                        addSource("fonts/CharisSIL-Italic.ttf")
                        setFontStyle(FontStyle.ITALIC)
                        setFontWeight(FontWeight.NORMAL)
                    }
                    addFontFace {
                        addSource("fonts/CharisSIL-BoldItalic.ttf")
                        setFontStyle(FontStyle.ITALIC)
                        setFontWeight(FontWeight.BOLD)
                    }
                }

                // Bitter-Italic-VariableFont_wght and Bitter-VariableFont_wght
                addFontFamilyDeclaration(FontFamily("Bitter")) {
                    // Regular weights
                    addFontFace {
                        addSource("fonts/Bitter-VariableFont_wght.ttf")
                        setFontStyle(FontStyle.NORMAL)
                        setFontWeight(FontWeight.NORMAL)
                    }
                    addFontFace {
                        addSource("fonts/Bitter-VariableFont_wght.ttf")
                        setFontStyle(FontStyle.NORMAL)
                        setFontWeight(FontWeight.BOLD)
                    }
                    addFontFace {
                        addSource("fonts/Bitter-VariableFont_wght.ttf")
                        setFontStyle(FontStyle.NORMAL)
                        setFontWeight(FontWeight.LIGHT)
                    }
                    // Italic weights
                    addFontFace {
                        addSource("fonts/Bitter-Italic-VariableFont_wght.ttf")
                        setFontStyle(FontStyle.ITALIC)
                        setFontWeight(FontWeight.NORMAL)
                    }
                    addFontFace {
                        addSource("fonts/Bitter-Italic-VariableFont_wght.ttf")
                        setFontStyle(FontStyle.ITALIC)
                        setFontWeight(FontWeight.BOLD)
                    }
                    addFontFace {
                        addSource("fonts/Bitter-Italic-VariableFont_wght.ttf")
                        setFontStyle(FontStyle.ITALIC)
                        setFontWeight(FontWeight.LIGHT)
                    }
                }

                selectionActionModeCallback = SelectionActionModeCallback(listener)
            },
            initialPreferences =  EpubPreferences(
                backgroundColor = org.readium.r2.navigator.preferences.Color(listener.props!!.background),
                fontFamily = listener.props!!.fontFamily,
                fontSize = listener.props!!.fontSize,
                lineHeight = listener.props!!.lineHeight,
//                paragraphSpacing = listener.props!!.paragraphSpacing,
//                textAlign = listener.props!!.textAlign,
                textColor = org.readium.r2.navigator.preferences.Color(listener.props!!.foreground),
            ),
        )

        super.onCreate(savedInstanceState)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val navigatorFragmentTag = getString(R.string.readium_epub_navigator_tag)

        if (savedInstanceState == null) {
            childFragmentManager.commitNow {
                setReorderingAllowed(true)
                add(
                    R.id.fragment_reader_container,
                    EpubNavigatorFragment::class.java,
                    Bundle(),
                    navigatorFragmentTag
                )
            }
        }
        navigator =
            childFragmentManager.findFragmentByTag(navigatorFragmentTag) as EpubNavigatorFragment
    }
}