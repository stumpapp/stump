import R2Shared
import R2Streamer

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
}