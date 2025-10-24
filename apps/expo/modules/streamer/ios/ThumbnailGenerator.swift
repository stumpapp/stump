import Foundation
import ZIPFoundation
import UIKit
import os.log

/// Generates thumbnails from comic book archives
class ThumbnailGenerator {
    static let shared = ThumbnailGenerator()
    
    private let logger = Logger(subsystem: "com.stump.streamer", category: "thumbnail")
    
    private let defaultThumbnailSize: CGFloat = 300
    
    private init() {}
    
    /// Generate a thumbnail from the first valid page of an archive
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
        
        let archive = try ZipArchive(path: archivePath)
        let imageFiles = archive.getImageFiles()
        
        guard !imageFiles.isEmpty else {
            throw ThumbnailError.noValidImages
        }
        
        let firstImageEntry = imageFiles[0]
        logger.debug("Using first image: \(firstImageEntry.path)")
        
        let imageData = try archive.extractEntry(firstImageEntry)
        
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
        }
    }
}