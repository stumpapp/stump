 import Foundation
 import ReadiumShared
 import ReadiumStreamer
 import ReadiumZIPFoundation

 enum BookServiceError: Error {
     case openFailed(Error)
     case publicationNotFound
     case restrictedPublication(Error)
     case extractFailed(URL, String)
     case locatorNotInReadingOrder(String, String)
     case assetRetrievalFailed(Error)
 }

 public final class BookService {
     /// An instance of AssetRetriever for accessing publication assets
     private let assetRetriever: AssetRetriever
     
     /// An instance of PublicationOpener for opening publications
     private let publicationOpener: PublicationOpener

     /// A cache of publications, keyed by their identifier. A publication is added
     /// to the cache when it is opened
     private var publications: [String: Publication] = [:]

     /// A singleton instance of the BookService class
     public static let instance = BookService()

     /// The initializer for the BookService class
     private init() {
         // Initialize the HTTP client (using default implementation)
         let httpClient = DefaultHTTPClient()
         
         // Initialize the asset retriever
         assetRetriever = AssetRetriever(httpClient: httpClient)
         
         // Initialize publication opener with parsers and content protections
         // Use DefaultPDFDocumentFactory for PDF support
         let pdfFactory = DefaultPDFDocumentFactory()
         
         publicationOpener = PublicationOpener(
             parser: DefaultPublicationParser(
                 httpClient: httpClient,
                 assetRetriever: assetRetriever,
                 pdfFactory: pdfFactory
             ),
             contentProtections: [] // Add LCP or other content protections here if needed
         )
     }

     /// Opens a publication from a local EPUB file or directory
     /// - Parameters:
     ///   - bookID: The identifier for the book
     ///   - url: The URL of the local publication (EPUB file or extracted directory)
     public func openPublication(for bookID: String, at url: URL) async throws -> Publication {
         guard let fileURL = FileURL(url: url) else {
             print("Failed to create FileURL from: \(url)")
             throw BookServiceError.openFailed(URLError(.badURL))
         }

         let assetResult = await assetRetriever.retrieve(url: fileURL)
         let asset: Asset
         
         switch assetResult {
         case .success(let retrievedAsset):
             asset = retrievedAsset
         case .failure(let error):
             print("Failed to retrieve asset: \(error)")
             throw BookServiceError.assetRetrievalFailed(error)
         }

         let publicationResult = await publicationOpener.open(
             asset: asset,
             allowUserInteraction: false,
             credentials: nil
         )
         
         let publication: Publication
         switch publicationResult {
         case .success(let pub):
             publication = pub
         case .failure(let error):
             print("Failed to open publication: \(error)")
             throw BookServiceError.openFailed(error)
         }

         try validatePublication(publication: publication)
         publications[bookID] = publication

         return publication
     }

     /// Extracts an archive (EPUB) to a directory
     /// - Parameters:
     ///   - archiveUrl: The URL of the local archive file
     ///   - extractedUrl: The URL where the archive should be extracted
     public func extractArchive(archiveUrl: URL, extractedUrl: URL) async throws {
         let fileManager = FileManager.default

         do {
             try fileManager.createDirectory(at: extractedUrl, withIntermediateDirectories: true, attributes: nil)
             
             try await fileManager.unzipItem(at: archiveUrl, to: extractedUrl)
         } catch {
             print("Extract failed: \(error.localizedDescription)")
             throw BookServiceError.extractFailed(archiveUrl, error.localizedDescription)
         }
     }

     /// Gets a publication by book ID
     /// - Parameter bookID: The identifier for the book
     /// - Returns: The publication if found, nil otherwise
     public func getPublication(for bookID: String) -> Publication? {
         return publications[bookID]
     }
     
     /// Closes and removes a publication from the cache
     /// - Parameter bookID: The identifier for the book to close
     public func closePublication(for bookID: String) {
         if publications.removeValue(forKey: bookID) != nil {
             print("BookService: Closed and removed publication for book: \(bookID)")
         }
     }
     
     /// Clears all publications from the cache
     public func clearCache() {
         let count = publications.count
         publications.removeAll()
         print("BookService: Cleared cache (\(count) publications removed)")
     }

     /// Gets a resource from a publication
     /// - Parameters:
     ///   - bookID: The identifier for the book
     ///   - link: The link to the resource
     /// - Returns: The resource
     public func getResource(for bookID: String, link: Link) throws -> Resource {
         guard let publication = publications[bookID] else {
             throw BookServiceError.publicationNotFound
         }
         guard let resource = publication.get(link) else {
             throw BookServiceError.publicationNotFound
         }
         return resource
     }

     /// Gets positions for a publication
     /// - Parameter bookID: The identifier for the book
     /// - Returns: Array of locators representing positions
     public func getPositions(for bookID: String) async throws -> [Locator] {
         guard let publication = publications[bookID] else {
             throw BookServiceError.publicationNotFound
         }
         let positionsResult = await publication.positions()
         switch positionsResult {
         case .success(let positions):
             return positions
         case .failure(let error):
             throw BookServiceError.openFailed(error)
         }
     }

     /// Locates a link within a publication
     /// - Parameters:
     ///   - bookID: The identifier for the book
     ///   - link: The link to locate
     /// - Returns: A locator for the link, if found
     public func locateLink(for bookID: String, link: Link) async -> Locator? {
         guard let publication = getPublication(for: bookID) else {
             return nil
         }
         return await publication.locate(link)
     }
     
     /// Extracts the cover image from an EPUB
     /// - Parameter url: The URL of the EPUB file
     /// - Returns: The cover image data, or nil if no cover is found
     public func getCoverImage(from url: URL) async -> Data? {
         guard let fileURL = FileURL(url: url) else {
             print("Failed to create FileURL from: \(url)")
             return nil
         }
         
         let assetResult = await assetRetriever.retrieve(url: fileURL)
         guard case .success(let asset) = assetResult else {
             print("Failed to retrieve asset")
             return nil
         }
         
         let publicationResult = await publicationOpener.open(
             asset: asset,
             allowUserInteraction: false,
             credentials: nil
         )
         
         guard case .success(let publication) = publicationResult else {
             print("Failed to open publication")
             return nil
         }
         
         let result = await publication.cover()
         switch result {
         case .success(let image):
             // TODO: Determine ideal compression quality for thumbs
             return image?.jpegData(compressionQuality: 0.9)
         case .failure(let error):
             print("Failed to extract cover: \(error)")
             return nil
         }
     }

     /// Gets the number of pages for a given URL. Returns nil if the file is not
     /// managed via this service (e.g., not an EPUB or PDF) or loading failed
     public func getPageCount(from url: URL) async -> Int? {
        guard let fileURL = FileURL(url: url) else {
            print("Failed to create FileURL from: \(url)")
            return nil
        }
        
        let assetResult = await assetRetriever.retrieve(url: fileURL)
        guard case .success(let asset) = assetResult else {
            print("Failed to retrieve asset")
            return nil
        }
        
        let publicationResult = await publicationOpener.open(
            asset: asset,
            allowUserInteraction: false,
            credentials: nil
        )
        
        guard case .success(let publication) = publicationResult else {
            print("Failed to open publication")
            return nil
        }
        
        guard case .success(let positions) = await publication.positions() else {
            return publication.pageList.count
        }
         
        return positions.count
     }

     /// A helper method to assert that a publication is not restricted.
     /// See https://github.com/readium/swift-toolkit/blob/main/docs/Guides/Readium%20LCP.md#using-the-opened-publication
     private func validatePublication(publication: Publication) throws {
         guard !publication.isRestricted else {
             if let error = publication.protectionError {
                 throw BookServiceError.restrictedPublication(error)
             } else {
                 throw BookServiceError.restrictedPublication(NSError(domain: "BookService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Publication is restricted but no specific error was provided"]))
             }
         }
     }
 }
