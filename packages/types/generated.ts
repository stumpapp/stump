/* eslint-disable @typescript-eslint/ban-types */
// DO NOT MODIFY THIS FILE, IT IS AUTOGENERATED

// CORE TYPE GENERATION

/**
 * An event that is emitted by the core and consumed by a client
 */
export type CoreEvent = ({ __typename: "JobStarted" } & string) | ({ __typename: "JobUpdate" } & JobUpdate) | { __typename: "JobOutput"; id: string; output: CoreJobOutput } | ({ __typename: "DiscoveredMissingLibrary" } & string) | { __typename: "CreatedMedia"; id: string; series_id: string } | { __typename: "CreatedManySeries"; count: BigInt; library_id: string } | { __typename: "CreatedOrUpdatedManyMedia"; count: BigInt; series_id: string }

export type EntityVisibility = "PUBLIC" | "SHARED" | "PRIVATE"

export type AccessRole = "Reader" | "Writer" | "CoCreator"

/**
 * A model representing a persisted log entry. These are different than traces/system logs.
 */
export type Log = { id: number; level: LogLevel; message: string; context: string | null; timestamp: string; job_id?: string | null }

/**
 * Information about the Stump log file, located at STUMP_CONFIG_DIR/Stump.log, or
 * ~/.stump/Stump.log by default. Information such as the file size, last modified date, etc.
 */
export type LogMetadata = { path: string; size: BigInt; modified: string }

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG"

export type PersistedJob = { id: string; name: string; description: string | null; status: JobStatus; output_data: CoreJobOutput | null; ms_elapsed: BigInt; created_at: string; completed_at: string | null; logs?: Log[] | null }

export type CoreJobOutput = LibraryScanOutput | SeriesScanOutput | ThumbnailGenerationOutput

/**
 * An update event that is emitted by a job
 */
export type JobUpdate = ({ status?: JobStatus | null; message?: string | null; completed_tasks?: number | null; remaining_tasks?: number | null; completed_subtasks?: number | null; remaining_subtasks?: number | null }) & { id: string }

/**
 * A struct that represents a progress event that is emitted by a job. This behaves like a patch,
 * where the client will ignore any fields that are not present. This is done so all internal ops
 * can be done without needing to know the full state of the job.
 */
export type JobProgress = { status?: JobStatus | null; message?: string | null; completed_tasks?: number | null; remaining_tasks?: number | null; completed_subtasks?: number | null; remaining_subtasks?: number | null }

/**
 * The data that is collected and updated during the execution of a library scan job
 */
export type LibraryScanOutput = { total_files: BigInt; total_directories: BigInt; ignored_files: BigInt; skipped_files: BigInt; ignored_directories: BigInt; created_media: BigInt; updated_media: BigInt; created_series: BigInt; updated_series: BigInt }

export type SeriesScanOutput = { total_files: BigInt; ignored_files: BigInt; skipped_files: BigInt; created_media: BigInt; updated_media: BigInt }

export type ThumbnailGenerationJobVariant = ({ type: "SingleLibrary" } & string) | ({ type: "SingleSeries" } & string) | ({ type: "MediaGroup" } & string[])

export type ThumbnailGenerationJobParams = { variant: ThumbnailGenerationJobVariant; force_regenerate: boolean }

export type ThumbnailGenerationOutput = { visited_files: BigInt; generated_thumbnails: BigInt; removed_thumbnails: BigInt }

export type User = { id: string; username: string; is_server_owner: boolean; avatar_url: string | null; created_at: string; last_login: string | null; is_locked: boolean; permissions: UserPermission[]; max_sessions_allowed?: number | null; login_sessions_count?: number | null; user_preferences?: UserPreferences | null; login_activity?: LoginActivity[] | null; age_restriction?: AgeRestriction | null; read_progresses?: ReadProgress[] | null }

/**
 * Permissions that can be granted to a user. Some permissions are implied by others,
 * and will be automatically granted if the "parent" permission is granted.
 */
