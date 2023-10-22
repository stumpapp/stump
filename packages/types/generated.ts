/* eslint-disable @typescript-eslint/ban-types */
// DO NOT MODIFY THIS FILE, IT IS AUTOGENERATED

// CORE TYPE GENERATION

export type User = { id: string; username: string; is_server_owner: boolean; avatar_url: string | null; created_at: string; last_login: string | null; is_locked: boolean; permissions: UserPermission[]; login_sessions_count?: number | null; user_preferences?: UserPreferences | null; login_activity?: LoginActivity[] | null; age_restriction?: AgeRestriction | null; read_progresses?: ReadProgress[] | null }

export type UserPermission = "bookclub:read" | "bookclub:create" | "file:upload"

export type AgeRestriction = { age: number; restrict_on_unset: boolean }

export type UserPreferences = { id: string; locale: string; library_layout_mode: string; series_layout_mode: string; collection_layout_mode: string; app_theme: string; show_query_indicator: boolean }

export type LoginActivity = { id: string; ip_address: string; user_agent: string; authentication_successful: boolean; timestamp: string; user?: User | null }

export type UpdateUser = { username: string; password: string | null; avatar_url: string | null }

export type UpdateUserPreferences = { id: string; locale: string; library_layout_mode: string; series_layout_mode: string; collection_layout_mode: string; app_theme: string; show_query_indicator: boolean }

export type FileStatus = "UNKNOWN" | "READY" | "UNSUPPORTED" | "ERROR" | "MISSING"

export type Library = { id: string; name: string; description: string | null; path: string; status: string; updated_at: string; series: Series[] | null; tags: Tag[] | null; library_options: LibraryOptions }

export type LibraryPattern = "SERIES_BASED" | "COLLECTION_BASED"

export type LibraryScanMode = "DEFAULT" | "QUICK" | "NONE"

export type LibraryOptions = { id: string | null; convert_rar_to_zip: boolean; hard_delete_conversions: boolean; library_pattern: LibraryPattern; thumbnail_config: ImageProcessorOptions | null; library_id: string | null }

export type CreateLibrary = { name: string; path: string; description: string | null; tags: Tag[] | null; scan_mode: LibraryScanMode | null; library_options: LibraryOptions | null }

export type UpdateLibrary = { id: string; name: string; path: string; description: string | null; tags: Tag[] | null; removed_tags: Tag[] | null; library_options: LibraryOptions; scan_mode: LibraryScanMode | null }

export type LibrariesStats = { series_count: BigInt; book_count: BigInt; total_bytes: BigInt }

export type SeriesMetadata = { _type: string; title: string | null; summary: string | null; publisher: string | null; imprint: string | null; comicid: number | null; volume: number | null; booktype: string | null; age_rating: number | null; status: string | null }

export type Series = { id: string; name: string; path: string; description: string | null; status: FileStatus; updated_at: string; created_at: string; library_id: string; library: Library | null; media: Media[] | null; metadata: SeriesMetadata | null; media_count?: BigInt | null; unread_media_count?: BigInt | null; tags: Tag[] | null }

/**
 * Struct representing the metadata for a processed file.
 */
export type MediaMetadata = { title: string | null; series: string | null; number: number | null; volume: number | null; summary: string | null; notes: string | null; age_rating?: number | null; genre?: string[] | null; year: number | null; month: number | null; day: number | null; writers?: string[] | null; pencillers?: string[] | null; inkers?: string[] | null; colorists?: string[] | null; letterers?: string[] | null; cover_artists?: string[] | null; editors?: string[] | null; publisher: string | null; links?: string[] | null; characters?: string[] | null; teams?: string[] | null; page_count: number | null }

export type Media = { id: string; name: string; size: number; extension: string; pages: number; updated_at: string; created_at: string; modified_at: string | null; hash: string | null; path: string; status: FileStatus; series_id: string; metadata: MediaMetadata | null; series?: Series | null; read_progresses?: ReadProgress[] | null; current_page?: number | null; current_epubcfi?: string | null; is_completed?: boolean | null; tags?: Tag[] | null }

