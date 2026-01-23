import ExpoModulesCore
import Foundation
import ReadiumNavigator
import ReadiumShared

public class ReadiumModule: Module {
    public func definition() -> ModuleDefinition {
        Name("Readium")

        AsyncFunction("extractArchive") { (archiveUrl: URL, extractedUrl: URL) in
            try await BookService.instance.extractArchive(archiveUrl: archiveUrl, extractedUrl: extractedUrl)
        }

        AsyncFunction("openPublication") { (bookId: String, publicationUri: URL) -> String in
            let pub = try await BookService.instance.openPublication(for: bookId, at: publicationUri)
            return pub.jsonManifest ?? "{}"
        }

        AsyncFunction("getResource") { (bookId: String, linkJson: [String: Any]) -> String in
            let link = try Link(json: linkJson)
            let resource = try BookService.instance.getResource(for: bookId, link: link)
            if link.mediaType?.type.starts(with: "image/") == true {
                let data = try await resource.read().get()
                return data.base64EncodedString()
            }
            return try await resource.readAsString().get()
        }

        AsyncFunction("getPositions") { (bookId: String) -> [[String: Any]] in
            let positions = try await BookService.instance.getPositions(for: bookId)
            return positions.map { $0.json }
        }

        AsyncFunction("locateLink") { (bookId: String, linkJson: [String: Any]) -> [String: Any]? in
            let link = try Link(json: linkJson)
            let locator = await BookService.instance.locateLink(for: bookId, link: link)
            return locator?.json
        }

        // TODO: This was my original impl but don't think I need
        AsyncFunction("loadEPUB") { (url: String) -> Bool in
            let bookId = "default"
            guard let epubUrl = URL(string: url) else {
                return false
            }

            do {
                _ = try await BookService.instance.openPublication(for: bookId, at: epubUrl)
                return true
            } catch {
                print("Error loading EPUB: \(error)")
                return false
            }
        }

        View(EPUBView.self) {
            Events("onLocatorChange", "onPageChange", "onBookLoaded", "onLayoutChange", "onMiddleTouch", "onSelection", "onAnnotationTap", "onHighlightRequest", "onNoteRequest", "onEditHighlight", "onDeleteHighlight", "onDoubleTouch", "onError", "onReachedEnd")

            AsyncFunction("goToLocation") { (view: EPUBView, locatorJson: [String: Any]) in
                guard let locator = try? Locator(json: locatorJson) else {
                    throw NSError(domain: "ReadiumError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid locator format"])
                }
                view.goToLocation(locator: locator)
            }

            AsyncFunction("goForward") { (view: EPUBView) in
                view.goForward()
            }

            AsyncFunction("goBackward") { (view: EPUBView) in
                view.goBackward()
            }

            AsyncFunction("destroy") { (view: EPUBView) in
                view.destroyNavigator()
            }

            AsyncFunction("getSelection") { (view: EPUBView) -> [String: Any]? in
                return view.getSelection()
            }

            AsyncFunction("clearSelection") { (view: EPUBView) in
                view.clearSelection()
            }

            Prop("bookId") { (view: EPUBView, prop: String) in
                view.pendingProps.bookId = prop
            }

            Prop("locator") { (view: EPUBView, prop: [String: Any]) in
                guard let locator = try? Locator(json: prop) else {
                    return
                }
                view.pendingProps.locator = locator
            }

            Prop("initialLocator") { (view: EPUBView, prop: [String: Any]) in
                guard let locator = try? Locator(json: prop) else {
                    return
                }
                view.pendingProps.initialLocator = locator
            }

            Prop("url") { (view: EPUBView, prop: String) in
                view.pendingProps.url = prop
            }

            Prop("decorations") { (view: EPUBView, prop: [[String: Any]]) in
                let decorations = prop.compactMap { (decorationDict: [String: Any]) -> DecorationItem? in
                    guard let id = decorationDict["id"] as? String,
                          let colorHex = decorationDict["color"] as? String,
                          let locatorDict = decorationDict["locator"] as? [String: Any],
                          let locator = try? Locator(json: locatorDict),
                          let color = Color(hex: colorHex)?.uiColor
                    else {
                        return nil
                    }
                    return DecorationItem(id: id, color: color, locator: locator)
                }
                view.pendingProps.decorations = decorations
            }

            Prop("colors") { (view: EPUBView, prop: [String: String]) in
                if let background = prop["background"] {
                    view.pendingProps.background = Color(hex: background)
                }
                if let foreground = prop["foreground"] {
                    view.pendingProps.foreground = Color(hex: foreground)
                }
            }

            Prop("fontSize") { (view: EPUBView, prop: Double) in
                view.pendingProps.fontSize = prop / 16.0 // Normalize to scale
            }

            Prop("lineHeight") { (view: EPUBView, prop: Double) in
                view.pendingProps.lineHeight = prop
            }

            Prop("fontFamily") { (view: EPUBView, prop: String) in
                view.pendingProps.fontFamily = FontFamily(rawValue: prop)
            }

            Prop("readingDirection") { (view: EPUBView, prop: String) in
                view.pendingProps.readingProgression = prop == "rtl" ? ReadiumNavigator.ReadingProgression.rtl : ReadiumNavigator.ReadingProgression.ltr
            }

            Prop("publisherStyles") { (view: EPUBView, prop: Bool) in
                view.pendingProps.publisherStyles = prop
            }

            Prop("imageFilter") { (view: EPUBView, prop: String?) in
                switch prop {
                case "darken":
                    view.pendingProps.imageFilter = .darken
                case "invert":
                    view.pendingProps.imageFilter = .invert
                default:
                    view.pendingProps.imageFilter = nil
                }
            }

            Prop("pageMargins") { (view: EPUBView, prop: Double?) in
                view.pendingProps.pageMargins = prop
            }

            Prop("columnCount") { (view: EPUBView, prop: String?) in
                switch prop {
                case "1":
                    view.pendingProps.columnCount = .one
                case "2":
                    view.pendingProps.columnCount = .two
                default:
                    view.pendingProps.columnCount = .auto
                }
            }

            Prop("textAlign") { (view: EPUBView, prop: String?) in
                switch prop {
                case "start":
                    view.pendingProps.textAlign = .start
                case "left":
                    view.pendingProps.textAlign = .left
                case "right":
                    view.pendingProps.textAlign = .right
                case "center":
                    view.pendingProps.textAlign = .center
                case "justify":
                    view.pendingProps.textAlign = .justify
                default:
                    view.pendingProps.textAlign = nil
                }
            }

            Prop("typeScale") { (view: EPUBView, prop: Double?) in
                view.pendingProps.typeScale = prop
            }

            Prop("paragraphIndent") { (view: EPUBView, prop: Double?) in
                view.pendingProps.paragraphIndent = prop
            }

            Prop("paragraphSpacing") { (view: EPUBView, prop: Double?) in
                view.pendingProps.paragraphSpacing = prop
            }

            Prop("wordSpacing") { (view: EPUBView, prop: Double?) in
                view.pendingProps.wordSpacing = prop
            }

            Prop("letterSpacing") { (view: EPUBView, prop: Double?) in
                view.pendingProps.letterSpacing = prop
            }

            Prop("hyphens") { (view: EPUBView, prop: Bool?) in
                view.pendingProps.hyphens = prop
            }

            Prop("ligatures") { (view: EPUBView, prop: Bool?) in
                view.pendingProps.ligatures = prop
            }

            Prop("fontWeight") { (view: EPUBView, prop: Double?) in
                view.pendingProps.fontWeight = prop
            }

            Prop("textNormalization") { (view: EPUBView, prop: Bool?) in
                view.pendingProps.textNormalization = prop
            }

            Prop("verticalText") { (view: EPUBView, prop: Bool?) in
                view.pendingProps.verticalText = prop
            }

            OnViewDidUpdateProps { (view: EPUBView) in
                view.finalizeProps()
            }
        }

