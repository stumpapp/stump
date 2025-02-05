import ReadiumShared
import ReadiumStreamer

enum BookServiceError: Error {
    case openFailed(Publication.OpeningError)
    case publicationNotFound
    case restrictedPublication(Error)
}

final class BookService {
    /// An instance of R2Streamer's Streamer class, which is used during the actual
    /// opening of a publication
    private let streamer: Streamer

    /// A cache of publications, keyed by their identifier. A publication is added
    /// to the cache when it is opened
    private var publications: [String : Publication] = [:]
    
    /// A singleton instance of the BookService class
    public static let instance = BookService()
    
    /// A callback that is invoked when a publication is opened, provided to the streamer instance
    private static func onCreatePublication(_ mediaType: MediaType,_ manifest: inout Manifest,_ fetcher: inout Fetcher,_ services: inout PublicationServicesBuilder) -> Void {
        // TODO: write me
    }
    
    /// The initializer for the BookService class
    private init() {
        streamer = Streamer(
            onCreatePublication: Self.onCreatePublication
        )
    }

    /// Opens a publication for the given book ID, at the given URL
    /// - Parameters:
    ///   - bookID: The identifier for the book
    ///   - url: The URL of the publication **on disk**
    func openPublication(for bookID: String, at url: URL) async throws -> Publication {
        let asset = FileAsset(url: url)
        guard let mediaType = asset.mediaType() else {
            throw BookServiceError.openFailed(Publication.OpeningError.unsupportedFormat)
        }

        let publication = try await withCheckedThrowingContinuation { cont in
          streamer.open(asset: asset, allowUserInteraction: false) { result in
            switch result {
              case .success(let pub):
                cont.resume(returning: pub)
              case .failure(let error):
                cont.resume(throwing: BookServiceError.openFailed(error))
              case .cancelled:
                cont.resume(throwing: CancellationError())
            }
          }
        }

        publications[bookID] = publication

        return publication
    }
    
    /// A helper method to assert that a publication is not restricted.
    /// See https://github.com/readium/swift-toolkit/blob/main/docs/Guides/Readium%20LCP.md#using-the-opened-publication
    private func validatePublication(publication: Publication) throws {
        guard !publication.isRestricted else {
            if let error = publication.protectionError {
                throw BookServiceError.restrictedPublication(error)
            } else {
                throw ReadiumError.unknown
            }
        }
    }

}