export type MediaAnnotationKind = "HIGHLIGHT" | "NOTE" | "BOOKMARK"

export type MediaAnnotation = { id: string; kind: MediaAnnotationKind; epubcfi: string | null; text: string | null; media_id: string; media: Media | null }

export type ReadProgress = { id: string; page: number; epubcfi: string | null; percentage_completed: number | null; is_completed: boolean; completed_at: string | null; media_id: string; media: Media | null; user_id: string; user: User | null }

export type BookClub = { id: string; name: string; description: string | null; is_private: boolean; created_at: string; member_role_spec: BookClubMemberRoleSpec; members?: BookClubMember[] | null; schedule?: BookClubSchedule | null }

export type BookClubMember = { id: string; display_name?: string | null; is_creator: boolean; hide_progress: boolean; private_membership: boolean; role: BookClubMemberRole; user?: User | null; book_club?: BookClub | null }

export type BookClubMemberRole = "MEMBER" | "MODERATOR" | "ADMIN" | "CREATOR"

export type BookClubMemberRoleSpec = Record<BookClubMemberRole, string>

export type BookClubSchedule = { default_interval_days: number | null; books?: BookClubBook[] | null }

export type BookClubBook = { id: string; order: number; start_at?: string | null; end_at?: string | null; discussion_duration_days: number; title?: string | null; author?: string | null; url?: string | null; book_entity?: Media | null; chat_board?: BookClubChatBoard | null }

export type BookClubChatBoard = { id: string; messages: BookClubChatMessage[] | null }

export type BookClubChatMessage = { id: string; content: string; timestamp: string; is_top_message: boolean; child_messages?: BookClubChatMessage[] | null; likes?: BookClubChatMessageLike[] | null; member?: BookClubMember | null }

export type BookClubChatMessageLike = { id: string; timestamp: string; liked_by?: BookClubMember | null }

export type BookClubInvitation = { id: string; user?: User | null; book_club?: BookClub | null }

export type Tag = { id: string; name: string }

export type LayoutMode = "GRID" | "LIST"

export type Epub = { media_entity: Media; spine: string[]; resources: { [key: string]: [string, string] }; toc: EpubContent[]; metadata: { [key: string]: string[] }; annotations: MediaAnnotation[] | null; root_base: string; root_file: string; extra_css: string[] }

export type UpdateEpubProgress = { epubcfi: string; percentage: number; is_complete: boolean | null }

export type EpubContent = { label: string; content: string; play_order: number }

export type JobStatus = "RUNNING" | "COMPLETED" | "CANCELLED" | "FAILED" | "QUEUED"

export type JobUpdate = { job_id: string; current_task: BigInt | null; task_count: BigInt; message: string | null; status: JobStatus | null }

export type JobDetail = { id: string; name: string; description: string | null; status: JobStatus; task_count: number | null; completed_task_count: number | null; ms_elapsed: BigInt | null; created_at: string | null; completed_at: string | null }

export type JobSchedulerConfig = { id: string; interval_secs: number; excluded_libraries: Library[] }

export type CoreEvent = { key: "JobStarted"; data: JobUpdate } | { key: "JobProgress"; data: JobUpdate } | { key: "JobComplete"; data: string } | { key: "JobFailed"; data: { job_id: string; message: string } } | { key: "CreateEntityFailed"; data: { job_id: string | null; path: string; message: string } } | { key: "CreatedMedia"; data: Media } | { key: "CreatedMediaBatch"; data: BigInt } | { key: "CreatedSeries"; data: Series } | { key: "CreatedSeriesBatch"; data: BigInt } | { key: "GeneratedThumbnailBatch"; data: BigInt }

export type ReadingListItem = { display_order: number; media_id: string; reading_list_id: string; media: Media | null }

export type ReadingListVisibility = "PUBLIC" | "PRIVATE" | "SHARED"

