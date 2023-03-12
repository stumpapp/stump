// DO NOT MODIFY THIS FILE, IT IS AUTOGENERATED

export interface StumpVersion { semver: string, rev: string | null, compile_time: string }

export interface User { id: string, username: string, role: string, user_preferences: UserPreferences | null }

export type UserRole = "SERVER_OWNER" | "MEMBER"

export interface UserPreferences { id: string, locale: string, library_layout_mode: string, series_layout_mode: string, collection_layout_mode: string, app_theme: string }

export interface UpdateUserArgs { username: string, password: string | null }

export interface UserPreferencesUpdate { id: string, locale: string, library_layout_mode: string, series_layout_mode: string, collection_layout_mode: string }

export interface LoginOrRegisterArgs { username: string, password: string }

export interface ClaimResponse { is_claimed: boolean }

export type FileStatus = "UNKNOWN" | "READY" | "UNSUPPORTED" | "ERROR" | "MISSING"

export interface Library { id: string, name: string, description: string | null, path: string, status: string, updated_at: string, series: Array<Series> | null, tags: Array<Tag> | null, library_options: LibraryOptions }

export type LibraryPattern = "SERIES_BASED" | "COLLECTION_BASED"

export type LibraryScanMode = "SYNC" | "BATCHED" | "NONE"

export interface LibraryOptions { id: string | null, convert_rar_to_zip: boolean, hard_delete_conversions: boolean, create_webp_thumbnails: boolean, library_pattern: LibraryPattern, library_id: string | null }

export interface CreateLibraryArgs { name: string, path: string, description: string | null, tags: Array<Tag> | null, scan_mode: LibraryScanMode | null, library_options: LibraryOptions | null }

export interface UpdateLibraryArgs { id: string, name: string, path: string, description: string | null, tags: Array<Tag> | null, removed_tags: Array<Tag> | null, library_options: LibraryOptions, scan_mode: LibraryScanMode | null }

export interface LibrariesStats { series_count: bigint, book_count: bigint, total_bytes: bigint }

export interface Series { id: string, name: string, path: string, description: string | null, status: FileStatus, updated_at: string, created_at: string, library_id: string, library: Library | null, media: Array<Media> | null, media_count?: bigint, unread_media_count?: bigint, tags: Array<Tag> | null }

export interface Media { id: string, name: string, description: string | null, size: number, extension: string, pages: number, updated_at: string, created_at: string, modified_at: string, checksum: string | null, path: string, status: FileStatus, series_id: string, series?: Series, read_progresses?: Array<ReadProgress>, current_page?: number, is_completed?: boolean, tags?: Array<Tag> }

export interface MediaMetadata { Series: string | null, Number: number | null, Web: string | null, Summary: string | null, Publisher: string | null, Genre: string | null, PageCount: number | null }

export interface ReadProgress { id: string, page: number, is_completed: boolean, media_id: string, media: Media | null, user_id: string, user: User | null }

export interface Tag { id: string, name: string }

export type LayoutMode = "GRID" | "LIST"

export interface Epub { media_entity: Media, spine: Array<string>, resources: Record<string, [string, string]>, toc: Array<EpubContent>, metadata: Record<string, Array<string>>, root_base: string, root_file: string, extra_css: Array<string> }

export interface EpubContent { label: string, content: string, play_order: number }

export type JobStatus = "RUNNING" | "QUEUED" | "COMPLETED" | "CANCELLED" | "FAILED"

export interface JobUpdate { runner_id: string, current_task: bigint | null, task_count: bigint, message: string | null, status: JobStatus | null }

export interface JobReport { id: string | null, kind: string, details: string | null, status: JobStatus, task_count: number | null, completed_task_count: number | null, ms_elapsed: bigint | null, completed_at: string | null }

export type CoreEvent = { key: "JobStarted", data: JobUpdate } | { key: "JobProgress", data: JobUpdate } | { key: "JobComplete", data: string } | { key: "JobFailed", data: { runner_id: string, message: string } } | { key: "CreateEntityFailed", data: { runner_id: string | null, path: string, message: string } } | { key: "CreatedMedia", data: Media } | { key: "CreatedMediaBatch", data: bigint } | { key: "CreatedSeries", data: Series } | { key: "CreatedSeriesBatch", data: bigint }

export interface ReadingList { id: string, name: string, creating_user_id: string, description: string | null, media: Array<Media> | null }

export interface CreateReadingList { id: string, media_ids: Array<string> }

export interface DirectoryListing { parent: string | null, files: Array<DirectoryListingFile> }

export interface DirectoryListingFile { is_directory: boolean, name: string, path: string }

export interface DirectoryListingInput { path: string | null }

export interface Log { id: string, level: LogLevel, message: string, created_at: string, job_id: string | null }

export interface LogMetadata { path: string, size: bigint, modified: string }

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG"

export type Direction = "asc" | "desc"

export interface PageParams { zero_based: boolean, page: number, page_size: number }

export interface QueryOrder { order_by: string, direction: Direction }

export interface PageQuery { zero_based: boolean | null, page: number | null, page_size: number | null }

export interface CursorQuery { cursor: string | null, limit: bigint | null }

export interface PageInfo { total_pages: number, current_page: number, page_size: number, page_offset: number, zero_based: boolean }

export type Pagination = null | PageQuery | CursorQuery

