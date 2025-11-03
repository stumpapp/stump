import ExpoModulesCore
import ReadiumNavigator
import ReadiumShared
import ReadiumAdapterGCDWebServer
import ReadiumInternal
import UIKit

public struct PDFProps {
    var bookId: String?
    var locator: Locator?
    var initialLocator: Locator?
    var url: String?
    var background: Color?
    var pageSpacing: Double?
    var scrollAxis: Axis?
    var scroll: Bool?
    var readingProgression: ReadiumNavigator.ReadingProgression?
    var spread: Spread?
}

public struct FinalizedPDFProps {
    var bookId: String
    var locator: Locator?
    var url: String
    var background: Color
    var pageSpacing: Double
    var scrollAxis: Axis
    var scroll: Bool
    var readingProgression: ReadiumNavigator.ReadingProgression
    var spread: Spread
}

public class PDFView: ExpoView {
    let onLocatorChange = EventDispatcher()
    let onPageChange = EventDispatcher()
    let onBookLoaded = EventDispatcher()
    let onMiddleTouch = EventDispatcher()
    let onError = EventDispatcher()
    
    public var navigator: PDFNavigatorViewController?
    
    public var pendingProps: PDFProps = .init()
    public var props: FinalizedPDFProps?
    
    private var isInitialized = false
    
