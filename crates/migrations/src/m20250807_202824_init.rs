use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum AgeRestrictions {
	Table,
	Id,
	Age,
	RestrictOnUnset,
	UserId,
}

#[derive(DeriveIden)]
enum ApiKeys {
	Table,
	Id,
	Name,
	ShortToken,
	LongTokenHash,
	Permissions,
	CreatedAt,
	LastUsedAt,
	ExpiresAt,
	UserId,
}

#[derive(DeriveIden)]
enum BookClubs {
	Table,
	Id,
	Name,
	Slug,
	Description,
	IsPrivate,
	MemberRoleSpec,
	CreatedAt,
	Emoji,
}

#[derive(DeriveIden)]
enum Emailers {
	Table,
	Id,
	Name,
	IsPrimary,
	SenderEmail,
	SenderDisplayName,
	Username,
	EncryptedPassword,
	SmtpHost,
	SmtpPort,
	TlsEnabled,
	MaxAttachmentSizeBytes,
	MaxNumAttachments,
	LastUsedAt,
}

#[derive(DeriveIden)]
enum Jobs {
	Table,
	Id,
	Name,
	Description,
	Status,
	SaveState,
	OutputData,
	MsElapsed,
	CreatedAt,
	CompletedAt,
}

#[derive(DeriveIden)]
enum Notifiers {
	Table,
	Id,
	Type,
	Config,
}

#[derive(DeriveIden)]
enum RegisteredEmailDevices {
	Table,
	Id,
	Name,
	Email,
	Forbidden,
}

#[derive(DeriveIden)]
enum RegisteredReadingDevices {
	Table,
	Id,
	Name,
	Kind,
}

#[derive(DeriveIden)]
enum ScheduledJobConfigs {
	Table,
	Id,
	IntervalSecs,
}

#[derive(DeriveIden)]
enum ServerInvitations {
	Table,
	Id,
	Secret,
	Email,
	GrantedPermissions,
	CreatedAt,
	ExpiresAt,
}

#[derive(DeriveIden)]
enum Bookmarks {
	Table,
	Id,
	PreviewContent,
	Locator,
	Epubcfi,
	Page,
	MediaId,
	UserId,
}

#[derive(DeriveIden)]
enum RefreshTokens {
	Table,
	Id,
	UserId,
	CreatedAt,
	ExpiresAt,
}

#[derive(DeriveIden)]
enum Sessions {
	Table,
	Id,
	SessionId,
	UserId,
	CreatedAt,
	ExpiryTime,
}

#[derive(DeriveIden)]
enum UserLoginActivity {
	Table,
	Id,
	IpAddress,
	UserAgent,
	AuthenticationSuccessful,
	Timestamp,
	UserId,
}

#[derive(DeriveIden)]
enum FavoriteLibraries {
	Table,
	UserId,
	LibraryId,
	FavoritedAt,
}

#[derive(DeriveIden)]
enum FavoriteMedia {
	Table,
	UserId,
	MediaId,
	FavoritedAt,
}

#[derive(DeriveIden)]
enum FavoriteSeries {
	Table,
	UserId,
	SeriesId,
	FavoritedAt,
}

#[derive(DeriveIden)]
enum LibraryExclusions {
	Table,
	Id,
	UserId,
	LibraryId,
}

#[derive(DeriveIden)]
enum LibraryTags {
	Table,
	Id,
	LibraryId,
	TagId,
}

#[derive(DeriveIden)]
enum MediaTags {
	Table,
	Id,
	MediaId,
	TagId,
}

#[derive(DeriveIden)]
enum SeriesTags {
	Table,
	Id,
	SeriesId,
	TagId,
}

#[derive(DeriveIden)]
enum LastLibraryVisits {
	Table,
	Id,
	UserId,
	LibraryId,
	Timestamp,
}

#[derive(DeriveIden)]
enum Reviews {
	Table,
	Id,
	Rating,
	Content,
	IsPrivate,
	MediaId,
	UserId,
}

#[derive(DeriveIden)]
enum Logs {
	Table,
	Id,
	Level,
	Message,
	Timestamp,
	JobId,
	Context,
}

#[derive(DeriveIden)]
enum EmailerSendRecords {
	Table,
	Id,
	EmailerId,
	RecipientEmail,
	AttachmentMeta,
	SentAt,
	SentByUserId,
}

#[derive(DeriveIden)]
enum LibraryScanRecords {
	Table,
	Id,
	Options,
	Timestamp,
	LibraryId,
	JobId,
}

#[derive(DeriveIden)]
enum ScheduledJobLibraries {
	Table,
	Id,
	ScheduleId,
	LibraryId,
}

#[derive(DeriveIden)]
enum MediaAnnotations {
	Table,
	Id,
	HighlightedText,
	Epubcfi,
	Page,
	PageCoordinatesX,
	PageCoordinatesY,
	Notes,
	UserId,
	MediaId,
}

#[derive(DeriveIden)]
enum MediaMetadata {
	Table,
	Id,
	MediaId,
	AgeRating,
	Characters,
	Colorists,
	CoverArtists,
	Day,
	Editors,
	Genres,
	IdentifierAmazon,
	IdentifierCalibre,
	IdentifierGoogle,
	IdentifierIsbn,
	IdentifierMobiAsin,
	IdentifierUuid,
	Inkers,
	Language,
	Letterers,
	Links,
	Month,
	Notes,
	Number,
	PageCount,
	Pencillers,
	Publisher,
	Series,
	Summary,
	Teams,
	Title,
	TitleSort,
	Volume,
	Writers,
	Year,
}

#[derive(DeriveIden)]
enum PageAnalysis {
	Table,
	Id,
	Data,
	MediaId,
}

#[derive(DeriveIden)]
enum SeriesMetadata {
	Table,
	SeriesId,
	AgeRating,
	Characters,
	Booktype,
	Comicid,
	Genres,
	Imprint,
	Links,
	MetaType,
	Publisher,
	Status,
	Summary,
	Title,
	Volume,
	Writers,
}

#[derive(DeriveIden)]
enum ReadingSessions {
	Table,
	Id,
	Page,
	PercentageCompleted,
	Locator,
	Epubcfi,
	KoreaderProgress,
	StartedAt,
	UpdatedAt,
	MediaId,
	UserId,
	DeviceId,
	ElapsedSeconds,
}

#[derive(DeriveIden)]
enum FinishedReadingSessions {
	Table,
	Id,
	StartedAt,
	CompletedAt,
	MediaId,
	UserId,
	DeviceId,
	ElapsedSeconds,
}

#[derive(DeriveIden)]
enum SmartLists {
	Table,
	Id,
	Name,
	Description,
	Filters,
	Joiner,
	DefaultGrouping,
	Visibility,
	CreatorId,
}

#[derive(DeriveIden)]
enum SmartListAccessRules {
	Table,
	Id,
	Role,
	UserId,
	SmartListId,
}

#[derive(DeriveIden)]
enum SmartListViews {
	Table,
	Id,
	Name,
	ListId,
	Data,
}

// Book Club related tables
#[derive(DeriveIden)]
enum BookClubSchedules {
	Table,
	Id,
	DefaultIntervalDays,
	BookClubId,
}

#[derive(DeriveIden)]
enum BookClubMembers {
	Table,
	Id,
	DisplayName,
	IsCreator,
	HideProgress,
	PrivateMembership,
	Role,
	UserId,
	BookClubId,
}

#[derive(DeriveIden)]
enum BookClubInvitations {
	Table,
	Id,
	Role,
	UserId,
	BookClubId,
}

#[derive(DeriveIden)]
enum BookClubMemberFavoriteBooks {
	Table,
	Id,
	Title,
	Author,
	Url,
	Notes,
	MemberId,
	BookId,
	ImageUrl,
}

#[derive(DeriveIden)]
enum BookClubBookSuggestions {
	Table,
	Id,
	Title,
	Author,
	Url,
	Notes,
	SuggestedById,
	BookId,
}

#[derive(DeriveIden)]
enum BookClubBooks {
	Table,
	Id,
	StartAt,
	EndAt,
	DiscussionDurationDays,
	Title,
	Author,
	Url,
	ImageUrl,
	BookEntityId,
	BookClubScheduleId,
}

#[derive(DeriveIden)]
enum BookClubBookSuggestionLikes {
	Table,
	Id,
	SuggestionId,
	MemberId,
}

#[derive(DeriveIden)]
enum BookClubDiscussions {
	Table,
	Id,
	Title,
	BookId,
}

#[derive(DeriveIden)]
enum BookClubDiscussionMessage {
	Table,
	Id,
	Content,
	CreatedAt,
	UpdatedAt,
	ParentMessageId,
	DiscussionId,
	MemberId,
}

#[derive(DeriveIden)]
enum BookClubDiscussionMessageLikes {
	Table,
	Id,
	MessageId,
	MemberId,
}

#[derive(DeriveIden)]
enum Users {
	Table,
	Id,
	Username,
	HashedPassword,
	IsServerOwner,
	AvatarUrl,
	CreatedAt,
	DeletedAt,
	IsLocked,
	MaxSessionsAllowed,
	Permissions,
	UserPreferencesId,
}

#[derive(DeriveIden)]
enum UserPreferences {
	Table,
	Id,
	PreferredLayoutMode,
	Locale,
	AppTheme,
	AppFont,
	PrimaryNavigationMode,
	LayoutMaxWidthPx,
	ShowQueryIndicator,
	EnableLiveRefetch,
	EnableDiscordPresence,
	EnableCompactDisplay,
	EnableGradients,
	EnableDoubleSidebar,
	EnableReplacePrimarySidebar,
	EnableHideScrollbar,
	PreferAccentColor,
	ShowThumbnailsInHeaders,
	EnableJobOverlay,
	EnableAlphabetSelect,
	NavigationArrangement,
	HomeArrangement,
	UserId,
}

