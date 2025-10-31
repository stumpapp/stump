import Foundation
import ZIPFoundation
import UIKit
import os.log
import Readium

/// Generates thumbnails from comic book archives and ebooks
class ThumbnailGenerator {
    static let shared = ThumbnailGenerator()
    
    private let logger = Logger(subsystem: "com.stump.streamer", category: "thumbnail")
    
    private let defaultThumbnailSize: CGFloat = 300
    
    private init() {}
    
    /// Generate a thumbnail from the first valid page of an archive or ebook cover
    /// - Parameters:
    ///   - bookId: The book ID to use for the thumbnail filename
    ///   - archivePath: Path to the archive file
    ///   - outputDir: Directory where {bookId}.jpg will be saved
    /// - Throws: ThumbnailError if generation fails
    func generateThumbnail(
        bookId: String,
        archivePath: String,
        outputDir: String
    ) throws {
        logger.info("Generating thumbnail for book: \(bookId)")
        
        try createOutputDirectoryIfNeeded(at: outputDir)
        
        let outputPath = (outputDir as NSString).appendingPathComponent("\(bookId).jpg")
        
        let fileExtension = (archivePath as NSString).pathExtension.lowercased()
        let isReadiumRequired = fileExtension == "epub" || fileExtension == "pdf"
        
        let imageData: Data
        
        if isReadiumRequired {
            imageData = try extractReadiumCover(archivePath: archivePath)
        } else {
            imageData = try extractZipCover(archivePath: archivePath)
        }
        
        guard let originalImage = UIImage(data: imageData) else {
            throw ThumbnailError.invalidImageData
        }
        
        let scaledImage = try scaleImage(originalImage, maxSize: defaultThumbnailSize)
        
        guard let thumbnailData = scaledImage.jpegData(compressionQuality: 0.8) else {
            throw ThumbnailError.imageEncodingFailed
        }
        
        let outputURL = URL(fileURLWithPath: outputPath)
        try thumbnailData.write(to: outputURL)
        
        logger.info("Thumbnail generated: \(outputPath)")
    }
    
    /// Extract cover from a standard archive (CBZ, ZIP)
    private func extractZipCover(archivePath: String) throws -> Data {
        let archive = try ZipArchive(path: archivePath)
        let imageFiles = archive.getImageFiles()
        
        guard !imageFiles.isEmpty else {
            throw ThumbnailError.noValidImages
        }
        
        let firstImageEntry = imageFiles[0]
        logger.debug("Using first image from comic: \(firstImageEntry.path)")
        
        return try archive.extractEntry(firstImageEntry)
    }
    
    /// Extract cover from an EPUB/PDF, falling back to ZIP extraction if needed
    private func extractReadiumCover(archivePath: String) throws -> Data {
        let fileURL = URL(fileURLWithPath: archivePath)
        
        // TODO: Determine if better to make thumb gen async
        // Note: I did this to keep things synchronous
        var extractedData: Data?
        let semaphore = DispatchSemaphore(value: 0)
        
        Task {
            extractedData = await BookService.instance.getCoverImage(from: fileURL)
            semaphore.signal()
        }
        
        semaphore.wait()
        
        if let data = extractedData {
            logger.debug("Successfully extracted cover: \(data.count) bytes")
            return data
        }
        
        logger.warning("Failed to extract cover, falling back to ZIP extraction")
        if archivePath.lowercased().hasSuffix(".pdf") {
            throw ThumbnailError.pdfCoverExtractionFailed
        }
        return try extractZipCover(archivePath: archivePath)
    }
    
    private func scaleImage(_ image: UIImage, maxSize: CGFloat) throws -> UIImage {
        let originalSize = image.size
        
        let scaleFactor = min(maxSize / originalSize.width, maxSize / originalSize.height)
        
        // Don't need to scale if already within size
        if scaleFactor >= 1.0 {
            return image
        }
        
        let newSize = CGSize(
            width: originalSize.width * scaleFactor,
            height: originalSize.height * scaleFactor
        )
        
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let scaledImage = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        
        return scaledImage
    }
    
    private func createOutputDirectoryIfNeeded(at path: String) throws {
        let url = URL(fileURLWithPath: path)
        if !FileManager.default.fileExists(atPath: path) {
            do {
                try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
            } catch {
                throw ThumbnailError.outputDirectoryCreationFailed(error)
            }
        }
    }
}

enum ThumbnailError: Error {
    case noValidImages
    case invalidImageData
    case imageEncodingFailed
    case outputDirectoryCreationFailed(Error)
    case epubCoverExtractionFailed(String)
    case pdfCoverExtractionFailed
    
    var localizedDescription: String {
        switch self {
        case .noValidImages:
            return "No valid images found in archive"
        case .invalidImageData:
            return "Could not create image from data"
        case .imageEncodingFailed:
            return "Failed to encode image as JPEG"
        case .outputDirectoryCreationFailed(let error):
            return "Failed to create output directory: \(error.localizedDescription)"
        case .epubCoverExtractionFailed(let reason):
            return "Failed to extract EPUB cover: \(reason)"
        case .pdfCoverExtractionFailed:
            return "Failed to extract PDF cover"
        }
    }
}