    // Tasks for cleanup
    private var loadPublicationTask: Task<Void, Never>?
    private var positionsTask: Task<Void, Never>?
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
        print("PDFView: deinit called - cleaning up resources")
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
        print("PDFView: App entered background - suspending operations")
        isInBackground = true
        positionsTask?.cancel()
    }
    
    private func handleAppWillEnterForeground() {
        print("PDFView: App entering foreground - resuming operations")
        isInBackground = false
    }
    
    private func cancelAllTasks() {
        print("PDFView: Cancelling all tasks")
        loadPublicationTask?.cancel()
        positionsTask?.cancel()
        navigationTasks.forEach { $0.cancel() }
        navigationTasks.removeAll()
    }
    
    private func cleanupNavigator() {
        print("PDFView: Cleaning up navigator")
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
        
        props = FinalizedPDFProps(
            bookId: bookId,
            locator: pendingProps.locator ?? pendingProps.initialLocator ?? oldProps?.locator,
            url: url,
            background: pendingProps.background ?? oldProps?.background ?? Color(hex: "#000000")!,
            pageSpacing: pendingProps.pageSpacing ?? oldProps?.pageSpacing ?? 0.0,
            scrollAxis: pendingProps.scrollAxis ?? oldProps?.scrollAxis ?? .vertical,
            scroll: pendingProps.scroll ?? oldProps?.scroll ?? true,
            readingProgression: pendingProps.readingProgression ?? oldProps?.readingProgression ?? .ltr,
            spread: pendingProps.spread ?? oldProps?.spread ?? .auto
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
        
        if isInitialized && preferencesChanged(oldProps: oldProps) {
            updatePreferences()
        }
    }
    
    private func preferencesChanged(oldProps: FinalizedPDFProps?) -> Bool {
        guard let oldProps = oldProps, let props = props else { return false }
        return props.background != oldProps.background ||
               props.pageSpacing != oldProps.pageSpacing ||
               props.scrollAxis != oldProps.scrollAxis ||
               props.scroll != oldProps.scroll ||
               props.readingProgression != oldProps.readingProgression ||
               props.spread != oldProps.spread
    }
    
    private func loadPublication() async {
        guard let props = props else { return }
        
        do {
            if let url = URL(string: props.url) {
                var publicationUrl = url
                
                if url.scheme == "http" || url.scheme == "https" {
                    publicationUrl = try await downloadPDF(from: url)
                }
                
                let publication = try await BookService.instance.openPublication(for: props.bookId, at: publicationUrl)
                
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
                    "failureReason": "Failed to load PDF",
                    "recoverySuggestion": "Check the URL and try again",
                ])
            }
        }
    }
    
    private func downloadPDF(from url: URL) async throws -> URL {
        let (data, _) = try await URLSession.shared.data(from: url)
        
        let tempDirectory = FileManager.default.temporaryDirectory
        let pdfFile = tempDirectory.appendingPathComponent(UUID().uuidString + ".pdf")
        
        try data.write(to: pdfFile)
        return pdfFile
    }
    
    public func initializeNavigator(with publication: Publication) {
        guard let props = props else { return }
        
        do {
            let navigator = try PDFNavigatorViewController(
                publication: publication,
                initialLocation: props.locator,
                config: .init(
                    preferences: PDFPreferences(
                        backgroundColor: props.background,
                        pageSpacing: props.pageSpacing,
                        readingProgression: props.readingProgression,
                        scroll: props.scroll,
                        scrollAxis: props.scrollAxis,
                        spread: props.spread,
                        visibleScrollbar: false
                    )
                ),
                httpServer: GCDHTTPServer(
                    assetRetriever: AssetRetriever(httpClient: DefaultHTTPClient())
                )
            )
            
            navigator.delegate = self
            addSubview(navigator.view)
            self.navigator = navigator
            isInitialized = true
            
            positionsTask?.cancel()
            positionsTask = Task { [weak self] in
                guard let self = self else { return }
                
                let positionsResult = await publication.positions()
                let totalPages = (try? positionsResult.get().count) ?? 0
                
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
                        ],
                    ])
                }
            }
            
            emitCurrentLocator()
            
        } catch {
            print("Failed to create PDF Navigator instance: \(error)")
            onError([
                "errorDescription": error.localizedDescription,
                "failureReason": "Failed to create PDF navigator",
                "recoverySuggestion": "Try reloading the PDF",
            ])
        }
    }
    
    public func destroyNavigator() {
        print("PDFView: destroyNavigator called")
        
        cancelAllTasks()
        
        navigator?.view.removeFromSuperview()
        navigator = nil
        isInitialized = false
        
        if let bookId = props?.bookId {
            BookService.instance.closePublication(for: bookId)
        }
    }
    
    // TODO: Determine if I even need a locator for PDFs + Readium, just using page numbers
    // would be much less hassle
    func emitCurrentLocator() {
        guard let navigator = navigator,
              let currentLocator = navigator.currentLocation
        else {
            return
        }
        
        onLocatorChange(makeJSON([
            "href": currentLocator.href.string,
            "title": encodeIfNotNil(currentLocator.title),
            "locations": encodeIfNotEmpty(currentLocator.locations.json),
            "text": encodeIfNotEmpty(currentLocator.text.json),
            "type": encodeIfNotEmpty(currentLocator.mediaType.string),
        ]))
        
        if let pageNumber = currentLocator.locations.position {
            onPageChange([
                "currentPage": pageNumber,
            ])
        }
    }
    
    func go(locator: Locator) {
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
    
    func goToPage(page: Int) {
        guard let navigator = navigator else { return }
        
        let task = Task { [weak self] in
            guard let self = self else { return }
            
            let positionsResult = await navigator.publication.positions()
            guard let positions = try? positionsResult.get() else { return }
            
            // Ensure page is within bounds
            guard page > 0 && page <= positions.count else {
                print("PDFView: Invalid page number \(page)")
                return
            }
            
            let locator = positions[page - 1]
            _ = await navigator.go(to: locator, options: NavigatorGoOptions(animated: true))
        }
        navigationTasks.append(task)
        navigationTasks.removeAll { $0.isCancelled }
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
        
        let preferences = PDFPreferences(
            backgroundColor: props.background,
            pageSpacing: props.pageSpacing,
            readingProgression: props.readingProgression,
            scroll: props.scroll,
            scrollAxis: props.scrollAxis,
            spread: props.spread
        )
        
        navigator?.submitPreferences(preferences)
    }
    
    override public func layoutSubviews() {
        super.layoutSubviews()
        guard let navigatorView = navigator?.view else {
            return
        }
        navigatorView.frame = bounds
    }
}

extension PDFView: PDFNavigatorDelegate {
    public func navigator(_: Navigator, locationDidChange _: Locator) {
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
        let navigator = navigator as! PDFNavigatorViewController
        
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