#[derive(DeriveIden)]
enum Tags {
	Table,
	Id,
	Name,
}

#[derive(DeriveIden)]
enum ServerConfig {
	Table,
	Id,
	PublicUrl,
	InitialWalSetupComplete,
	EncryptionKey,
}

#[derive(DeriveIden)]
enum Libraries {
	Table,
	Id,
	Name,
	Description,
	Path,
	Status,
	CreatedAt,
	UpdatedAt,
	Emoji,
	ConfigId,
	LastScannedAt,
}

#[derive(DeriveIden)]
enum LibraryConfigs {
	Table,
	Id,
	ConvertRarToZip,
	HardDeleteConversions,
	DefaultReadingDir,
	DefaultReadingMode,
	DefaultReadingImageScaleFit,
	GenerateFileHashes,
	GenerateKoreaderHashes,
	ProcessMetadata,
	Watch,
	LibraryPattern,
	ThumbnailConfig,
	IgnoreRules,
	LibraryId,
}

#[derive(DeriveIden)]
enum Series {
	Table,
	Id,
	Name,
	Description,
	CreatedAt,
	UpdatedAt,
	DeletedAt,
	Path,
	Status,
	LibraryId,
}

#[derive(DeriveIden)]
enum Media {
	Table,
	Id,
	Name,
	Size,
	Extension,
	Pages,
	UpdatedAt,
	CreatedAt,
	ModifiedAt,
	Hash,
	KoreaderHash,
	Path,
	Status,
	SeriesId,
	DeletedAt,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		// Create user_preferences table (referenced by users)
		manager
			.create_table(
				Table::create()
					.table(UserPreferences::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(UserPreferences::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(UserPreferences::PreferredLayoutMode)
							.text()
							.not_null(),
					)
					.col(ColumnDef::new(UserPreferences::Locale).text().not_null())
					.col(ColumnDef::new(UserPreferences::AppTheme).text().not_null())
					.col(ColumnDef::new(UserPreferences::AppFont).text().not_null())
					.col(
						ColumnDef::new(UserPreferences::PrimaryNavigationMode)
							.text()
							.not_null(),
					)
					.col(ColumnDef::new(UserPreferences::LayoutMaxWidthPx).integer())
					.col(
						ColumnDef::new(UserPreferences::ShowQueryIndicator)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserPreferences::EnableLiveRefetch)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserPreferences::EnableDiscordPresence)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserPreferences::EnableCompactDisplay)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserPreferences::EnableGradients)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserPreferences::EnableDoubleSidebar)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserPreferences::EnableReplacePrimarySidebar)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserPreferences::EnableHideScrollbar)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserPreferences::PreferAccentColor)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserPreferences::ShowThumbnailsInHeaders)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserPreferences::EnableJobOverlay)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserPreferences::EnableAlphabetSelect)
							.boolean()
							.not_null(),
					)
					.col(ColumnDef::new(UserPreferences::NavigationArrangement).json())
					.col(ColumnDef::new(UserPreferences::HomeArrangement).json())
					.col(ColumnDef::new(UserPreferences::UserId).text().unique_key())
					.to_owned(),
			)
			.await?;

		// Create users table
		manager
			.create_table(
				Table::create()
					.table(Users::Table)
					.if_not_exists()
					.col(ColumnDef::new(Users::Id).text().not_null().primary_key())
					.col(
						ColumnDef::new(Users::Username)
							.text()
							.not_null()
							.unique_key(),
					)
					.col(ColumnDef::new(Users::HashedPassword).text().not_null())
					.col(ColumnDef::new(Users::IsServerOwner).boolean().not_null())
					.col(ColumnDef::new(Users::AvatarUrl).text())
					.col(ColumnDef::new(Users::CreatedAt).date_time().not_null())
					.col(ColumnDef::new(Users::DeletedAt).date_time())
					.col(ColumnDef::new(Users::IsLocked).boolean().not_null())
					.col(ColumnDef::new(Users::MaxSessionsAllowed).integer())
					.col(ColumnDef::new(Users::Permissions).text())
					.col(
						ColumnDef::new(Users::UserPreferencesId)
							.integer()
							.unique_key(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-users-user_preferences")
							.from(Users::Table, Users::UserPreferencesId)
							.to(UserPreferences::Table, UserPreferences::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create age_restrictions table (references users)
		manager
			.create_table(
				Table::create()
					.table(AgeRestrictions::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(AgeRestrictions::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(AgeRestrictions::Age).integer().not_null())
					.col(
						ColumnDef::new(AgeRestrictions::RestrictOnUnset)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(AgeRestrictions::UserId)
							.text()
							.not_null()
							.unique_key(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-age_restrictions-user")
							.from(AgeRestrictions::Table, AgeRestrictions::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create api_keys table (references users)
		manager
			.create_table(
				Table::create()
					.table(ApiKeys::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ApiKeys::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(ApiKeys::Name).text().not_null())
					.col(ColumnDef::new(ApiKeys::ShortToken).text().not_null())
					.col(ColumnDef::new(ApiKeys::LongTokenHash).text().not_null())
					.col(ColumnDef::new(ApiKeys::Permissions).json())
					.col(
						ColumnDef::new(ApiKeys::CreatedAt)
							.date_time()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(ColumnDef::new(ApiKeys::LastUsedAt).date_time())
					.col(ColumnDef::new(ApiKeys::ExpiresAt).date_time())
					.col(ColumnDef::new(ApiKeys::UserId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-api_keys-user")
							.from(ApiKeys::Table, ApiKeys::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create tags table
		manager
			.create_table(
				Table::create()
					.table(Tags::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(Tags::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(Tags::Name).text().not_null().unique_key())
					.to_owned(),
			)
			.await?;

		// Create book_clubs table (no dependencies)
		manager
			.create_table(
				Table::create()
					.table(BookClubs::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(BookClubs::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(BookClubs::Name).text().not_null())
					.col(
						ColumnDef::new(BookClubs::Slug)
							.text()
							.not_null()
							.unique_key(),
					)
					.col(ColumnDef::new(BookClubs::Description).text())
					.col(ColumnDef::new(BookClubs::IsPrivate).boolean().not_null())
					.col(ColumnDef::new(BookClubs::MemberRoleSpec).json())
					.col(ColumnDef::new(BookClubs::CreatedAt).date_time().not_null())
					.col(ColumnDef::new(BookClubs::Emoji).text())
					.to_owned(),
			)
			.await?;

		// Create emailers table (no dependencies)
		manager
			.create_table(
				Table::create()
					.table(Emailers::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(Emailers::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(Emailers::Name)
							.text()
							.not_null()
							.unique_key(),
					)
					.col(ColumnDef::new(Emailers::IsPrimary).boolean().not_null())
					.col(ColumnDef::new(Emailers::SenderEmail).text().not_null())
					.col(
						ColumnDef::new(Emailers::SenderDisplayName)
							.text()
							.not_null(),
					)
					.col(ColumnDef::new(Emailers::Username).text().not_null())
					.col(
						ColumnDef::new(Emailers::EncryptedPassword)
							.text()
							.not_null(),
					)
					.col(ColumnDef::new(Emailers::SmtpHost).text().not_null())
					.col(ColumnDef::new(Emailers::SmtpPort).integer().not_null())
					.col(ColumnDef::new(Emailers::TlsEnabled).boolean().not_null())
					.col(ColumnDef::new(Emailers::MaxAttachmentSizeBytes).integer())
					.col(ColumnDef::new(Emailers::MaxNumAttachments).integer())
					.col(ColumnDef::new(Emailers::LastUsedAt).date_time())
					.to_owned(),
			)
			.await?;

		// Create jobs table (no dependencies)
		manager
			.create_table(
				Table::create()
					.table(Jobs::Table)
					.if_not_exists()
					.col(ColumnDef::new(Jobs::Id).text().not_null().primary_key())
					.col(ColumnDef::new(Jobs::Name).text().not_null())
					.col(ColumnDef::new(Jobs::Description).text())
					.col(ColumnDef::new(Jobs::Status).text().not_null())
					.col(ColumnDef::new(Jobs::SaveState).blob())
					.col(ColumnDef::new(Jobs::OutputData).blob())
					.col(ColumnDef::new(Jobs::MsElapsed).big_integer().not_null())
					.col(ColumnDef::new(Jobs::CreatedAt).date_time().not_null())
					.col(ColumnDef::new(Jobs::CompletedAt).date_time())
					.to_owned(),
			)
			.await?;

		// Create server_config table
		manager
			.create_table(
				Table::create()
					.table(ServerConfig::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ServerConfig::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(ServerConfig::PublicUrl).text())
					.col(
						ColumnDef::new(ServerConfig::InitialWalSetupComplete)
							.boolean()
							.not_null(),
					)
					.col(ColumnDef::new(ServerConfig::EncryptionKey).text())
					.to_owned(),
			)
			.await?;

		// Create notifiers table (no dependencies)
		manager
			.create_table(
				Table::create()
					.table(Notifiers::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(Notifiers::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(Notifiers::Type).text().not_null())
					.col(ColumnDef::new(Notifiers::Config).blob().not_null())
					.to_owned(),
			)
			.await?;

		// Create registered_email_devices table (no dependencies)
		manager
			.create_table(
				Table::create()
					.table(RegisteredEmailDevices::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(RegisteredEmailDevices::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(RegisteredEmailDevices::Name)
							.text()
							.not_null()
							.unique_key(),
					)
					.col(
						ColumnDef::new(RegisteredEmailDevices::Email)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(RegisteredEmailDevices::Forbidden)
							.boolean()
							.not_null(),
					)
					.to_owned(),
			)
			.await?;

		// Create registered_reading_devices table (no dependencies)
		manager
			.create_table(
				Table::create()
					.table(RegisteredReadingDevices::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(RegisteredReadingDevices::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(RegisteredReadingDevices::Name)
							.text()
							.not_null()
							.unique_key(),
					)
					.col(ColumnDef::new(RegisteredReadingDevices::Kind).text())
					.to_owned(),
			)
			.await?;

		// Create scheduled_job_configs table (no dependencies)
		manager
			.create_table(
				Table::create()
					.table(ScheduledJobConfigs::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ScheduledJobConfigs::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(ScheduledJobConfigs::IntervalSecs)
							.integer()
							.not_null(),
					)
					.to_owned(),
			)
			.await?;

		// Create server_invitations table (no dependencies)
		manager
			.create_table(
				Table::create()
					.table(ServerInvitations::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ServerInvitations::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(ServerInvitations::Secret).text().not_null())
					.col(ColumnDef::new(ServerInvitations::Email).text())
					.col(ColumnDef::new(ServerInvitations::GrantedPermissions).text())
					.col(
						ColumnDef::new(ServerInvitations::CreatedAt)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(ServerInvitations::ExpiresAt)
							.date_time()
							.not_null(),
					)
					.to_owned(),
			)
			.await?;

		// Create library_configs table first (referenced by libraries)
		manager
			.create_table(
				Table::create()
					.table(LibraryConfigs::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(LibraryConfigs::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(LibraryConfigs::ConvertRarToZip)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(LibraryConfigs::HardDeleteConversions)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(LibraryConfigs::DefaultReadingDir)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(LibraryConfigs::DefaultReadingMode)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(LibraryConfigs::DefaultReadingImageScaleFit)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(LibraryConfigs::GenerateFileHashes)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(LibraryConfigs::GenerateKoreaderHashes)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(LibraryConfigs::ProcessMetadata)
							.boolean()
							.not_null(),
					)
					.col(ColumnDef::new(LibraryConfigs::Watch).boolean().not_null())
					.col(
						ColumnDef::new(LibraryConfigs::LibraryPattern)
							.text()
							.not_null(),
					)
					.col(ColumnDef::new(LibraryConfigs::ThumbnailConfig).json())
					.col(ColumnDef::new(LibraryConfigs::IgnoreRules).json())
					.col(ColumnDef::new(LibraryConfigs::LibraryId).text())
					.to_owned(),
			)
			.await?;

		// Create libraries table
		manager
			.create_table(
				Table::create()
					.table(Libraries::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(Libraries::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(Libraries::Name)
							.text()
							.not_null()
							.unique_key(),
					)
					.col(ColumnDef::new(Libraries::Description).text())
					.col(
						ColumnDef::new(Libraries::Path)
							.text()
							.not_null()
							.unique_key(),
					)
					.col(ColumnDef::new(Libraries::Status).text().not_null())
					.col(ColumnDef::new(Libraries::CreatedAt).date_time().not_null())
					.col(ColumnDef::new(Libraries::UpdatedAt).date_time())
					.col(ColumnDef::new(Libraries::Emoji).text())
					.col(ColumnDef::new(Libraries::ConfigId).integer().not_null())
					.col(ColumnDef::new(Libraries::LastScannedAt).date_time())
					.foreign_key(
						ForeignKey::create()
							.name("fk-libraries-config")
							.from(Libraries::Table, Libraries::ConfigId)
							.to(LibraryConfigs::Table, LibraryConfigs::Id)
							.on_delete(ForeignKeyAction::Restrict)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create series table
		manager
			.create_table(
				Table::create()
					.table(Series::Table)
					.if_not_exists()
					.col(ColumnDef::new(Series::Id).text().not_null().primary_key())
					.col(ColumnDef::new(Series::Name).text().not_null())
					.col(ColumnDef::new(Series::Description).text())
					.col(ColumnDef::new(Series::CreatedAt).date_time().not_null())
					.col(ColumnDef::new(Series::UpdatedAt).date_time())
					.col(ColumnDef::new(Series::DeletedAt).date_time())
					.col(ColumnDef::new(Series::Path).text().not_null())
					.col(ColumnDef::new(Series::Status).text().not_null())
					.col(ColumnDef::new(Series::LibraryId).text())
					.foreign_key(
						ForeignKey::create()
							.name("fk-series-library")
							.from(Series::Table, Series::LibraryId)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create media table
		manager
			.create_table(
				Table::create()
					.table(Media::Table)
					.if_not_exists()
					.col(ColumnDef::new(Media::Id).text().not_null().primary_key())
					.col(ColumnDef::new(Media::Name).text().not_null())
					.col(ColumnDef::new(Media::Size).big_integer().not_null())
					.col(ColumnDef::new(Media::Extension).text().not_null())
					.col(ColumnDef::new(Media::Pages).integer().not_null())
					.col(ColumnDef::new(Media::UpdatedAt).date_time())
					.col(ColumnDef::new(Media::CreatedAt).date_time().not_null())
					.col(ColumnDef::new(Media::ModifiedAt).date_time())
					.col(ColumnDef::new(Media::Hash).text())
					.col(ColumnDef::new(Media::KoreaderHash).text())
					.col(ColumnDef::new(Media::Path).text().not_null())
					.col(ColumnDef::new(Media::Status).text().not_null())
					.col(ColumnDef::new(Media::SeriesId).text())
					.col(ColumnDef::new(Media::DeletedAt).date_time())
					.foreign_key(
						ForeignKey::create()
							.name("fk-media-series")
							.from(Media::Table, Media::SeriesId)
							.to(Series::Table, Series::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create bookmarks table (references media, users)
		manager
			.create_table(
				Table::create()
					.table(Bookmarks::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(Bookmarks::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(Bookmarks::PreviewContent).text())
					.col(ColumnDef::new(Bookmarks::Locator).json())
					.col(ColumnDef::new(Bookmarks::Epubcfi).text())
					.col(ColumnDef::new(Bookmarks::Page).integer())
					.col(ColumnDef::new(Bookmarks::MediaId).text().not_null())
					.col(ColumnDef::new(Bookmarks::UserId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-bookmarks-media")
							.from(Bookmarks::Table, Bookmarks::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-bookmarks-user")
							.from(Bookmarks::Table, Bookmarks::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create refresh_tokens table (references users)
		manager
			.create_table(
				Table::create()
					.table(RefreshTokens::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(RefreshTokens::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(RefreshTokens::UserId).text().not_null())
					.col(
						ColumnDef::new(RefreshTokens::CreatedAt)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(RefreshTokens::ExpiresAt)
							.date_time()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-refresh_tokens-user")
							.from(RefreshTokens::Table, RefreshTokens::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create sessions table (references users)
		manager
			.create_table(
				Table::create()
					.table(Sessions::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(Sessions::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(Sessions::SessionId).string().not_null())
					.col(ColumnDef::new(Sessions::UserId).string().not_null())
					.col(ColumnDef::new(Sessions::CreatedAt).date_time().not_null())
					.col(ColumnDef::new(Sessions::ExpiryTime).date_time().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-sessions-user")
							.from(Sessions::Table, Sessions::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create user_login_activity table (references users)
		manager
			.create_table(
				Table::create()
					.table(UserLoginActivity::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(UserLoginActivity::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(UserLoginActivity::IpAddress)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserLoginActivity::UserAgent)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserLoginActivity::AuthenticationSuccessful)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(UserLoginActivity::Timestamp)
							.date_time()
							.not_null(),
					)
					.col(ColumnDef::new(UserLoginActivity::UserId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-user_login_activity-user")
							.from(UserLoginActivity::Table, UserLoginActivity::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create favorite_libraries table (references users, libraries) - compound PK
		manager
			.create_table(
				Table::create()
					.table(FavoriteLibraries::Table)
					.if_not_exists()
					.col(ColumnDef::new(FavoriteLibraries::UserId).text().not_null())
					.col(
						ColumnDef::new(FavoriteLibraries::LibraryId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(FavoriteLibraries::FavoritedAt)
							.date_time()
							.not_null(),
					)
					.primary_key(
						Index::create()
							.name("pk-favorite_libraries")
							.col(FavoriteLibraries::UserId)
							.col(FavoriteLibraries::LibraryId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-favorite_libraries-user")
							.from(FavoriteLibraries::Table, FavoriteLibraries::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-favorite_libraries-library")
							.from(FavoriteLibraries::Table, FavoriteLibraries::LibraryId)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create favorite_media table (references users, media) - compound PK
		manager
			.create_table(
				Table::create()
					.table(FavoriteMedia::Table)
					.if_not_exists()
					.col(ColumnDef::new(FavoriteMedia::UserId).text().not_null())
					.col(ColumnDef::new(FavoriteMedia::MediaId).text().not_null())
					.col(
						ColumnDef::new(FavoriteMedia::FavoritedAt)
							.date_time()
							.not_null(),
					)
					.primary_key(
						Index::create()
							.name("pk-favorite_media")
							.col(FavoriteMedia::UserId)
							.col(FavoriteMedia::MediaId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-favorite_media-user")
							.from(FavoriteMedia::Table, FavoriteMedia::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-favorite_media-media")
							.from(FavoriteMedia::Table, FavoriteMedia::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create favorite_series table (references users, series) - compound PK
		manager
			.create_table(
				Table::create()
					.table(FavoriteSeries::Table)
					.if_not_exists()
					.col(ColumnDef::new(FavoriteSeries::UserId).text().not_null())
					.col(ColumnDef::new(FavoriteSeries::SeriesId).text().not_null())
					.col(
						ColumnDef::new(FavoriteSeries::FavoritedAt)
							.date_time()
							.not_null(),
					)
					.primary_key(
						Index::create()
							.name("pk-favorite_series")
							.col(FavoriteSeries::UserId)
							.col(FavoriteSeries::SeriesId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-favorite_series-user")
							.from(FavoriteSeries::Table, FavoriteSeries::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-favorite_series-series")
							.from(FavoriteSeries::Table, FavoriteSeries::SeriesId)
							.to(Series::Table, Series::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create library_exclusions table (references libraries, users)
		manager
			.create_table(
				Table::create()
					.table(LibraryExclusions::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(LibraryExclusions::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(LibraryExclusions::UserId).text().not_null())
					.col(
						ColumnDef::new(LibraryExclusions::LibraryId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_exclusions-library")
							.from(LibraryExclusions::Table, LibraryExclusions::LibraryId)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_exclusions-user")
							.from(LibraryExclusions::Table, LibraryExclusions::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create library_tags table (references libraries, tags)
		manager
			.create_table(
				Table::create()
					.table(LibraryTags::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(LibraryTags::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(LibraryTags::LibraryId).text().not_null())
					.col(ColumnDef::new(LibraryTags::TagId).integer().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_tags-library")
							.from(LibraryTags::Table, LibraryTags::LibraryId)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_tags-tag")
							.from(LibraryTags::Table, LibraryTags::TagId)
							.to(Tags::Table, Tags::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create media_tags table (references media, tags)
		manager
			.create_table(
				Table::create()
					.table(MediaTags::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(MediaTags::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(MediaTags::MediaId).text().not_null())
					.col(ColumnDef::new(MediaTags::TagId).integer().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_tags-media")
							.from(MediaTags::Table, MediaTags::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_tags-tag")
							.from(MediaTags::Table, MediaTags::TagId)
							.to(Tags::Table, Tags::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create series_tags table (references series, tags)
		manager
			.create_table(
				Table::create()
					.table(SeriesTags::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(SeriesTags::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(SeriesTags::SeriesId).text().not_null())
					.col(ColumnDef::new(SeriesTags::TagId).integer().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-series_tags-series")
							.from(SeriesTags::Table, SeriesTags::SeriesId)
							.to(Series::Table, Series::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-series_tags-tag")
							.from(SeriesTags::Table, SeriesTags::TagId)
							.to(Tags::Table, Tags::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create last_library_visits table (references libraries, users)
		manager
			.create_table(
				Table::create()
					.table(LastLibraryVisits::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(LastLibraryVisits::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(LastLibraryVisits::UserId).text().not_null())
					.col(
						ColumnDef::new(LastLibraryVisits::LibraryId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(LastLibraryVisits::Timestamp)
							.date_time()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-last_library_visits-library")
							.from(LastLibraryVisits::Table, LastLibraryVisits::LibraryId)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-last_library_visits-user")
							.from(LastLibraryVisits::Table, LastLibraryVisits::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create reviews table (references media, users)
		manager
			.create_table(
				Table::create()
					.table(Reviews::Table)
					.if_not_exists()
					.col(ColumnDef::new(Reviews::Id).text().not_null().primary_key())
					.col(ColumnDef::new(Reviews::Rating).integer().not_null())
					.col(ColumnDef::new(Reviews::Content).text())
					.col(ColumnDef::new(Reviews::IsPrivate).boolean().not_null())
					.col(ColumnDef::new(Reviews::MediaId).text().not_null())
					.col(ColumnDef::new(Reviews::UserId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-reviews-media")
							.from(Reviews::Table, Reviews::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-reviews-user")
							.from(Reviews::Table, Reviews::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create logs table (references jobs)
		manager
			.create_table(
				Table::create()
					.table(Logs::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(Logs::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(Logs::Level).text().not_null())
					.col(ColumnDef::new(Logs::Message).text().not_null())
					.col(ColumnDef::new(Logs::Timestamp).date_time().not_null())
					.col(ColumnDef::new(Logs::JobId).text())
					.col(ColumnDef::new(Logs::Context).text())
					.foreign_key(
						ForeignKey::create()
							.name("fk-logs-job")
							.from(Logs::Table, Logs::JobId)
							.to(Jobs::Table, Jobs::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create emailer_send_records table (references emailers, users)
		manager
			.create_table(
				Table::create()
					.table(EmailerSendRecords::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(EmailerSendRecords::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(EmailerSendRecords::EmailerId)
							.integer()
							.not_null(),
					)
					.col(
						ColumnDef::new(EmailerSendRecords::RecipientEmail)
							.text()
							.not_null(),
					)
					.col(ColumnDef::new(EmailerSendRecords::AttachmentMeta).blob())
					.col(
						ColumnDef::new(EmailerSendRecords::SentAt)
							.date_time()
							.not_null(),
					)
					.col(ColumnDef::new(EmailerSendRecords::SentByUserId).text())
					.foreign_key(
						ForeignKey::create()
							.name("fk-emailer_send_records-emailer")
							.from(
								EmailerSendRecords::Table,
								EmailerSendRecords::EmailerId,
							)
							.to(Emailers::Table, Emailers::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-emailer_send_records-user")
							.from(
								EmailerSendRecords::Table,
								EmailerSendRecords::SentByUserId,
							)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create library_scan_records table (references jobs, libraries)
		manager
			.create_table(
				Table::create()
					.table(LibraryScanRecords::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(LibraryScanRecords::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(LibraryScanRecords::Options).blob())
					.col(
						ColumnDef::new(LibraryScanRecords::Timestamp)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(LibraryScanRecords::LibraryId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(LibraryScanRecords::JobId)
							.text()
							.unique_key(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_scan_records-job")
							.from(LibraryScanRecords::Table, LibraryScanRecords::JobId)
							.to(Jobs::Table, Jobs::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_scan_records-library")
							.from(
								LibraryScanRecords::Table,
								LibraryScanRecords::LibraryId,
							)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create scheduled_job_libraries table (references scheduled_job_configs, libraries)
		manager
			.create_table(
				Table::create()
					.table(ScheduledJobLibraries::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ScheduledJobLibraries::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(ScheduledJobLibraries::ScheduleId)
							.integer()
							.not_null(),
					)
					.col(
						ColumnDef::new(ScheduledJobLibraries::LibraryId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-scheduled_job_libraries-library")
							.from(
								ScheduledJobLibraries::Table,
								ScheduledJobLibraries::LibraryId,
							)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-scheduled_job_libraries-schedule")
							.from(
								ScheduledJobLibraries::Table,
								ScheduledJobLibraries::ScheduleId,
							)
							.to(ScheduledJobConfigs::Table, ScheduledJobConfigs::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create media_annotations table (references media, users)
		manager
			.create_table(
				Table::create()
					.table(MediaAnnotations::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(MediaAnnotations::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(MediaAnnotations::HighlightedText).text())
					.col(ColumnDef::new(MediaAnnotations::Epubcfi).text())
					.col(ColumnDef::new(MediaAnnotations::Page).integer())
					.col(ColumnDef::new(MediaAnnotations::PageCoordinatesX).float())
					.col(ColumnDef::new(MediaAnnotations::PageCoordinatesY).float())
					.col(ColumnDef::new(MediaAnnotations::Notes).text())
					.col(ColumnDef::new(MediaAnnotations::UserId).text().not_null())
					.col(ColumnDef::new(MediaAnnotations::MediaId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_annotations-media")
							.from(MediaAnnotations::Table, MediaAnnotations::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_annotations-user")
							.from(MediaAnnotations::Table, MediaAnnotations::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create media_metadata table (references media) - needs unique index on media_id
		manager
			.create_table(
				Table::create()
					.table(MediaMetadata::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(MediaMetadata::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(MediaMetadata::MediaId).text().unique_key())
					.col(ColumnDef::new(MediaMetadata::AgeRating).integer())
					.col(ColumnDef::new(MediaMetadata::Characters).text())
					.col(ColumnDef::new(MediaMetadata::Colorists).text())
					.col(ColumnDef::new(MediaMetadata::CoverArtists).text())
					.col(ColumnDef::new(MediaMetadata::Day).integer())
					.col(ColumnDef::new(MediaMetadata::Editors).text())
					.col(ColumnDef::new(MediaMetadata::Genres).text())
					.col(ColumnDef::new(MediaMetadata::IdentifierAmazon).text())
					.col(ColumnDef::new(MediaMetadata::IdentifierCalibre).text())
					.col(ColumnDef::new(MediaMetadata::IdentifierGoogle).text())
					.col(ColumnDef::new(MediaMetadata::IdentifierIsbn).text())
					.col(ColumnDef::new(MediaMetadata::IdentifierMobiAsin).text())
					.col(ColumnDef::new(MediaMetadata::IdentifierUuid).text())
					.col(ColumnDef::new(MediaMetadata::Inkers).text())
					.col(ColumnDef::new(MediaMetadata::Language).text())
					.col(ColumnDef::new(MediaMetadata::Letterers).text())
					.col(ColumnDef::new(MediaMetadata::Links).text())
					.col(ColumnDef::new(MediaMetadata::Month).integer())
					.col(ColumnDef::new(MediaMetadata::Notes).text())
					.col(ColumnDef::new(MediaMetadata::Number).float())
					.col(ColumnDef::new(MediaMetadata::PageCount).integer())
					.col(ColumnDef::new(MediaMetadata::Pencillers).text())
					.col(ColumnDef::new(MediaMetadata::Publisher).text())
					.col(ColumnDef::new(MediaMetadata::Series).text())
					.col(ColumnDef::new(MediaMetadata::Summary).text())
					.col(ColumnDef::new(MediaMetadata::Teams).text())
					.col(ColumnDef::new(MediaMetadata::Title).text())
					.col(ColumnDef::new(MediaMetadata::TitleSort).text())
					.col(ColumnDef::new(MediaMetadata::Volume).integer())
					.col(ColumnDef::new(MediaMetadata::Writers).text())
					.col(ColumnDef::new(MediaMetadata::Year).integer())
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_metadata-media")
							.from(MediaMetadata::Table, MediaMetadata::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create unique index on media_metadata.media_id
		manager
			.create_index(
				Index::create()
					.unique()
					.name("media_metadata_media_id_idx")
					.table(MediaMetadata::Table)
					.col(MediaMetadata::MediaId)
					.to_owned(),
			)
			.await?;

		// Create page_analysis table (references media) - unique constraint on media_id
		manager
			.create_table(
				Table::create()
					.table(PageAnalysis::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(PageAnalysis::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(PageAnalysis::Data).json().not_null())
					.col(
						ColumnDef::new(PageAnalysis::MediaId)
							.text()
							.not_null()
							.unique_key(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-page_analysis-media")
							.from(PageAnalysis::Table, PageAnalysis::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create series_metadata table (references series) - needs unique index on series_id
		manager
			.create_table(
				Table::create()
					.table(SeriesMetadata::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(SeriesMetadata::SeriesId)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(SeriesMetadata::AgeRating).integer())
					.col(ColumnDef::new(SeriesMetadata::Characters).text())
					.col(ColumnDef::new(SeriesMetadata::Booktype).text())
					.col(ColumnDef::new(SeriesMetadata::Comicid).integer())
					.col(ColumnDef::new(SeriesMetadata::Genres).text())
					.col(ColumnDef::new(SeriesMetadata::Imprint).text())
					.col(ColumnDef::new(SeriesMetadata::Links).text())
					.col(ColumnDef::new(SeriesMetadata::MetaType).text())
					.col(ColumnDef::new(SeriesMetadata::Publisher).text())
					.col(ColumnDef::new(SeriesMetadata::Status).text())
					.col(ColumnDef::new(SeriesMetadata::Summary).text())
					.col(ColumnDef::new(SeriesMetadata::Title).text())
					.col(ColumnDef::new(SeriesMetadata::Volume).integer())
					.col(ColumnDef::new(SeriesMetadata::Writers).text())
					.foreign_key(
						ForeignKey::create()
							.name("fk-series_metadata-series")
							.from(SeriesMetadata::Table, SeriesMetadata::SeriesId)
							.to(Series::Table, Series::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create unique index on series_metadata.series_id
		manager
			.create_index(
				Index::create()
					.unique()
					.name("series_metadata_series_id_idx")
					.table(SeriesMetadata::Table)
					.col(SeriesMetadata::SeriesId)
					.to_owned(),
			)
			.await?;

		// Create reading_sessions table (references media, registered_reading_devices, users) - needs unique index on media_id + user_id
		manager
			.create_table(
				Table::create()
					.table(ReadingSessions::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ReadingSessions::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(ReadingSessions::Page).integer())
					.col(ColumnDef::new(ReadingSessions::PercentageCompleted).float())
					.col(ColumnDef::new(ReadingSessions::Locator).json())
					.col(ColumnDef::new(ReadingSessions::Epubcfi).text())
					.col(ColumnDef::new(ReadingSessions::KoreaderProgress).text())
					.col(
						ColumnDef::new(ReadingSessions::StartedAt)
							.date_time()
							.not_null(),
					)
					.col(ColumnDef::new(ReadingSessions::UpdatedAt).date_time())
					.col(ColumnDef::new(ReadingSessions::MediaId).text().not_null())
					.col(ColumnDef::new(ReadingSessions::UserId).text().not_null())
					.col(ColumnDef::new(ReadingSessions::DeviceId).text())
					.col(ColumnDef::new(ReadingSessions::ElapsedSeconds).big_integer())
					.foreign_key(
						ForeignKey::create()
							.name("fk-reading_sessions-media")
							.from(ReadingSessions::Table, ReadingSessions::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-reading_sessions-device")
							.from(ReadingSessions::Table, ReadingSessions::DeviceId)
							.to(
								RegisteredReadingDevices::Table,
								RegisteredReadingDevices::Id,
							)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-reading_sessions-user")
							.from(ReadingSessions::Table, ReadingSessions::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create unique index on reading_sessions.media_id + user_id
		manager
			.create_index(
				Index::create()
					.unique()
					.name("reading_session_media_id_user_id_idx")
					.table(ReadingSessions::Table)
					.col(ReadingSessions::MediaId)
					.col(ReadingSessions::UserId)
					.to_owned(),
			)
			.await?;

		// Create finished_reading_sessions table (references media, registered_reading_devices, users)
		manager
			.create_table(
				Table::create()
					.table(FinishedReadingSessions::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(FinishedReadingSessions::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessions::StartedAt)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessions::CompletedAt)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessions::MediaId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessions::UserId)
							.text()
							.not_null(),
					)
					.col(ColumnDef::new(FinishedReadingSessions::DeviceId).text())
					.col(
						ColumnDef::new(FinishedReadingSessions::ElapsedSeconds)
							.big_integer(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-finished_reading_sessions-media")
							.from(
								FinishedReadingSessions::Table,
								FinishedReadingSessions::MediaId,
							)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-finished_reading_sessions-device")
							.from(
								FinishedReadingSessions::Table,
								FinishedReadingSessions::DeviceId,
							)
							.to(
								RegisteredReadingDevices::Table,
								RegisteredReadingDevices::Id,
							)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-finished_reading_sessions-user")
							.from(
								FinishedReadingSessions::Table,
								FinishedReadingSessions::UserId,
							)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create smart_lists table (references users)
		manager
			.create_table(
				Table::create()
					.table(SmartLists::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(SmartLists::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(SmartLists::Name).text().not_null())
					.col(ColumnDef::new(SmartLists::Description).text())
					.col(ColumnDef::new(SmartLists::Filters).blob().not_null())
					.col(ColumnDef::new(SmartLists::Joiner).text().not_null())
					.col(
						ColumnDef::new(SmartLists::DefaultGrouping)
							.text()
							.not_null(),
					)
					.col(ColumnDef::new(SmartLists::Visibility).text().not_null())
					.col(ColumnDef::new(SmartLists::CreatorId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-smart_lists-user")
							.from(SmartLists::Table, SmartLists::CreatorId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create smart_list_access_rules table (references smart_lists, users)
		manager
			.create_table(
				Table::create()
					.table(SmartListAccessRules::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(SmartListAccessRules::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(SmartListAccessRules::Role)
							.string()
							.not_null(),
					)
					.col(
						ColumnDef::new(SmartListAccessRules::UserId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(SmartListAccessRules::SmartListId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-smart_list_access_rules-smart_list")
							.from(
								SmartListAccessRules::Table,
								SmartListAccessRules::SmartListId,
							)
							.to(SmartLists::Table, SmartLists::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-smart_list_access_rules-user")
							.from(
								SmartListAccessRules::Table,
								SmartListAccessRules::UserId,
							)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create smart_list_views table (references smart_lists)
		manager
			.create_table(
				Table::create()
					.table(SmartListViews::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(SmartListViews::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(SmartListViews::Name).text().not_null())
					.col(ColumnDef::new(SmartListViews::ListId).text().not_null())
					.col(ColumnDef::new(SmartListViews::Data).blob().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-smart_list_views-smart_list")
							.from(SmartListViews::Table, SmartListViews::ListId)
							.to(SmartLists::Table, SmartLists::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create book_club_schedules table (references book_clubs)
		manager
			.create_table(
				Table::create()
					.table(BookClubSchedules::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(BookClubSchedules::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(BookClubSchedules::DefaultIntervalDays).integer())
					.col(
						ColumnDef::new(BookClubSchedules::BookClubId)
							.string()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_schedules-book_club")
							.from(BookClubSchedules::Table, BookClubSchedules::BookClubId)
							.to(BookClubs::Table, BookClubs::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create book_club_members table (references book_clubs, users)
		manager
			.create_table(
				Table::create()
					.table(BookClubMembers::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(BookClubMembers::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(BookClubMembers::DisplayName).text())
					.col(
						ColumnDef::new(BookClubMembers::IsCreator)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(BookClubMembers::HideProgress)
							.boolean()
							.not_null(),
					)
					.col(
						ColumnDef::new(BookClubMembers::PrivateMembership)
							.boolean()
							.not_null(),
					)
					.col(ColumnDef::new(BookClubMembers::Role).integer().not_null())
					.col(ColumnDef::new(BookClubMembers::UserId).text().not_null())
					.col(
						ColumnDef::new(BookClubMembers::BookClubId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_members-book_club")
							.from(BookClubMembers::Table, BookClubMembers::BookClubId)
							.to(BookClubs::Table, BookClubs::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_members-user")
							.from(BookClubMembers::Table, BookClubMembers::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create book_club_invitations table (references book_clubs, users)
		manager
			.create_table(
				Table::create()
					.table(BookClubInvitations::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(BookClubInvitations::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(BookClubInvitations::Role)
							.integer()
							.not_null(),
					)
					.col(
						ColumnDef::new(BookClubInvitations::UserId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(BookClubInvitations::BookClubId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_invitations-book_club")
							.from(
								BookClubInvitations::Table,
								BookClubInvitations::BookClubId,
							)
							.to(BookClubs::Table, BookClubs::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_invitations-user")
							.from(BookClubInvitations::Table, BookClubInvitations::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create book_club_member_favorite_books table (references book_club_members, media)
		manager
			.create_table(
				Table::create()
					.table(BookClubMemberFavoriteBooks::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(BookClubMemberFavoriteBooks::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(BookClubMemberFavoriteBooks::Title).text())
					.col(ColumnDef::new(BookClubMemberFavoriteBooks::Author).text())
					.col(ColumnDef::new(BookClubMemberFavoriteBooks::Url).text())
					.col(ColumnDef::new(BookClubMemberFavoriteBooks::Notes).text())
					.col(
						ColumnDef::new(BookClubMemberFavoriteBooks::MemberId)
							.text()
							.not_null()
							.unique_key(),
					)
					.col(ColumnDef::new(BookClubMemberFavoriteBooks::BookId).text())
					.col(ColumnDef::new(BookClubMemberFavoriteBooks::ImageUrl).text())
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_member_favorite_books-member")
							.from(
								BookClubMemberFavoriteBooks::Table,
								BookClubMemberFavoriteBooks::MemberId,
							)
							.to(BookClubMembers::Table, BookClubMembers::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_member_favorite_books-book")
							.from(
								BookClubMemberFavoriteBooks::Table,
								BookClubMemberFavoriteBooks::BookId,
							)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create book_club_book_suggestions table (references book_club_members, media)
		manager
			.create_table(
				Table::create()
					.table(BookClubBookSuggestions::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(BookClubBookSuggestions::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(BookClubBookSuggestions::Title).text())
					.col(ColumnDef::new(BookClubBookSuggestions::Author).text())
					.col(ColumnDef::new(BookClubBookSuggestions::Url).text())
					.col(ColumnDef::new(BookClubBookSuggestions::Notes).text())
					.col(
						ColumnDef::new(BookClubBookSuggestions::SuggestedById)
							.text()
							.not_null(),
					)
					.col(ColumnDef::new(BookClubBookSuggestions::BookId).text())
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_book_suggestions-member")
							.from(
								BookClubBookSuggestions::Table,
								BookClubBookSuggestions::SuggestedById,
							)
							.to(BookClubMembers::Table, BookClubMembers::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_book_suggestions-book")
							.from(
								BookClubBookSuggestions::Table,
								BookClubBookSuggestions::BookId,
							)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create book_club_books table (references book_club_schedules, media)
		manager
			.create_table(
				Table::create()
					.table(BookClubBooks::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(BookClubBooks::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(BookClubBooks::StartAt)
							.date_time()
							.not_null(),
					)
					.col(ColumnDef::new(BookClubBooks::EndAt).date_time().not_null())
					.col(ColumnDef::new(BookClubBooks::DiscussionDurationDays).integer())
					.col(ColumnDef::new(BookClubBooks::Title).text())
					.col(ColumnDef::new(BookClubBooks::Author).text())
					.col(ColumnDef::new(BookClubBooks::Url).text())
					.col(ColumnDef::new(BookClubBooks::ImageUrl).text())
					.col(ColumnDef::new(BookClubBooks::BookEntityId).text())
					.col(ColumnDef::new(BookClubBooks::BookClubScheduleId).integer())
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_books-schedule")
							.from(BookClubBooks::Table, BookClubBooks::BookClubScheduleId)
							.to(BookClubSchedules::Table, BookClubSchedules::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_books-book_entity")
							.from(BookClubBooks::Table, BookClubBooks::BookEntityId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create book_club_book_suggestion_likes table (references book_club_book_suggestions, book_club_members)
		manager
			.create_table(
				Table::create()
					.table(BookClubBookSuggestionLikes::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(BookClubBookSuggestionLikes::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(BookClubBookSuggestionLikes::SuggestionId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(BookClubBookSuggestionLikes::MemberId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_book_suggestion_likes-suggestion")
							.from(
								BookClubBookSuggestionLikes::Table,
								BookClubBookSuggestionLikes::SuggestionId,
							)
							.to(
								BookClubBookSuggestions::Table,
								BookClubBookSuggestions::Id,
							)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_book_suggestion_likes-member")
							.from(
								BookClubBookSuggestionLikes::Table,
								BookClubBookSuggestionLikes::MemberId,
							)
							.to(BookClubMembers::Table, BookClubMembers::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create book_club_discussions table (references book_club_books)
		manager
			.create_table(
				Table::create()
					.table(BookClubDiscussions::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(BookClubDiscussions::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(BookClubDiscussions::Title).text().not_null())
					.col(
						ColumnDef::new(BookClubDiscussions::BookId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_discussions-book")
							.from(BookClubDiscussions::Table, BookClubDiscussions::BookId)
							.to(BookClubBooks::Table, BookClubBooks::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create book_club_discussion_message table (references itself, book_club_discussions, book_club_members)
		manager
			.create_table(
				Table::create()
					.table(BookClubDiscussionMessage::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(BookClubDiscussionMessage::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(BookClubDiscussionMessage::Content)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(BookClubDiscussionMessage::CreatedAt)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(BookClubDiscussionMessage::UpdatedAt)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(BookClubDiscussionMessage::ParentMessageId).text(),
					)
					.col(
						ColumnDef::new(BookClubDiscussionMessage::DiscussionId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(BookClubDiscussionMessage::MemberId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_discussion_message-parent")
							.from(
								BookClubDiscussionMessage::Table,
								BookClubDiscussionMessage::ParentMessageId,
							)
							.to(
								BookClubDiscussionMessage::Table,
								BookClubDiscussionMessage::Id,
							)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_discussion_message-discussion")
							.from(
								BookClubDiscussionMessage::Table,
								BookClubDiscussionMessage::DiscussionId,
							)
							.to(BookClubDiscussions::Table, BookClubDiscussions::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_discussion_message-member")
							.from(
								BookClubDiscussionMessage::Table,
								BookClubDiscussionMessage::MemberId,
							)
							.to(BookClubMembers::Table, BookClubMembers::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create book_club_discussion_message_likes table (references book_club_discussion_message, book_club_members)
		manager
			.create_table(
				Table::create()
					.table(BookClubDiscussionMessageLikes::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(BookClubDiscussionMessageLikes::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(BookClubDiscussionMessageLikes::MessageId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(BookClubDiscussionMessageLikes::MemberId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_discussion_message_likes-message")
							.from(
								BookClubDiscussionMessageLikes::Table,
								BookClubDiscussionMessageLikes::MessageId,
							)
							.to(
								BookClubDiscussionMessage::Table,
								BookClubDiscussionMessage::Id,
							)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-book_club_discussion_message_likes-member")
							.from(
								BookClubDiscussionMessageLikes::Table,
								BookClubDiscussionMessageLikes::MemberId,
							)
							.to(BookClubMembers::Table, BookClubMembers::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create bookmarks table (references media, users)
		manager
			.create_table(
				Table::create()
					.table(Bookmarks::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(Bookmarks::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(Bookmarks::Page).integer().not_null())
					.col(ColumnDef::new(Bookmarks::PreviewContent).text())
					.col(ColumnDef::new(Bookmarks::Locator).text())
					.col(ColumnDef::new(Bookmarks::Epubcfi).text())
					.col(ColumnDef::new(Bookmarks::MediaId).text().not_null())
					.col(ColumnDef::new(Bookmarks::UserId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-bookmarks-media")
							.from(Bookmarks::Table, Bookmarks::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-bookmarks-user")
							.from(Bookmarks::Table, Bookmarks::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create emailer_send_records table (references emailers, users)
		manager
			.create_table(
				Table::create()
					.table(EmailerSendRecords::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(EmailerSendRecords::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(EmailerSendRecords::EmailerId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(EmailerSendRecords::RecipientEmail)
							.text()
							.not_null(),
					)
					.col(ColumnDef::new(EmailerSendRecords::AttachmentMeta).text())
					.col(ColumnDef::new(EmailerSendRecords::SentAt).date_time())
					.col(
						ColumnDef::new(EmailerSendRecords::SentByUserId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-emailer_send_records-emailer")
							.from(
								EmailerSendRecords::Table,
								EmailerSendRecords::EmailerId,
							)
							.to(Emailers::Table, Emailers::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-emailer_send_records-user")
							.from(
								EmailerSendRecords::Table,
								EmailerSendRecords::SentByUserId,
							)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create favorite_libraries table (references users, libraries) - compound PK
		manager
			.create_table(
				Table::create()
					.table(FavoriteLibraries::Table)
					.if_not_exists()
					.col(ColumnDef::new(FavoriteLibraries::UserId).text().not_null())
					.col(
						ColumnDef::new(FavoriteLibraries::LibraryId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(FavoriteLibraries::FavoritedAt)
							.date_time()
							.not_null(),
					)
					.primary_key(
						Index::create()
							.col(FavoriteLibraries::UserId)
							.col(FavoriteLibraries::LibraryId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-favorite_libraries-user")
							.from(FavoriteLibraries::Table, FavoriteLibraries::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-favorite_libraries-library")
							.from(FavoriteLibraries::Table, FavoriteLibraries::LibraryId)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create favorite_media table (references users, media) - compound PK
		manager
			.create_table(
				Table::create()
					.table(FavoriteMedia::Table)
					.if_not_exists()
					.col(ColumnDef::new(FavoriteMedia::UserId).text().not_null())
					.col(ColumnDef::new(FavoriteMedia::MediaId).text().not_null())
					.col(
						ColumnDef::new(FavoriteMedia::FavoritedAt)
							.date_time()
							.not_null(),
					)
					.primary_key(
						Index::create()
							.col(FavoriteMedia::UserId)
							.col(FavoriteMedia::MediaId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-favorite_media-user")
							.from(FavoriteMedia::Table, FavoriteMedia::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-favorite_media-media")
							.from(FavoriteMedia::Table, FavoriteMedia::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create favorite_series table (references users, series) - compound PK
		manager
			.create_table(
				Table::create()
					.table(FavoriteSeries::Table)
					.if_not_exists()
					.col(ColumnDef::new(FavoriteSeries::UserId).text().not_null())
					.col(ColumnDef::new(FavoriteSeries::SeriesId).text().not_null())
					.col(
						ColumnDef::new(FavoriteSeries::FavoritedAt)
							.date_time()
							.not_null(),
					)
					.primary_key(
						Index::create()
							.col(FavoriteSeries::UserId)
							.col(FavoriteSeries::SeriesId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-favorite_series-user")
							.from(FavoriteSeries::Table, FavoriteSeries::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-favorite_series-series")
							.from(FavoriteSeries::Table, FavoriteSeries::SeriesId)
							.to(Series::Table, Series::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create finished_reading_sessions table (references media, registered_reading_devices, users)
		manager
			.create_table(
				Table::create()
					.table(FinishedReadingSessions::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(FinishedReadingSessions::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessions::StartedAt)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessions::CompletedAt)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessions::ElapsedSeconds)
							.integer()
							.not_null(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessions::MediaId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessions::DeviceId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessions::UserId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-finished_reading_sessions-media")
							.from(
								FinishedReadingSessions::Table,
								FinishedReadingSessions::MediaId,
							)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-finished_reading_sessions-device")
							.from(
								FinishedReadingSessions::Table,
								FinishedReadingSessions::DeviceId,
							)
							.to(
								RegisteredReadingDevices::Table,
								RegisteredReadingDevices::Id,
							)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-finished_reading_sessions-user")
							.from(
								FinishedReadingSessions::Table,
								FinishedReadingSessions::UserId,
							)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create last_library_visits table (references libraries, users)
		manager
			.create_table(
				Table::create()
					.table(LastLibraryVisits::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(LastLibraryVisits::LibraryId)
							.text()
							.not_null(),
					)
					.col(ColumnDef::new(LastLibraryVisits::UserId).text().not_null())
					.col(
						ColumnDef::new(LastLibraryVisits::Timestamp)
							.date_time()
							.not_null(),
					)
					.primary_key(
						Index::create()
							.col(LastLibraryVisits::LibraryId)
							.col(LastLibraryVisits::UserId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-last_library_visits-library")
							.from(LastLibraryVisits::Table, LastLibraryVisits::LibraryId)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-last_library_visits-user")
							.from(LastLibraryVisits::Table, LastLibraryVisits::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create library_exclusions table (references libraries, users)
		manager
			.create_table(
				Table::create()
					.table(LibraryExclusions::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(LibraryExclusions::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(LibraryExclusions::LibraryId)
							.text()
							.not_null(),
					)
					.col(ColumnDef::new(LibraryExclusions::UserId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_exclusions-library")
							.from(LibraryExclusions::Table, LibraryExclusions::LibraryId)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_exclusions-user")
							.from(LibraryExclusions::Table, LibraryExclusions::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create library_scan_records table (references jobs, libraries)
		manager
			.create_table(
				Table::create()
					.table(LibraryScanRecords::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(LibraryScanRecords::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(LibraryScanRecords::Options)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(LibraryScanRecords::Timestamp)
							.date_time()
							.not_null(),
					)
					.col(ColumnDef::new(LibraryScanRecords::JobId).text().not_null())
					.col(
						ColumnDef::new(LibraryScanRecords::LibraryId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_scan_records-job")
							.from(LibraryScanRecords::Table, LibraryScanRecords::JobId)
							.to(Jobs::Table, Jobs::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_scan_records-library")
							.from(
								LibraryScanRecords::Table,
								LibraryScanRecords::LibraryId,
							)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create library_tags table (references libraries, tags)
		manager
			.create_table(
				Table::create()
					.table(LibraryTags::Table)
					.if_not_exists()
					.col(ColumnDef::new(LibraryTags::LibraryId).text().not_null())
					.col(ColumnDef::new(LibraryTags::TagId).text().not_null())
					.primary_key(
						Index::create()
							.col(LibraryTags::LibraryId)
							.col(LibraryTags::TagId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_tags-library")
							.from(LibraryTags::Table, LibraryTags::LibraryId)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_tags-tag")
							.from(LibraryTags::Table, LibraryTags::TagId)
							.to(Tags::Table, Tags::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create logs table (references jobs)
		manager
			.create_table(
				Table::create()
					.table(Logs::Table)
					.if_not_exists()
					.col(ColumnDef::new(Logs::Id).text().not_null().primary_key())
					.col(ColumnDef::new(Logs::Level).integer().not_null())
					.col(ColumnDef::new(Logs::Message).text().not_null())
					.col(ColumnDef::new(Logs::Timestamp).date_time().not_null())
					.col(ColumnDef::new(Logs::JobId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-logs-job")
							.from(Logs::Table, Logs::JobId)
							.to(Jobs::Table, Jobs::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create media_annotations table (references media, users)
		manager
			.create_table(
				Table::create()
					.table(MediaAnnotations::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(MediaAnnotations::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(MediaAnnotations::Page).integer().not_null())
					.col(ColumnDef::new(MediaAnnotations::HighlightedText).text())
					.col(ColumnDef::new(MediaAnnotations::Epubcfi).text())
					.col(ColumnDef::new(MediaAnnotations::PageCoordinatesX).float())
					.col(ColumnDef::new(MediaAnnotations::PageCoordinatesY).float())
					.col(ColumnDef::new(MediaAnnotations::Notes).text())
					.col(ColumnDef::new(MediaAnnotations::MediaId).text().not_null())
					.col(ColumnDef::new(MediaAnnotations::UserId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_annotations-media")
							.from(MediaAnnotations::Table, MediaAnnotations::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_annotations-user")
							.from(MediaAnnotations::Table, MediaAnnotations::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create media_metadata table (references media) - needs unique index on media_id
		manager
			.create_table(
				Table::create()
					.table(MediaMetadata::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(MediaMetadata::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(MediaMetadata::Title).text())
					.col(ColumnDef::new(MediaMetadata::TitleSort).text())
					.col(ColumnDef::new(MediaMetadata::Writers).text())
					.col(ColumnDef::new(MediaMetadata::Pencillers).text())
					.col(ColumnDef::new(MediaMetadata::Inkers).text())
					.col(ColumnDef::new(MediaMetadata::Colorists).text())
					.col(ColumnDef::new(MediaMetadata::CoverArtists).text())
					.col(ColumnDef::new(MediaMetadata::Letterers).text())
					.col(ColumnDef::new(MediaMetadata::Editors).text())
					.col(ColumnDef::new(MediaMetadata::Publisher).text())
					.col(ColumnDef::new(MediaMetadata::Summary).text())
					.col(ColumnDef::new(MediaMetadata::Genres).text())
					.col(ColumnDef::new(MediaMetadata::Series).text())
					.col(ColumnDef::new(MediaMetadata::Volume).text())
					.col(ColumnDef::new(MediaMetadata::Number).text())
					.col(ColumnDef::new(MediaMetadata::Year).integer())
					.col(ColumnDef::new(MediaMetadata::Month).integer())
					.col(ColumnDef::new(MediaMetadata::Day).integer())
					.col(ColumnDef::new(MediaMetadata::AgeRating).integer())
					.col(ColumnDef::new(MediaMetadata::Language).text())
					.col(ColumnDef::new(MediaMetadata::PageCount).integer())
					.col(ColumnDef::new(MediaMetadata::IdentifierIsbn).text())
					.col(ColumnDef::new(MediaMetadata::IdentifierUuid).text())
					.col(ColumnDef::new(MediaMetadata::IdentifierAmazon).text())
					.col(ColumnDef::new(MediaMetadata::IdentifierGoogle).text())
					.col(ColumnDef::new(MediaMetadata::IdentifierCalibre).text())
					.col(ColumnDef::new(MediaMetadata::IdentifierMobiAsin).text())
					.col(ColumnDef::new(MediaMetadata::Links).text())
					.col(ColumnDef::new(MediaMetadata::Characters).text())
					.col(ColumnDef::new(MediaMetadata::Teams).text())
					.col(ColumnDef::new(MediaMetadata::Notes).text())
					.col(
						ColumnDef::new(MediaMetadata::MediaId)
							.text()
							.not_null()
							.unique_key(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_metadata-media")
							.from(MediaMetadata::Table, MediaMetadata::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create media_tags table (references media, tags)
		manager
			.create_table(
				Table::create()
					.table(MediaTags::Table)
					.if_not_exists()
					.col(ColumnDef::new(MediaTags::MediaId).text().not_null())
					.col(ColumnDef::new(MediaTags::TagId).text().not_null())
					.primary_key(
						Index::create()
							.col(MediaTags::MediaId)
							.col(MediaTags::TagId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_tags-media")
							.from(MediaTags::Table, MediaTags::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_tags-tag")
							.from(MediaTags::Table, MediaTags::TagId)
							.to(Tags::Table, Tags::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create page_analysis table (references media) - unique constraint on media_id
		manager
			.create_table(
				Table::create()
					.table(PageAnalysis::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(PageAnalysis::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(PageAnalysis::Data).blob().not_null())
					.col(
						ColumnDef::new(PageAnalysis::MediaId)
							.text()
							.not_null()
							.unique_key(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-page_analysis-media")
							.from(PageAnalysis::Table, PageAnalysis::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create reading_sessions table (references media, registered_reading_devices, users) - needs unique index on media_id + user_id
		manager
			.create_table(
				Table::create()
					.table(ReadingSessions::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ReadingSessions::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(ReadingSessions::Page).integer().not_null())
					.col(ColumnDef::new(ReadingSessions::Epubcfi).text())
					.col(ColumnDef::new(ReadingSessions::Locator).text())
					.col(
						ColumnDef::new(ReadingSessions::PercentageCompleted)
							.float()
							.not_null(),
					)
					.col(ColumnDef::new(ReadingSessions::KoreaderProgress).text())
					.col(
						ColumnDef::new(ReadingSessions::StartedAt)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(ReadingSessions::UpdatedAt)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(ReadingSessions::ElapsedSeconds)
							.integer()
							.not_null(),
					)
					.col(ColumnDef::new(ReadingSessions::MediaId).text().not_null())
					.col(ColumnDef::new(ReadingSessions::UserId).text().not_null())
					.col(ColumnDef::new(ReadingSessions::DeviceId).text().not_null())
					.index(
						Index::create()
							.name("reading_session_media_id_user_id_idx")
							.unique()
							.col(ReadingSessions::MediaId)
							.col(ReadingSessions::UserId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-reading_sessions-media")
							.from(ReadingSessions::Table, ReadingSessions::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-reading_sessions-user")
							.from(ReadingSessions::Table, ReadingSessions::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-reading_sessions-device")
							.from(ReadingSessions::Table, ReadingSessions::DeviceId)
							.to(
								RegisteredReadingDevices::Table,
								RegisteredReadingDevices::Id,
							)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create refresh_tokens table (references users)
		manager
			.create_table(
				Table::create()
					.table(RefreshTokens::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(RefreshTokens::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(RefreshTokens::CreatedAt)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(RefreshTokens::ExpiresAt)
							.date_time()
							.not_null(),
					)
					.col(ColumnDef::new(RefreshTokens::UserId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-refresh_tokens-user")
							.from(RefreshTokens::Table, RefreshTokens::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create reviews table (references media, users)
		manager
			.create_table(
				Table::create()
					.table(Reviews::Table)
					.if_not_exists()
					.col(ColumnDef::new(Reviews::Id).text().not_null().primary_key())
					.col(ColumnDef::new(Reviews::Rating).float())
					.col(ColumnDef::new(Reviews::Content).text())
					.col(ColumnDef::new(Reviews::IsPrivate).boolean().not_null())
					.col(ColumnDef::new(Reviews::UserId).text().not_null())
					.col(ColumnDef::new(Reviews::MediaId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-reviews-user")
							.from(Reviews::Table, Reviews::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-reviews-media")
							.from(Reviews::Table, Reviews::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create scheduled_job_libraries table (references scheduled_job_configs, libraries)
		manager
			.create_table(
				Table::create()
					.table(ScheduledJobLibraries::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ScheduledJobLibraries::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(ScheduledJobLibraries::ScheduleId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(ScheduledJobLibraries::LibraryId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-scheduled_job_libraries-job_config")
							.from(
								ScheduledJobLibraries::Table,
								ScheduledJobLibraries::ScheduleId,
							)
							.to(ScheduledJobConfigs::Table, ScheduledJobConfigs::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-scheduled_job_libraries-library")
							.from(
								ScheduledJobLibraries::Table,
								ScheduledJobLibraries::LibraryId,
							)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create series_metadata table (references series) - needs unique index on series_id
		manager
			.create_table(
				Table::create()
					.table(SeriesMetadata::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(SeriesMetadata::SeriesId)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(SeriesMetadata::Title).text())
					.col(ColumnDef::new(SeriesMetadata::Summary).text())
					.col(ColumnDef::new(SeriesMetadata::Publisher).text())
					.col(ColumnDef::new(SeriesMetadata::AgeRating).integer())
					.col(ColumnDef::new(SeriesMetadata::Status).text())
					.col(ColumnDef::new(SeriesMetadata::Volume).text())
					.col(ColumnDef::new(SeriesMetadata::Comicid).text())
					.col(ColumnDef::new(SeriesMetadata::Booktype).text())
					.col(ColumnDef::new(SeriesMetadata::MetaType).text())
					.col(ColumnDef::new(SeriesMetadata::Imprint).text())
					.col(ColumnDef::new(SeriesMetadata::Genres).text())
					.col(ColumnDef::new(SeriesMetadata::Characters).text())
					.col(ColumnDef::new(SeriesMetadata::Writers).text())
					.col(ColumnDef::new(SeriesMetadata::Links).text())
					.index(
						Index::create()
							.name("series_metadata_series_id_idx")
							.unique()
							.col(SeriesMetadata::SeriesId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-series_metadata-series")
							.from(SeriesMetadata::Table, SeriesMetadata::SeriesId)
							.to(Series::Table, Series::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create series_tags table (references series, tags)
		manager
			.create_table(
				Table::create()
					.table(SeriesTags::Table)
					.if_not_exists()
					.col(ColumnDef::new(SeriesTags::SeriesId).text().not_null())
					.col(ColumnDef::new(SeriesTags::TagId).text().not_null())
					.primary_key(
						Index::create()
							.col(SeriesTags::SeriesId)
							.col(SeriesTags::TagId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-series_tags-series")
							.from(SeriesTags::Table, SeriesTags::SeriesId)
							.to(Series::Table, Series::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-series_tags-tag")
							.from(SeriesTags::Table, SeriesTags::TagId)
							.to(Tags::Table, Tags::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create sessions table (references users)
		manager
			.create_table(
				Table::create()
					.table(Sessions::Table)
					.if_not_exists()
					.col(ColumnDef::new(Sessions::Id).text().not_null().primary_key())
					.col(ColumnDef::new(Sessions::SessionId).text().not_null())
					.col(ColumnDef::new(Sessions::CreatedAt).date_time().not_null())
					.col(ColumnDef::new(Sessions::ExpiryTime).date_time().not_null())
					.col(ColumnDef::new(Sessions::UserId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-sessions-user")
							.from(Sessions::Table, Sessions::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Create user_login_activity table (references users)
		manager
			.create_table(
				Table::create()
					.table(UserLoginActivity::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(UserLoginActivity::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(UserLoginActivity::UserAgent).text())
					.col(ColumnDef::new(UserLoginActivity::IpAddress).text())
					.col(
						ColumnDef::new(UserLoginActivity::Timestamp)
							.date_time()
							.not_null(),
					)
					.col(ColumnDef::new(UserLoginActivity::UserId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-user_login_activity-user")
							.from(UserLoginActivity::Table, UserLoginActivity::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(
				Table::drop()
					.table(BookClubDiscussionMessageLikes::Table)
					.to_owned(),
			)
			.await?;
		manager
			.drop_table(
				Table::drop()
					.table(BookClubDiscussionMessage::Table)
					.to_owned(),
			)
			.await?;
		manager
			.drop_table(Table::drop().table(BookClubDiscussions::Table).to_owned())
			.await?;
		manager
			.drop_table(
				Table::drop()
					.table(BookClubBookSuggestionLikes::Table)
					.to_owned(),
			)
			.await?;
		manager
			.drop_table(Table::drop().table(BookClubBooks::Table).to_owned())
			.await?;
		manager
			.drop_table(
				Table::drop()
					.table(BookClubBookSuggestions::Table)
					.to_owned(),
			)
			.await?;
		manager
			.drop_table(
				Table::drop()
					.table(BookClubMemberFavoriteBooks::Table)
					.to_owned(),
			)
			.await?;
		manager
			.drop_table(Table::drop().table(BookClubInvitations::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(BookClubMembers::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(BookClubSchedules::Table).to_owned())
			.await?;

		manager
			.drop_table(Table::drop().table(SmartListViews::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(SmartListAccessRules::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(SmartLists::Table).to_owned())
			.await?;

		manager
			.drop_table(
				Table::drop()
					.table(FinishedReadingSessions::Table)
					.to_owned(),
			)
			.await?;
		manager
			.drop_table(Table::drop().table(ReadingSessions::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(SeriesMetadata::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(PageAnalysis::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(MediaMetadata::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(MediaAnnotations::Table).to_owned())
			.await?;

		manager
			.drop_table(Table::drop().table(ScheduledJobLibraries::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(LibraryScanRecords::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(EmailerSendRecords::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(Logs::Table).to_owned())
			.await?;

		manager
			.drop_table(Table::drop().table(Reviews::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(LastLibraryVisits::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(SeriesTags::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(MediaTags::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(LibraryTags::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(LibraryExclusions::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(FavoriteSeries::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(FavoriteMedia::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(FavoriteLibraries::Table).to_owned())
			.await?;

		manager
			.drop_table(Table::drop().table(UserLoginActivity::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(Sessions::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(RefreshTokens::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(Bookmarks::Table).to_owned())
			.await?;

		manager
			.drop_table(Table::drop().table(Media::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(Series::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(Libraries::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(LibraryConfigs::Table).to_owned())
			.await?;

		manager
			.drop_table(Table::drop().table(ApiKeys::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(AgeRestrictions::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(UserPreferences::Table).to_owned())
			.await?;

		manager
			.drop_table(Table::drop().table(Users::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(Tags::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(ServerInvitations::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(ScheduledJobConfigs::Table).to_owned())
			.await?;
		manager
			.drop_table(
				Table::drop()
					.table(RegisteredReadingDevices::Table)
					.to_owned(),
			)
			.await?;
		manager
			.drop_table(
				Table::drop()
					.table(RegisteredEmailDevices::Table)
					.to_owned(),
			)
			.await?;
		manager
			.drop_table(Table::drop().table(Notifiers::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(Jobs::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(Emailers::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(BookClubs::Table).to_owned())
			.await?;
		manager
			.drop_table(Table::drop().table(ServerConfig::Table).to_owned())
			.await?;

		Ok(())
	}
}