export type UserPermission = "bookclub:read" | "bookclub:create" | "emailer:read" | "emailer:create" | "emailer:manage" | "email:send" | "email:arbitrary_send" | "smartlist:read" | "file:explorer" | "file:upload" | "file:download" | "library:create" | "library:edit" | "library:scan" | "library:manage" | "library:delete" | "user:read" | "user:manage" | "notifier:read" | "notifier:create" | "notifier:manage" | "notifier:delete" | "server:manage"

export type AgeRestriction = { age: number; restrict_on_unset: boolean }

export type UserPreferences = { id: string; locale: string; app_theme: string; show_query_indicator: boolean; enable_live_refetch?: boolean; preferred_layout_mode?: string; primary_navigation_mode?: string; layout_max_width_px?: number | null; enable_discord_presence?: boolean; enable_compact_display?: boolean; enable_double_sidebar?: boolean; enable_hide_scrollbar?: boolean; enable_replace_primary_sidebar?: boolean; prefer_accent_color?: boolean; show_thumbnails_in_headers?: boolean }

export type LoginActivity = { id: string; ip_address: string; user_agent: string; authentication_successful: boolean; timestamp: string; user?: User | null }

export type EmailerSendTo = { device_id: number } | { email: string }

/**
 * The config for an SMTP emailer
 */
export type EmailerConfig = { sender_email: string; sender_display_name: string; username: string; smtp_host: string; smtp_port: number; max_attachment_size_bytes: number | null; max_num_attachments: number | null }

export type EmailerClientConfig = { sender_email: string; sender_display_name: string; username: string; password: string; host: string; port: number; max_attachment_size_bytes: number | null; max_num_attachments: number | null }

/**
 * An SMTP emailer entity, which stores SMTP configuration data to be used for sending emails.
 * 
 * will be configurable. This will be expanded in the future.
 */
export type SMTPEmailer = { id: number; name: string; is_primary: boolean; config: EmailerConfig; last_used_at: string | null }

export type RegisteredEmailDevice = { id: number; name: string; email: string; forbidden: boolean }

/**
 * A record of an email that was sent, used to keep track of emails that
 * were sent by specific emailer(s)
 */
export type EmailerSendRecord = { id: number; emailer_id: number; recipient_email: string; attachment_meta: AttachmentMeta[] | null; sent_at: string; sent_by_user_id: string | null; sent_by?: User | null }

/**
 * The metadata of an attachment that was sent with an email
 */
export type AttachmentMeta = { filename: string; media_id: string | null; size: number }

export type FileStatus = "UNKNOWN" | "READY" | "UNSUPPORTED" | "ERROR" | "MISSING"

export type Library = { id: string; name: string; description: string | null; emoji: string | null; path: string; status: string; updated_at: string; series: Series[] | null; tags: Tag[] | null; library_options: LibraryOptions }

export type LibraryPattern = "SERIES_BASED" | "COLLECTION_BASED"

export type LibraryScanMode = "DEFAULT" | "NONE"

export type LibraryOptions = { id: string | null; convert_rar_to_zip: boolean; hard_delete_conversions: boolean; library_pattern: LibraryPattern; thumbnail_config: ImageProcessorOptions | null; library_id: string | null }

export type LibraryStats = { series_count: BigInt; book_count: BigInt; total_bytes: BigInt; completed_books: BigInt; in_progress_books: BigInt }

export type SeriesMetadata = { _type: string; title: string | null; summary: string | null; publisher: string | null; imprint: string | null; comicid: number | null; volume: number | null; booktype: string | null; age_rating: number | null; status: string | null }

export type Series = { id: string; name: string; path: string; description: string | null; status: FileStatus; updated_at: string; created_at: string; library_id: string; library: Library | null; media: Media[] | null; metadata: SeriesMetadata | null; media_count?: BigInt | null; unread_media_count?: BigInt | null; tags?: Tag[] | null }

/**
 * Struct representing the metadata for a processed file.
 */
export type MediaMetadata = { title: string | null; series: string | null; number: number | null; volume: number | null; summary: string | null; notes: string | null; age_rating?: number | null; genre?: string[] | null; year: number | null; month: number | null; day: number | null; writers?: string[] | null; pencillers?: string[] | null; inkers?: string[] | null; colorists?: string[] | null; letterers?: string[] | null; cover_artists?: string[] | null; editors?: string[] | null; publisher: string | null; links?: string[] | null; characters?: string[] | null; teams?: string[] | null; page_count: number | null }

