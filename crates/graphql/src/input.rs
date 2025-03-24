use async_graphql::{CustomValidator, InputObject, InputValueError, Json, OneofObject};
use models::{
	entity::{book_club, book_club_member, library, library_config, user::AuthUser},
	shared::{
		book_club::{
			BookClubBook, BookClubExternalBook, BookClubInternalBook, BookClubMemberRole,
			BookClubMemberRoleSpec,
		},
		enums::{LibraryPattern, ReadingDirection, ReadingImageScaleFit, ReadingMode},
		ignore_rules::IgnoreRules,
		image_processor_options::ImageProcessorOptions,
	},
};
use sea_orm::{prelude::*, Set};

// TODO: might be better to either:
// 1. Colocate inputs with the objects? (e.g., `object/library.rs`)
// 2. Group inputs in own modules _like_ objects but not in same file? (e.g., `input/library.rs`)

#[derive(Debug, InputObject)]
pub struct CreateOrUpdateLibraryInput {
	pub name: String,
	pub path: String,
	pub description: Option<String>,
	pub emoji: Option<String>,
	pub tags: Option<Vec<String>>,
	pub config: Option<LibraryConfigInput>,
	pub scan_after_persist: bool,
}

impl CreateOrUpdateLibraryInput {
	pub fn into_active_model(
		self,
	) -> (library::ActiveModel, library_config::ActiveModel) {
		let CreateOrUpdateLibraryInput {
			name,
			description,
			path,
			emoji,
			config,
			..
		} = self;

		let id = Uuid::new_v4().to_string();
		let library = library::ActiveModel {
			id: Set(id.clone()),
			name: Set(name),
			description: Set(description),
			path: Set(path),
			emoji: Set(emoji),
			..Default::default()
		};

		let config = library_config::ActiveModel {
			library_id: Set(Some(id)),
			..config.unwrap_or_default().into_active_model()
		};

		(library, config)
	}
}

#[derive(Debug, Default, InputObject)]
pub struct LibraryConfigInput {
	pub convert_rar_to_zip: bool,
	pub hard_delete_conversions: bool,
	pub generate_file_hashes: bool,
	pub generate_koreader_hashes: bool,
	pub process_metadata: bool,
	pub watch: bool,
	pub library_pattern: LibraryPattern,
	pub thumbnail_config: Option<Json<ImageProcessorOptions>>,
	pub default_reading_dir: ReadingDirection,
	pub default_reading_mode: ReadingMode,
	pub default_reading_image_scale_fit: ReadingImageScaleFit,
	pub ignore_rules: Option<Vec<String>>,
}

impl LibraryConfigInput {
	pub fn into_active_model(self) -> library_config::ActiveModel {
		let LibraryConfigInput {
			convert_rar_to_zip,
			hard_delete_conversions,
			generate_file_hashes,
			generate_koreader_hashes,
			process_metadata,
			watch,
			library_pattern,
			thumbnail_config,
			default_reading_dir,
			default_reading_mode,
			default_reading_image_scale_fit,
			ignore_rules,
		} = self;

		let thumbnail_config = thumbnail_config.map(|config| config.0);

		let ignore_rules = ignore_rules
			.map(IgnoreRules::new)
			.transpose()
			.unwrap_or_default();

		library_config::ActiveModel {
			convert_rar_to_zip: Set(convert_rar_to_zip),
			hard_delete_conversions: Set(hard_delete_conversions),
			generate_file_hashes: Set(generate_file_hashes),
			generate_koreader_hashes: Set(generate_koreader_hashes),
			process_metadata: Set(process_metadata),
			watch: Set(watch),
			library_pattern: Set(library_pattern),
			thumbnail_config: Set(thumbnail_config),
			default_reading_dir: Set(default_reading_dir),
			default_reading_mode: Set(default_reading_mode),
			default_reading_image_scale_fit: Set(default_reading_image_scale_fit),
			ignore_rules: Set(ignore_rules),
			..Default::default()
		}
	}
}

#[derive(Debug, InputObject)]
pub struct CreateBookClubInput {
	pub name: String,
	#[graphql(default)]
	pub is_private: bool,
	pub member_role_spec: Option<Json<BookClubMemberRoleSpec>>,
	pub creator_hide_progress: bool,
	pub creator_display_name: Option<String>,
}

