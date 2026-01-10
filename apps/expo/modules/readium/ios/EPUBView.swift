 import ExpoModulesCore
 import ReadiumNavigator
 import ReadiumShared
 import ReadiumAdapterGCDWebServer
 import ReadiumInternal
 import WebKit

 public struct Props {
     var bookId: String?
     var locator: Locator?
     var initialLocator: Locator?
     var url: String?
     var foreground: Color?
     var background: Color?
     var fontFamily: FontFamily?
     var lineHeight: Double?
     var fontSize: Double?
     var textAlign: TextAlignment?
     var publisherStyles: Bool?
     var imageFilter: ImageFilter?
 }

 public struct FinalizedProps {
     var bookId: String
     var locator: Locator?
     var url: String
     var foreground: Color
     var background: Color
     var fontFamily: FontFamily
     var lineHeight: Double
     var fontSize: Double
     var textAlign: TextAlignment
     var publisherStyles: Bool = true
     var imageFilter: ImageFilter?
 }

 public class EPUBView: ExpoView {
     let onLocatorChange = EventDispatcher()
     let onPageChange = EventDispatcher()
     let onBookLoaded = EventDispatcher()
     let onLayoutChange = EventDispatcher()
     let onMiddleTouch = EventDispatcher()
     let onDoubleTouch = EventDispatcher()
     let onSelection = EventDispatcher()
     let onError = EventDispatcher()

     public var navigator: EPUBNavigatorViewController?

     public var pendingProps: Props = .init()
     public var props: FinalizedProps?

     private var changingResource = false
     private var isInitialized = false
     
     // Misc tasks for cleanup
     private var loadPublicationTask: Task<Void, Never>?
     private var positionsTask: Task<Void, Never>?
     private var layoutChangeTask: Task<Void, Never>?
     private var navigationTasks: [Task<Void, Never>] = []
     
     // Background handling
     private var backgroundObserver: NSObjectProtocol?
     private var foregroundObserver: NSObjectProtocol?
     private var isInBackground = false
     
     public required init(appContext: AppContext? = nil) {
         super.init(appContext: appContext)
         setupBackgroundObservers()
     }
     
     deinit {
         print("EPUBView: deinit called - cleaning up resources")
         cancelAllTasks()
         removeBackgroundObservers()
         cleanupNavigator()
     }
     
     private func setupBackgroundObservers() {
         backgroundObserver = NotificationCenter.default.addObserver(
             forName: UIApplication.didEnterBackgroundNotification,
             object: nil,
             queue: .main
         ) { [weak self] _ in
             self?.handleAppDidEnterBackground()
         }
         
         foregroundObserver = NotificationCenter.default.addObserver(
             forName: UIApplication.willEnterForegroundNotification,
             object: nil,
             queue: .main
         ) { [weak self] _ in
             self?.handleAppWillEnterForeground()
         }
     }
     
     private func removeBackgroundObservers() {
         if let observer = backgroundObserver {
             NotificationCenter.default.removeObserver(observer)
             backgroundObserver = nil
         }
         if let observer = foregroundObserver {
             NotificationCenter.default.removeObserver(observer)
             foregroundObserver = nil
         }
     }
     
     private func handleAppDidEnterBackground() {
         print("EPUBView: App entered background - suspending operations")
         isInBackground = true

         positionsTask?.cancel()
         layoutChangeTask?.cancel()
     }
     
     private func handleAppWillEnterForeground() {
         print("EPUBView: App entering foreground - resuming operations")
         isInBackground = false
     }
     
     private func cancelAllTasks() {
         print("EPUBView: Cancelling all tasks")
         loadPublicationTask?.cancel()
         positionsTask?.cancel()
         layoutChangeTask?.cancel()
         navigationTasks.forEach { $0.cancel() }
         navigationTasks.removeAll()
     }
     
     private func cleanupNavigator() {
         print("EPUBView: Cleaning up navigator")
         navigator?.view.removeFromSuperview()
         navigator = nil
     }

     public func finalizeProps() {
         let oldProps = props

         // Don't proceed if we don't have required props
         guard let bookId = pendingProps.bookId,
               let url = pendingProps.url
         else {
             return
         }

         props = FinalizedProps(
             bookId: bookId,
             locator: pendingProps.locator ?? pendingProps.initialLocator ?? oldProps?.locator,
             url: url,
             foreground: pendingProps.foreground ?? oldProps?.foreground ?? Color(hex: "#111111")!,
             background: pendingProps.background ?? oldProps?.background ?? Color(hex: "#FFFFFF")!,
             fontFamily: pendingProps.fontFamily ?? oldProps?.fontFamily ?? FontFamily(rawValue: "systemFont"),
             lineHeight: pendingProps.lineHeight ?? oldProps?.lineHeight ?? 1.4,
             fontSize: pendingProps.fontSize ?? oldProps?.fontSize ?? 1.0,
             textAlign: pendingProps.textAlign ?? oldProps?.textAlign ?? TextAlignment.justify,
             imageFilter: pendingProps.imageFilter ?? oldProps?.imageFilter
         )

         // If this is a new book or first initialization, load the publication
         if props!.bookId != oldProps?.bookId || props!.url != oldProps?.url || !isInitialized {
             loadPublicationTask?.cancel()
             loadPublicationTask = Task { [weak self] in
                 await self?.loadPublication()
             }
             return
         }

         // Update navigator if locator changed
         if props!.locator != oldProps?.locator, let locator = props!.locator {
             go(locator: locator)
         }

         // Update preferences (only if navigator is initialized)
         if isInitialized {
             updatePreferences()
         }
     }

     private func loadPublication() async {
         guard let props = props else { return }

         do {
             // First check if we need to download and extract the EPUB
             if let url = URL(string: props.url) {
                 var publicationUrl = url

                 // If it's a remote URL, download it first
                 if url.scheme == "http" || url.scheme == "https" {
                     publicationUrl = try await downloadEPUB(from: url)
                 }

                 // Open the publication
                 let publication = try await BookService.instance.openPublication(for: props.bookId, at: publicationUrl)

                 // Check if task was cancelled before proceeding
                 try Task.checkCancellation()
                 
                 await MainActor.run { [weak self] in
                     self?.initializeNavigator(with: publication)
                 }
             }
         } catch {
             if error is CancellationError {
                 print("Publication load cancelled")
                 return
             }
             
             print("Error loading publication: \(error)")
             await MainActor.run { [weak self] in
                 self?.onError([
                     "errorDescription": error.localizedDescription,
                     "failureReason": "Failed to load publication",
                     "recoverySuggestion": "Check the URL and try again",
                 ])
             }
         }
     }

     // TODO: Prolly don't need this since I decided to download on JS side
     private func downloadEPUB(from url: URL) async throws -> URL {
         let (data, _) = try await URLSession.shared.data(from: url)

         let tempDirectory = FileManager.default.temporaryDirectory
         let epubFile = tempDirectory.appendingPathComponent(UUID().uuidString + ".epub")

         try data.write(to: epubFile)
         return epubFile
     }

     public func initializeNavigator(with publication: Publication) {
         guard let props = props else { return }

         guard let resources = FileURL(url: Bundle.main.resourceURL!) else { return }

         let fontFamilyDeclarations: [AnyHTMLFontFamilyDeclaration] = [
             CSSFontFamilyDeclaration(
                 fontFamily: FontFamily(rawValue: "OpenDyslexic"),
                 fontFaces: [
                     CSSFontFace(
                         file: resources.appendingPath("OpenDyslexic-Regular.otf", isDirectory: false),
                         style: .normal, weight: .standard(.normal)
                     ),
                     CSSFontFace(
                         file: resources.appendingPath("OpenDyslexic-Bold.otf", isDirectory: false),
                         style: .normal, weight: .standard(.bold)
                     ),
                     CSSFontFace(
                         file: resources.appendingPath("OpenDyslexic-Italic.otf", isDirectory: false),
                         style: .italic, weight: .standard(.normal)
                     ),
                     CSSFontFace(
                         file: resources.appendingPath("OpenDyslexic-Bold-Italic.otf", isDirectory: false),
                         style: .italic, weight: .standard(.bold)
                     ),
                 ]
             ).eraseToAnyHTMLFontFamilyDeclaration(),
             // Literata
             CSSFontFamilyDeclaration(
                 fontFamily: FontFamily(rawValue: "Literata"),
                 fontFaces: [
                     CSSFontFace(
                         file: resources.appendingPath("Literata-VariableFont_opsz,wght.ttf", isDirectory: false),
                         style: .normal, weight: .variable(200...900)
                     ),
                     CSSFontFace(
                         file: resources.appendingPath("Literata-Italic-VariableFont_opsz,wght.ttf", isDirectory: false),
                         style: .italic, weight: .variable(200...900)
                     ),
                 ]
             ).eraseToAnyHTMLFontFamilyDeclaration(),
             // Atkinson-Hyperlegible
             CSSFontFamilyDeclaration(
                 fontFamily: FontFamily(rawValue: "Atkinson-Hyperlegible"),
                 fontFaces: [
                     CSSFontFace(
                         file: resources.appendingPath("Atkinson-Hyperlegible-Regular.ttf", isDirectory: false),
                         style: .normal, weight: .standard(.normal)
                     ),
                     CSSFontFace(
                         file: resources.appendingPath("Atkinson-Hyperlegible-Bold.ttf", isDirectory: false),
                         style: .normal, weight: .standard(.bold)
                     ),
                     CSSFontFace(
                         file: resources.appendingPath("Atkinson-Hyperlegible-Italic.ttf", isDirectory: false),
                         style: .italic, weight: .standard(.normal)
                     ),
                     CSSFontFace(
                         file: resources.appendingPath("Atkinson-Hyperlegible-BoldItalic.ttf", isDirectory: false),
                         style: .italic, weight: .standard(.bold)
                     ),
                 ]
             ).eraseToAnyHTMLFontFamilyDeclaration(),
             // CharisSIL
             CSSFontFamilyDeclaration(
                 fontFamily: FontFamily(rawValue: "CharisSIL"),
                 fontFaces: [
                     CSSFontFace(
                         file: resources.appendingPath("CharisSIL-Regular.ttf", isDirectory: false),
                         style: .normal, weight: .standard(.normal)
                     ),
                     CSSFontFace(
                         file: resources.appendingPath("CharisSIL-Bold.ttf", isDirectory: false),
                         style: .normal, weight: .standard(.bold)
                     ),
                     CSSFontFace(
                         file: resources.appendingPath("CharisSIL-Italic.ttf", isDirectory: false),
                         style: .italic, weight: .standard(.normal)
                     ),
                     CSSFontFace(
                         file: resources.appendingPath("CharisSIL-BoldItalic.ttf", isDirectory: false),
                         style: .italic, weight: .standard(.bold)
                     ),
                 ]
             ).eraseToAnyHTMLFontFamilyDeclaration(),
             // Bitter
             CSSFontFamilyDeclaration(
                 fontFamily: FontFamily(rawValue: "Bitter"),
                 fontFaces: [
                     CSSFontFace(
                         file: resources.appendingPath("Bitter-VariableFont_wght.ttf", isDirectory: false),
                         style: .normal, weight: .variable(100...900)
                     ),
                     CSSFontFace(
                         file: resources.appendingPath("Bitter-Italic-VariableFont_wght.ttf", isDirectory: false),
                         style: .italic, weight: .variable(100...900)
                     ),
                 ]
             ).eraseToAnyHTMLFontFamilyDeclaration(),
         ]

         do {
             let navigator = try EPUBNavigatorViewController(
                 publication: publication,
                 initialLocation: props.locator,
                 config: .init(
                     preferences: EPUBPreferences(
                         backgroundColor: props.background,
                         fontFamily: props.fontFamily,
                         fontSize: props.fontSize,
                         imageFilter: props.imageFilter,
                         lineHeight: props.lineHeight,
                         publisherStyles: props.publisherStyles,
                         scroll: false,
                         textAlign: props.textAlign,
                         textColor: props.foreground
                     ),
                     defaults: EPUBDefaults(
                         publisherStyles: true,
                         scroll: false
                     ),
                     contentInset: [
                         .compact: (top: 0, bottom: 0),
                         .regular: (top: 0, bottom: 0),
                         .unspecified: (top: 0, bottom: 0),
                     ],
                     fontFamilyDeclarations: fontFamilyDeclarations
                 ),
                 httpServer: GCDHTTPServer(
                     assetRetriever: AssetRetriever(httpClient: DefaultHTTPClient())
                 )
             )

             navigator.delegate = self
             addSubview(navigator.view)
             self.navigator = navigator
             isInitialized = true

             // Cancel any existing positions task and start new one
             positionsTask?.cancel()
             positionsTask = Task { [weak self] in
                 guard let self = self else { return }
                 
                 let positionsResult = await publication.positions()
                 let totalPages = (try? positionsResult.get().count) ?? 0
                 
                 // Check if we're cancelled before updating UI
                 try? Task.checkCancellation()
                 
                 await MainActor.run { [weak self] in
                     self?.onBookLoaded([
                         "success": true,
                         "bookMetadata": [
                             "title": publication.metadata.title ?? "",
                             "author": publication.metadata.authors.map { $0.name }.joined(separator: ", "),
                             "publisher": publication.metadata.publishers.map { $0.name }.joined(separator: ", "),
                             "identifier": publication.metadata.identifier ?? "",
                             "language": publication.metadata.languages.first ?? "en",
                             "totalPages": totalPages,
                             "chapterCount": publication.readingOrder.count,
                         ],
                     ])
                 }
             }

             emitCurrentLocator()

         } catch {
             print("Failed to create Navigator instance: \(error)")
             onError([
                 "errorDescription": error.localizedDescription,
                 "failureReason": "Failed to create navigator",
                 "recoverySuggestion": "Try reloading the publication",
             ])
         }
     }

     public func destroyNavigator() {
         print("EPUBView: destroyNavigator called")
         
         cancelAllTasks()
         
         navigator?.view.removeFromSuperview()
         navigator = nil
         isInitialized = false
         
         // Remove publication from cache
         if let bookId = props?.bookId {
             BookService.instance.closePublication(for: bookId)
         }
     }

     func emitCurrentLocator() {
         guard let navigator = navigator,
               let currentLocator = navigator.currentLocation
         else {
             return
         }

         onLocatorChange(makeJSON([
             "chapterTitle": currentLocator.title ?? "",
             "href": currentLocator.href.string,
             "title": encodeIfNotNil(currentLocator.title),
             "locations": encodeIfNotEmpty(currentLocator.locations.json),
             "text": encodeIfNotEmpty(currentLocator.text.json),
             "type": encodeIfNotEmpty(currentLocator.mediaType.string),
         ]))
     }

     func emitLayoutChange() {
         guard let navigator = navigator else {
             return
         }

         // Don't start new calculations if we're in background
         guard !isInBackground else {
             print("EPUBView: Skipping layout change emission (in background)")
             return
         }

         // Get the publication to access updated metadata
         let publication = navigator.publication

         // Cancel any existing layout change task
         layoutChangeTask?.cancel()
         layoutChangeTask = Task { [weak self] in
             guard let self = self else { return }
             
             let positionsResult = await publication.positions()
             let totalPages = (try? positionsResult.get().count) ?? 0
             
             // Check if we're cancelled before updating UI
             try? Task.checkCancellation()
             
             await MainActor.run { [weak self] in
                 self?.onLayoutChange([
                     "bookMetadata": [
                         "title": publication.metadata.title ?? "",
                         "author": publication.metadata.authors.map { $0.name }.joined(separator: ", "),
                         "publisher": publication.metadata.publishers.map { $0.name }.joined(separator: ", "),
                         "identifier": publication.metadata.identifier ?? "",
                         "language": publication.metadata.languages.first ?? "en",
                         "totalPages": totalPages,
                         "chapterCount": publication.readingOrder.count,
                     ],
                 ])
             }
         }
     }

     func go(locator: Locator) {
         if locator.href != navigator?.currentLocation?.href {
             changingResource = true
         }
         let task = Task { [weak self] in
             guard let self = self else { return }
             _ = await self.navigator?.go(to: locator, options: NavigatorGoOptions(animated: true))
         }
         navigationTasks.append(task)
         navigationTasks.removeAll { $0.isCancelled }
     }

     func goToLocation(locator: Locator) {
         go(locator: locator)
     }

     func goForward() {
         let task = Task { [weak self] in
             guard let self = self else { return }
             _ = await self.navigator?.goForward(options: NavigatorGoOptions(animated: true))
         }
         navigationTasks.append(task)
         navigationTasks.removeAll { $0.isCancelled }
     }

     func goBackward() {
         let task = Task { [weak self] in
             guard let self = self else { return }
             _ = await self.navigator?.goBackward(options: NavigatorGoOptions(animated: true))
         }
         navigationTasks.append(task)
         navigationTasks.removeAll { $0.isCancelled }
     }

     func updatePreferences() {
         guard let props = props else { return }

         let preferences = EPUBPreferences(
             backgroundColor: props.background,
             fontFamily: props.fontFamily,
             fontSize: props.fontSize,
             imageFilter: props.imageFilter,
             lineHeight: props.lineHeight,
             publisherStyles: props.publisherStyles,
             scroll: false,
             textAlign: props.textAlign,
             textColor: props.foreground
         )
         
         navigator?.submitPreferences(preferences)

         // Emit layout change event after preferences are updated
         DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
             guard let self = self else { return }
             self.emitLayoutChange()
         }
     }

     override public func layoutSubviews() {
         super.layoutSubviews()
         guard let navigatorView = navigator?.view else {
             return
         }
         navigatorView.frame = bounds
     }
 }

 extension EPUBView: EPUBNavigatorDelegate {
     public func navigator(_: Navigator, locationDidChange _: Locator) {
         changingResource = false
         emitCurrentLocator()
     }

     public func navigator(_: Navigator, presentError error: NavigatorError) {
         onError([
             "errorDescription": error.localizedDescription,
             "failureReason": "Navigation failed",
             "recoverySuggestion": "Try again",
         ])
     }

     public func navigator(_ navigator: VisualNavigator, didTapAt point: CGPoint) {
         let navigator = navigator as! EPUBNavigatorViewController

         if point.x < bounds.maxX * 0.2 {
             let task = Task { [weak self] in
                 guard self != nil else { return }
                 _ = await navigator.goBackward(options: NavigatorGoOptions(animated: true))
             }
             navigationTasks.append(task)
             navigationTasks.removeAll { $0.isCancelled }
             return
         }
         if point.x > bounds.maxX * 0.8 {
             let task = Task { [weak self] in
                 guard self != nil else { return }
                 _ = await navigator.goForward(options: NavigatorGoOptions(animated: true))
             }
             navigationTasks.append(task)
             navigationTasks.removeAll { $0.isCancelled }
             return
         }

         onMiddleTouch()
     }
 }