export type Media = { id: string; name: string; size: number; extension: string; pages: number; updated_at: string; created_at: string; modified_at: string | null; hash: string | null; path: string; status: FileStatus; series_id: string; metadata: MediaMetadata | null; series?: Series | null; read_progresses?: ReadProgress[] | null; current_page?: number | null; current_epubcfi?: string | null; is_completed?: boolean | null; tags?: Tag[] | null; bookmarks?: Bookmark[] | null }

/**
 * A model representing a bookmark in the database. Bookmarks are used to save specific locations
 * in a media file, such as an epub, without any additional metadata like notes, tags, etc.
 */
export type Bookmark = { id: string; preview_content: string | null; epubcfi: string | null; page: number | null; book_id: string; book?: Media | null; user_id?: string | null; user?: User | null }

export type MediaAnnotation = { id: string; highlighted_text: string | null; page: number | null; page_coordinates_x: number | null; page_coordinates_y: number | null; epubcfi: string | null; notes: string | null; media_id: string; media?: Media | null }

export type ReadProgress = { id: string; page: number; epubcfi: string | null; percentage_completed: number | null; is_completed: boolean; completed_at: string | null; media_id: string; media: Media | null; user_id: string; user: User | null }

/**
 * A filter for a single value, e.g. `name = "test"`
 */
export type Filter<T> = T | { not: T } | { contains: T } | { excludes: T } | { any: T[] } | { none: T[] } | NumericFilter<T>

export type NumericFilter<T> = { gt: T } | { gte: T } | { lt: T } | { lte: T } | NumericRange<T>

export type NumericRange<T> = { from: T; to: T; inclusive?: boolean }

/**
 * A list of filters that are being combined with a logical operator, e.g. `and` or `or`
 */
export type FilterGroup<T> = { and: T[] } | { or: T[] } | { not: T[] }

export type FilterJoin = "AND" | "OR"

export type SmartListItemGrouping = "BY_BOOKS" | "BY_SERIES" | "BY_LIBRARY"

export type SmartListItemGroup<E> = { entity: E; books: Media[] }

export type SmartListItems = { type: "Books"; items: Media[] } | { type: "Series"; items: SmartListItemGroup<Series>[] } | { type: "Library"; items: SmartListItemGroup<Library>[] }

export type SmartList = { id: string; name: string; description: string | null; filters: SmartFilter<MediaSmartFilter>; visibility: EntityVisibility; joiner: FilterJoin; default_grouping: SmartListItemGrouping; saved_views: SmartListView[] | null; creator_id?: string | null }

export type SmartFilter<T> = { groups: FilterGroup<T>[]; joiner?: FilterJoin }

export type MediaSmartFilter = { name: Filter<string> } | { extension: Filter<string> } | { path: Filter<string> } | { metadata: MediaMetadataSmartFilter } | { series: SeriesSmartFilter }

export type MediaMetadataSmartFilter = { publisher: Filter<string> } | { genre: Filter<string> } | { characters: Filter<string> } | { colorists: Filter<string> } | { writers: Filter<string> } | { pencillers: Filter<string> } | { letterers: Filter<string> } | { inkers: Filter<string> } | { editors: Filter<string> } | { age_rating: Filter<number> } | { year: Filter<number> } | { month: Filter<number> } | { day: Filter<number> }

export type SeriesMetadataSmartFilter = { meta_type: Filter<string> } | { publisher: Filter<string> } | { status: Filter<string> } | { age_rating: Filter<number> } | { volume: Filter<number> }

export type SeriesSmartFilter = { name: Filter<string> } | { path: Filter<string> } | { metadata: SeriesMetadataSmartFilter } | { library: LibrarySmartFilter }

export type LibrarySmartFilter = { name: Filter<string> } | { path: Filter<string> }

export type SmartListView = ({ book_columns: SmartListTableColumnSelection[]; group_columns: SmartListTableColumnSelection[]; book_sorting: SmartListTableSortingState[] | null; group_sorting: SmartListTableSortingState[] | null; enable_multi_sort?: boolean | null; search?: string | null }) & { name: string; list_id: string }