impl CreateBookClubInput {
	pub fn into_active_model(
		self,
		user: &AuthUser,
	) -> (book_club::ActiveModel, book_club_member::ActiveModel) {
		let id = Uuid::new_v4().to_string();

		let club = book_club::ActiveModel {
			id: Set(id.clone()),
			name: Set(self.name),
			is_private: Set(self.is_private),
			member_role_spec: Set(self.member_role_spec.map(|spec| spec.0)),
			..Default::default()
		};

		let owning_member = book_club_member::ActiveModel {
			role: Set(BookClubMemberRole::Creator),
			is_creator: Set(true),
			hide_progress: Set(self.creator_hide_progress),
			display_name: Set(self.creator_display_name),
			user_id: Set(user.id.clone()),
			book_club_id: Set(id),
			..Default::default()
		};

		(club, owning_member)
	}
}

#[derive(Debug, InputObject)]
pub struct UpdateBookClubInput {
	pub name: Option<String>,
	pub description: Option<String>,
	pub is_private: Option<bool>,
	pub member_role_spec: Option<Json<BookClubMemberRoleSpec>>,
	pub emoji: Option<String>,
}

impl UpdateBookClubInput {
	pub fn apply(
		self,
		mut active_model: book_club::ActiveModel,
	) -> book_club::ActiveModel {
		let UpdateBookClubInput {
			name,
			description,
			is_private,
			member_role_spec,
			emoji,
		} = self;

		active_model.description = Set(description);
		active_model.emoji = Set(emoji);

		active_model.name = name.map(Set).unwrap_or(active_model.name);
		active_model.is_private = is_private.map(Set).unwrap_or(active_model.is_private);
		if let Some(spec) = member_role_spec {
			active_model.member_role_spec = Set(Some(spec.0));
		}

		active_model
	}
}

#[derive(Debug, InputObject)]
pub struct BookClubInvitationInput {
	pub user_id: String,
	pub role: Option<BookClubMemberRole>,
}

#[derive(Debug, InputObject)]
pub struct BookClubMemberInput {
	pub user_id: String,
	pub display_name: Option<String>,
	pub private_membership: Option<bool>,
}

#[derive(Debug, InputObject)]
pub struct BookClubInvitationResponseInput {
	pub accept: bool,
	pub member: Option<BookClubMemberInput>,
}

pub struct BookClubInvitationResponseValidator;

impl CustomValidator<BookClubInvitationResponseInput>
	for BookClubInvitationResponseValidator
{
	fn check(
		&self,
		value: &BookClubInvitationResponseInput,
	) -> Result<(), InputValueError<BookClubInvitationResponseInput>> {
		match (value.accept, &value.member) {
			(true, None) => Err(InputValueError::custom(
				"Accepting an invitation requires a member object",
			)),
			(false, Some(_)) => Err(InputValueError::custom(
				"Rejecting an invitation should not include a member object",
			)),
			_ => Ok(()),
		}
	}
}

// impl CreateBookClubScheduleBookOption {
// 	/// Convert the option into a vector of Prisma set parameters
// 	pub fn into_prisma(self) -> Vec<book_club_book::SetParam> {
// 		match self {
// 			CreateBookClubScheduleBookOption::Stored { id } => {
// 				vec![
// 					book_club_book::book_entity::connect(media::id::equals(id.clone())),
// 					book_club_book::book_entity_id::set(Some(id)),
// 				]
// 			},
// 			CreateBookClubScheduleBookOption::External(BookClubExternalBook {
// 				title,
// 				author,
// 				url,
// 				image_url,
// 			}) => vec![
// 				book_club_book::title::set(Some(title)),
// 				book_club_book::author::set(Some(author)),
// 				book_club_book::url::set(url),
// 				book_club_book::image_url::set(image_url),
// 			],
// 		}
// 	}
// }

#[derive(Debug, InputObject)]
pub struct CreateBookClubScheduleBook {
	pub book: BookClubBook,
	pub start_at: Option<DateTimeWithTimeZone>,
	pub end_at: Option<DateTimeWithTimeZone>,
	pub discussion_duration_days: Option<i32>,
}

#[derive(Debug, InputObject)]
pub struct CreateBookClubScheduleInput {
	pub default_interval_days: Option<i32>,
	pub books: Vec<CreateBookClubScheduleBook>,
}