export type ReadingList = { id: string; name: string; creating_user_id: string; visibility: ReadingListVisibility; description: string | null; items: ReadingListItem[] | null }

export type CreateReadingList = { id: string; media_ids: string[]; visibility: ReadingListVisibility | null }

/**
 * The resize mode to use when generating a thumbnail.
 */
export type ImageResizeMode = "Scaled" | "Sized"

/**
 * The resize options to use when generating a thumbnail.
 * When using `Scaled`, the height and width will be scaled by the given factor.
 */
export type ImageResizeOptions = { mode: ImageResizeMode; height: number; width: number }

/**
 * Supported image formats for processing images throughout Stump.
 */
export type ImageFormat = "Webp" | "Jpeg" | "JpegXl" | "Png"

/**
 * Options for processing images throughout Stump.
 */
export type ImageProcessorOptions = { resize_options: ImageResizeOptions | null; format: ImageFormat; quality: number | null; page?: number | null }

export type DirectoryListing = { parent: string | null; files: DirectoryListingFile[] }

export type DirectoryListingFile = { is_directory: boolean; name: string; path: string }

export type DirectoryListingInput = { path: string | null }

export type Log = { id: string; level: LogLevel; message: string; created_at: string; job_id: string | null }

/**
 * Information about the Stump log file, located at STUMP_CONFIG_DIR/Stump.log, or
 * ~/.stump/Stump.log by default. Information such as the file size, last modified date, etc.
 */
export type LogMetadata = { path: string; size: BigInt; modified: string }

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG"

export type Direction = "asc" | "desc"

export type PageParams = { zero_based: boolean; page: number; page_size: number }

/**
 * Model used in media API to alter sorting/ordering of queried media
 */
export type QueryOrder = { order_by: string; direction: Direction }

export type PageQuery = { zero_based: boolean | null; page: number | null; page_size: number | null }

export type CursorQuery = { cursor: string | null; limit: BigInt | null }

export type CursorInfo = { current_cursor: string | null; limit: BigInt | null; next_cursor: string | null }

export type PageInfo = { total_pages: number; current_page: number; page_size: number; page_offset: number; zero_based: boolean }

export type Pagination = null | PageQuery | CursorQuery

// SERVER TYPE GENERATION

export type StumpVersion = { semver: string; rev: string | null; compile_time: string }

export type LoginOrRegisterArgs = { username: string; password: string }

export type CreateUser = { username: string; password: string; permissions?: UserPermission[]; age_restriction: AgeRestriction | null }

export type ClaimResponse = { is_claimed: boolean }

export type MediaMetadataOverview = { genres: string[]; writers: string[]; pencillers: string[]; inkers: string[]; colorists: string[]; letterers: string[]; editors: string[]; publishers: string[]; characters: string[]; teams: string[] }

export type UpdateSchedulerConfig = { interval_secs: number | null; excluded_library_ids: string[] | null }

export type GetBookClubsParams = { all?: boolean }

export type CreateBookClub = { name: string; is_private?: boolean; member_role_spec: BookClubMemberRoleSpec | null; creator_hide_progress?: boolean; creator_display_name: string | null }

export type UpdateBookClub = { name: string | null; description: string | null; is_private: boolean | null; member_role_spec: BookClubMemberRoleSpec | null }

export type CreateBookClubInvitation = { user_id: string; role: BookClubMemberRole | null }

export type BookClubInvitationAnswer = { accept: boolean; member_details: CreateBookClubMember | null }

export type CreateBookClubMember = { user_id: string; display_name: string | null; private_membership: boolean | null }

export type PatchBookClubMember = { display_name: string | null; private_membership: boolean | null }

export type CreateBookClubScheduleBook = { book_id: string; order: number; discussion_duration_days: number | null }

export type PatchMediaThumbnail = { page: number; is_zero_based?: boolean | null }

export type PatchSeriesThumbnail = { media_id: string; page: number; is_zero_based?: boolean | null }

export type PatchLibraryThumbnail = { media_id: string; page: number; is_zero_based?: boolean | null }

