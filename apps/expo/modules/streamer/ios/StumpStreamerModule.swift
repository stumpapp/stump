import ExpoModulesCore

// MARK: - Type-safe Records

/// Configuration for initializing a book for streaming
struct StreamerConfig: Record {
  @Field var bookId: String
  @Field var filePath: String
  @Field var cacheDir: String
}

/// Result returned from initializing a book
struct InitializeBookResult: Record {
  @Field var port: UInt
  @Field var success: Bool
}

public class StumpStreamerModule: Module {
  private let server = StreamerServer.shared

  private var appWillTerminateObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("StumpStreamer")

    OnCreate {
      self.setupLifecycleObservers()
    }

    OnDestroy {
      self.cleanup()
    }

    AsyncFunction("initializeBook") { (config: StreamerConfig) -> InitializeBookResult in
      let port = try self.server.startServer()

      let bookConfig = BookConfig(
        bookId: config.bookId,
        filePath: config.filePath,
        cacheDir: config.cacheDir
      )
      try self.server.registerBook(config: bookConfig)

      return InitializeBookResult(port: port, success: true)
    }

    AsyncFunction("getPageURL") { (bookId: String, page: Int) -> String? in
      return self.server.getPageURL(bookId: bookId, page: page)
    }

    AsyncFunction("cleanupBook") { (bookId: String, deleteCache: Bool) in
      self.server.unregisterBook(bookId: bookId, deleteCache: deleteCache)
    }

    AsyncFunction("prefetchPages") { (bookId: String, startPage: Int, count: Int) in
      // TODO: Make me aaron
      // I imagine this would extract pages in the background to speed up the feel. I think I can
      // just borrow some of the patterns that someone added for PDF stuff
      print("StumpStreamer: prefetchPages not yet implemented")
    }

    Function("isServerRunning") {
      return self.server.isRunning
    }

    AsyncFunction("stopServer") {
      self.server.stopServer()
    }
  }

  // MARK: - Lifecycle Management

  private func setupLifecycleObservers() {
    // Stop server when app terminates
    appWillTerminateObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.willTerminateNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.server.stopServer()
    }
  }

  private func cleanup() {
    if let observer = appWillTerminateObserver {
      NotificationCenter.default.removeObserver(observer)
      appWillTerminateObserver = nil
    }
    server.stopServer()
  }
}