        View(PDFView.self) {
            Events("onLocatorChange", "onPageChange", "onBookLoaded", "onMiddleTouch", "onError")

            AsyncFunction("goToLocation") { (view: PDFView, locatorJson: [String: Any]) in
                guard let locator = try? Locator(json: locatorJson) else {
                    throw NSError(domain: "ReadiumError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid locator format"])
                }
                view.goToLocation(locator: locator)
            }

            AsyncFunction("goToPage") { (view: PDFView, page: Int) in
                view.goToPage(page: page)
            }

            AsyncFunction("goForward") { (view: PDFView) in
                view.goForward()
            }

            AsyncFunction("goBackward") { (view: PDFView) in
                view.goBackward()
            }

            AsyncFunction("destroy") { (view: PDFView) in
                view.destroyNavigator()
            }

            Prop("bookId") { (view: PDFView, prop: String) in
                view.pendingProps.bookId = prop
            }

            Prop("locator") { (view: PDFView, prop: [String: Any]) in
                guard let locator = try? Locator(json: prop) else {
                    return
                }
                view.pendingProps.locator = locator
            }

            Prop("initialLocator") { (view: PDFView, prop: [String: Any]) in
                guard let locator = try? Locator(json: prop) else {
                    return
                }
                view.pendingProps.initialLocator = locator
            }

            Prop("url") { (view: PDFView, prop: String) in
                view.pendingProps.url = prop
            }

            Prop("backgroundColor") { (view: PDFView, prop: String) in
                view.pendingProps.background = Color(hex: prop)
            }

            Prop("pageSpacing") { (view: PDFView, prop: Double) in
                view.pendingProps.pageSpacing = prop
            }

            Prop("scrollAxis") { (view: PDFView, prop: String) in
                view.pendingProps.scrollAxis = prop == "horizontal" ? .horizontal : .vertical
            }

            Prop("scroll") { (view: PDFView, prop: Bool) in
                view.pendingProps.scroll = prop
            }

            Prop("readingProgression") { (view: PDFView, prop: String) in
                view.pendingProps.readingProgression = prop == "rtl" ? .rtl : .ltr
            }

            Prop("spread") { (view: PDFView, prop: String) in
                switch prop {
                case "never":
                    view.pendingProps.spread = .never
                case "always":
                    view.pendingProps.spread = .always
                default:
                    view.pendingProps.spread = .auto
                }
            }

            OnViewDidUpdateProps { (view: PDFView) in
                view.finalizeProps()
            }
        }
    }
}
