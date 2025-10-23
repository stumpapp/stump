import ExpoModulesCore

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

    AsyncFunction("initializeBook") { (bookId: String, archivePath: String, cacheDir: String) -> Int in
      let port = try self.server.startServer()
      
      let filePath = archivePath.hasPrefix("file://") 
        ? String(archivePath.dropFirst(7))  
        : archivePath
      
      try self.server.registerBook(bookId: bookId, filePath: filePath, cacheDir: cacheDir)
      
      return Int(port)
     
    }
    
    Function("getPageURL") { (bookId: String, page: Int) -> String? in
      return self.server.getPageURL(bookId: bookId, page: page)
    }

    AsyncFunction("getPageCount") { (filePath: String) -> Int in
      let archivePath = filePath.hasPrefix("file://") 
          ? String(filePath.dropFirst(7))
          : filePath
        
      let archive = try ZipArchive(path: archivePath)
      let imageFiles = archive.getImageFiles()
      return imageFiles.count
    }

    AsyncFunction("cleanupBook") { (bookId: String, deleteCache: Bool) in
      self.server.unregisterBook(bookId: bookId, deleteCache: deleteCache)
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
