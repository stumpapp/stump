use std::io::Read;

use async_graphql::{Context, Object, Result, Upload, ID};
use models::{entity::custom_emoji, shared::enums::UserPermission};
use sea_orm::{prelude::*, ActiveValue::Set, ColumnTrait, IntoActiveModel, QueryFilter};

use crate::{
	data::{AuthContext, CoreContext},
	guard::{OptionalFeature, OptionalFeatureGuard, PermissionGuard},
	input::book_club::{CreateCustomEmojiInput, UpdateCustomEmojiInput},
	object::custom_emoji::CustomEmoji,
};

#[derive(Default)]
pub struct CustomEmojiMutation;

#[Object]
impl CustomEmojiMutation {
	/// Upload a new custom emoji
	#[graphql(
		guard = "OptionalFeatureGuard::new(OptionalFeature::Upload).and(PermissionGuard::new(&[UserPermission::UploadFile]))"
	)]
	async fn upload_custom_emoji(
		&self,
		ctx: &Context<'_>,
		input: CreateCustomEmojiInput,
		upload: Upload,
	) -> Result<CustomEmoji> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let existing = custom_emoji::Entity::find()
			.filter(custom_emoji::Column::Name.eq(&input.name))
			.one(conn)
			.await?;

		if existing.is_some() {
			return Err(
				format!("A custom emoji named '{}' already exists", input.name).into(),
			);
		}

		let mut value = upload.value(ctx)?;

		let extension = std::path::Path::new(&value.filename)
			.extension()
			.and_then(|ext| ext.to_str())
			.map(str::to_ascii_lowercase)
			.ok_or("Uploaded file must have a file extension")?;

		let mut image_bytes = Vec::new();
		value
			.content
			.read_to_end(&mut image_bytes)
			.map_err(|e| format!("Failed to read upload data: {e}"))?;

		let emoji = custom_emoji::ActiveModel {
			name: Set(input.name),
			is_animated: Set(input.is_animated),
			file_extension: Set(extension.clone()),
			created_by_id: Set(user.id.clone()),
			..Default::default()
		};

		let created = emoji.insert(conn).await?;

		let config = core.config.as_ref();
		let emoji_path = config
			.get_emojis_dir()
			.join(format!("{}.{}", created.id, created.file_extension));

		tokio::fs::write(&emoji_path, &image_bytes)
			.await
			.map_err(|e| format!("Failed to write emoji file: {e}"))?;

		Ok(created.into())
	}

	/// Delete a custom emoji
	#[graphql(guard = "PermissionGuard::new(&[UserPermission::UploadFile])")]
	async fn delete_custom_emoji(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let _ = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let emoji_id = id.as_ref().parse::<i32>().map_err(|_| "Invalid emoji ID")?;

		let emoji = custom_emoji::Entity::find_by_id(emoji_id)
			.one(conn)
			.await?
			.ok_or("Custom emoji not found")?;

		let config = core.config.as_ref();
		let emoji_path = config
			.get_emojis_dir()
			.join(format!("{}.{}", emoji.id, emoji.file_extension));

		if tokio::fs::metadata(&emoji_path).await.is_ok() {
			let _ = tokio::fs::remove_file(emoji_path).await;
		}

		emoji.delete(conn).await?;

		Ok(true)
	}

	/// Rename a custom emoji
	#[graphql(guard = "PermissionGuard::new(&[UserPermission::UploadFile])")]
	async fn update_custom_emoji(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: UpdateCustomEmojiInput,
	) -> Result<CustomEmoji> {
		let _ = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let emoji_id = id.as_ref().parse::<i32>().map_err(|_| "Invalid emoji ID")?;

		let emoji = custom_emoji::Entity::find_by_id(emoji_id)
			.one(conn)
			.await?
			.ok_or("Custom emoji not found")?;

		let conflict = custom_emoji::Entity::find()
			.filter(custom_emoji::Column::Name.eq(&input.name))
			.filter(custom_emoji::Column::Id.ne(emoji.id))
			.one(conn)
			.await?;

		if conflict.is_some() {
			return Err(
				format!("A custom emoji named '{}' already exists", input.name).into(),
			);
		}

		let mut active_model = emoji.into_active_model();
		active_model.name = Set(input.name);

		let updated = active_model.update(conn).await?;

		Ok(updated.into())
	}
}
