import Foundation
import ZIPFoundation

/// A simple ZIP archive wrapper for extracting images
class ZipArchive {
    private let archive: Archive
    private let path: String

    // TODO: Should I add more?
    private static let imageExtensions = Set(["jpg", "jpeg", "png", "gif", "webp", "bmp"])

    init(path: String) throws {
        self.path = path
        guard let archive = Archive(url: URL(fileURLWithPath: path), accessMode: .read) else {
            throw StreamerError.archiveOpenFailed(path, NSError(domain: "ZipArchive", code: -1, userInfo: [NSLocalizedDescriptionKey: "Could not open archive"]))
        }
        self.archive = archive
    }

    /// Get all image files from the archive, sorted by name
    func getImageFiles() -> [Entry] {
        var imageEntries: [Entry] = []

        for entry in archive {
            let filename = entry.path
            let ext = (filename as NSString).pathExtension.lowercased()

            // Skip directories and non-image files
            guard entry.type == .file,
                  Self.imageExtensions.contains(ext),
                  !isHiddenFile(filename) else {
                continue
            }

            imageEntries.append(entry)
        }

        // Sort by filename (natural sort for page ordering)
        imageEntries.sort { entry1, entry2 in
            let name1 = (entry1.path as NSString).lastPathComponent
            let name2 = (entry2.path as NSString).lastPathComponent
            return name1.localizedStandardCompare(name2) == .orderedAscending
        }

        return imageEntries
    }

    /// Extract an entry's data
    func extractEntry(_ entry: Entry) throws -> Data {
        var data = Data()

        do {
            _ = try archive.extract(entry) { chunk in
                data.append(chunk)
            }
        } catch {
            throw StreamerError.pageExtractionFailed(0, error)
        }

        return data
    }

    /// Check if a file is hidden (starts with . or is in __MACOSX)
    private func isHiddenFile(_ path: String) -> Bool {
        let components = (path as NSString).pathComponents
        for component in components {
            if component.hasPrefix(".") || component == "__MACOSX" {
                return true
            }
        }
        return false
    }
}