export type SmartListTableSortingState = { desc: boolean; id: string }

export type SmartListTableColumnSelection = { id: string; position: number }

export type BookClub = { id: string; name: string; description: string | null; emoji: string | null; is_private: boolean; created_at: string; member_role_spec: BookClubMemberRoleSpec; members?: BookClubMember[] | null; schedule?: BookClubSchedule | null }

export type BookClubMember = { id: string; display_name?: string | null; is_creator: boolean; hide_progress: boolean; private_membership: boolean; role: BookClubMemberRole; user?: User | null; user_id?: string | null; book_club?: BookClub | null }

export type BookClubMemberRole = "MEMBER" | "MODERATOR" | "ADMIN" | "CREATOR"

export type BookClubMemberRoleSpec = Record<BookClubMemberRole, string>

export type BookClubSchedule = { default_interval_days: number | null; books?: BookClubBook[] | null }

export type BookClubBook = { id: string; start_at: string; end_at: string; discussion_duration_days: number; title?: string | null; author?: string | null; url?: string | null; book_entity?: Media | null; chat_board?: BookClubChatBoard | null }

export type BookClubChatBoard = { id: string; messages: BookClubChatMessage[] | null }

export type BookClubChatMessage = { id: string; content: string; timestamp: string; is_top_message: boolean; child_messages?: BookClubChatMessage[] | null; likes?: BookClubChatMessageLike[] | null; member?: BookClubMember | null }

export type BookClubChatMessageLike = { id: string; timestamp: string; liked_by?: BookClubMember | null }

export type BookClubInvitation = { id: string; user?: User | null; book_club?: BookClub | null }

export type Tag = { id: string; name: string }

export type LayoutMode = "GRID" | "LIST"

export type Epub = { media_entity: Media; spine: string[]; resources: { [key: string]: [string, string] }; toc: EpubContent[]; metadata: { [key: string]: string[] }; annotations: MediaAnnotation[] | null; root_base: string; root_file: string; extra_css: string[] }

export type UpdateEpubProgress = { epubcfi: string; percentage: number; is_complete: boolean | null }

export type EpubContent = { label: string; content: string; play_order: number }

export type JobStatus = "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED" | "FAILED" | "QUEUED"

export type JobSchedulerConfig = { id: string; interval_secs: number; excluded_libraries: Library[] }

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

export type ClaimResponse = { is_claimed: boolean }

export type StumpVersion = { semver: string; rev: string; compile_time: string }

export type UpdateCheck = { current_semver: string; latest_semver: string; has_update_available: boolean }

export type LoginOrRegisterArgs = { username: string; password: string }

export type CreateUser = { username: string; password: string; permissions?: UserPermission[]; age_restriction: AgeRestriction | null; max_sessions_allowed?: number | null }

export type UpdateUser = { username: string; password: string | null; avatar_url: string | null; permissions?: UserPermission[]; age_restriction: AgeRestriction | null; max_sessions_allowed?: number | null }

export type UpdateUserPreferences = { id: string; locale: string; preferred_layout_mode: string; primary_navigation_mode: string; layout_max_width_px: number | null; app_theme: string; show_query_indicator: boolean; enable_live_refetch: boolean; enable_discord_presence: boolean; enable_compact_display: boolean; enable_double_sidebar: boolean; enable_replace_primary_sidebar: boolean; enable_hide_scrollbar: boolean; prefer_accent_color: boolean; show_thumbnails_in_headers: boolean }

export type DeleteUser = { hard_delete: boolean | null }

export type EmailerIncludeParams = { include_send_history?: boolean }

export type EmailerSendRecordIncludeParams = { include_sent_by?: boolean }

export type SendAttachmentEmailsPayload = { media_ids: string[]; send_to: EmailerSendTo[] }

export type SendAttachmentEmailResponse = { sent_emails_count: number; errors: string[] }

/**
 * Input object for creating or updating an emailer
 */
export type CreateOrUpdateEmailer = { name: string; is_primary: boolean; config: EmailerClientConfig }

/**
 * Input object for creating or updating an email device
 */
export type CreateOrUpdateEmailDevice = { name: string; email: string; forbidden: boolean }

/**
 * Patch an existing email device by its ID
 */
export type PatchEmailDevice = { name: string | null; email: string | null; forbidden: boolean | null }

export type CreateLibrary = { name: string; path: string; description: string | null; tags: Tag[] | null; scan_mode: LibraryScanMode | null; library_options: LibraryOptions | null }

export type UpdateLibrary = { id: string; name: string; path: string; description: string | null; emoji: string | null; tags: Tag[] | null; removed_tags?: Tag[] | null; library_options: LibraryOptions; scan_mode?: LibraryScanMode | null }

export type UpdateLibraryExcludedUsers = { user_ids: string[] }

export type CleanLibraryResponse = { deleted_media_count: number; deleted_series_count: number; is_empty: boolean }

export type LibraryStatsParams = { all_users?: boolean }

export type PutMediaCompletionStatus = { is_complete: boolean; page?: number | null }

export type MediaIsComplete = { is_completed: boolean; completed_at: string | null }

export type MediaMetadataOverview = { genres: string[]; writers: string[]; pencillers: string[]; inkers: string[]; colorists: string[]; letterers: string[]; editors: string[]; publishers: string[]; characters: string[]; teams: string[] }

export type CreateOrUpdateBookmark = { epubcfi: string; preview_content: string | null }

export type DeleteBookmark = { epubcfi: string }

export type SeriesIsComplete = { is_complete: boolean; completed_at: string | null }

export type UpdateSchedulerConfig = { interval_secs: number | null; excluded_library_ids: string[] | null }

export type GetBookClubsParams = { all?: boolean }

export type CreateBookClub = { name: string; is_private?: boolean; member_role_spec: BookClubMemberRoleSpec | null; creator_hide_progress?: boolean; creator_display_name: string | null }

export type UpdateBookClub = { name: string | null; description: string | null; is_private: boolean | null; member_role_spec: BookClubMemberRoleSpec | null; emoji: string | null }

export type CreateBookClubInvitation = { user_id: string; role: BookClubMemberRole | null }

export type BookClubInvitationAnswer = { accept: boolean; member_details: CreateBookClubMember | null }

export type CreateBookClubMember = { user_id: string; display_name: string | null; private_membership: boolean | null }

export type UpdateBookClubMember = { display_name: string | null; private_membership: boolean | null }

/**
 * An enum to represent the two options for a book in a book club schedule:
 * 
 * - A book that is stored in the database
 * - A book that is not stored in the database
 * 
 * This provides some flexibility for book clubs to add books that perhaps are not on the server
 */
export type CreateBookClubScheduleBookOption = { id: string } | { title: string; author: string; url: string | null }

export type CreateBookClubScheduleBook = { book: CreateBookClubScheduleBookOption; start_at: string | null; end_at: string | null; discussion_duration_days: number | null }

export type CreateBookClubSchedule = { default_interval_days: number | null; books: CreateBookClubScheduleBook[] }

export type PatchMediaThumbnail = { page: number; is_zero_based?: boolean | null }

export type PatchSeriesThumbnail = { media_id: string; page: number; is_zero_based?: boolean | null }

export type PatchLibraryThumbnail = { media_id: string; page: number; is_zero_based?: boolean | null }

export type CreateOrUpdateSmartList = { name: string; description: string | null; filters: SmartFilter<MediaSmartFilter>; joiner?: FilterJoin | null; default_grouping?: SmartListItemGrouping | null }

export type GetSmartListsParams = { all?: boolean | null; search?: string | null }

export type SmartListRelationOptions = { load_views?: boolean }

export type SmartListMeta = { matched_books: BigInt; matched_series: BigInt; matched_libraries: BigInt }

export type CreateOrUpdateSmartListView = ({ book_columns: SmartListTableColumnSelection[]; group_columns: SmartListTableColumnSelection[]; book_sorting: SmartListTableSortingState[] | null; group_sorting: SmartListTableSortingState[] | null; enable_multi_sort?: boolean | null; search?: string | null }) & { name: string }

