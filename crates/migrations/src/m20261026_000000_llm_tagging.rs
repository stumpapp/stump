use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_table(
				Table::create()
					.table(LlmTagSuggestions::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(LlmTagSuggestions::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(LlmTagSuggestions::MediaId)
							.string()
							.not_null(),
					)
					.col(
						ColumnDef::new(LlmTagSuggestions::Status)
							.string()
							.not_null()
							.default("SUGGESTED"),
					)
					.col(ColumnDef::new(LlmTagSuggestions::SuggestedTags).json())
					.col(ColumnDef::new(LlmTagSuggestions::AppliedTags).json())
					.col(
						ColumnDef::new(LlmTagSuggestions::CreatedAt)
							.timestamp_with_time_zone()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(
						ColumnDef::new(LlmTagSuggestions::UpdatedAt)
							.timestamp_with_time_zone(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk_llm_tag_suggestions_media_id")
							.from(LlmTagSuggestions::Table, LlmTagSuggestions::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.name("idx_llm_tag_suggestions_media_id")
					.table(LlmTagSuggestions::Table)
					.col(LlmTagSuggestions::MediaId)
					.unique()
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.name("idx_llm_tag_suggestions_status")
					.table(LlmTagSuggestions::Table)
					.col(LlmTagSuggestions::Status)
					.to_owned(),
			)
			.await?;

		manager
			.create_table(
				Table::create()
					.table(LlmLibraryTagDrafts::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(LlmLibraryTagDrafts::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(LlmLibraryTagDrafts::LibraryId)
							.string()
							.not_null(),
					)
					.col(
						ColumnDef::new(LlmLibraryTagDrafts::Status)
							.string()
							.not_null()
							.default("IN_PROGRESS"),
					)
					.col(ColumnDef::new(LlmLibraryTagDrafts::FinalTagList).json())
					.col(ColumnDef::new(LlmLibraryTagDrafts::Assignments).json())
					.col(
						ColumnDef::new(LlmLibraryTagDrafts::BooksAnalyzed)
							.integer()
							.not_null()
							.default(0),
					)
					.col(
						ColumnDef::new(LlmLibraryTagDrafts::CompletedBatches)
							.integer()
							.not_null()
							.default(0),
					)
					.col(
						ColumnDef::new(LlmLibraryTagDrafts::TotalBatches)
							.integer()
							.not_null()
							.default(0),
					)
					.col(
						ColumnDef::new(LlmLibraryTagDrafts::CreatedAt)
							.timestamp_with_time_zone()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(
						ColumnDef::new(LlmLibraryTagDrafts::UpdatedAt)
							.timestamp_with_time_zone(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk_llm_library_tag_drafts_library_id")
							.from(
								LlmLibraryTagDrafts::Table,
								LlmLibraryTagDrafts::LibraryId,
							)
							.to(Library::Table, Library::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.name("idx_llm_library_tag_drafts_library_id")
					.table(LlmLibraryTagDrafts::Table)
					.col(LlmLibraryTagDrafts::LibraryId)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(ServerConfig::Table)
					.add_column(ColumnDef::new(ServerConfig::LlmTaggingConfig).json())
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(ServerConfig::Table)
					.drop_column(ServerConfig::LlmTaggingConfig)
					.to_owned(),
			)
			.await?;

		manager
			.drop_table(Table::drop().table(LlmLibraryTagDrafts::Table).to_owned())
			.await?;

		manager
			.drop_table(Table::drop().table(LlmTagSuggestions::Table).to_owned())
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum LlmTagSuggestions {
	#[sea_orm(iden = "llm_tag_suggestions")]
	Table,
	Id,
	MediaId,
	Status,
	SuggestedTags,
	AppliedTags,
	CreatedAt,
	UpdatedAt,
}

#[derive(DeriveIden)]
enum LlmLibraryTagDrafts {
	#[sea_orm(iden = "llm_library_tag_drafts")]
	Table,
	Id,
	LibraryId,
	Status,
	FinalTagList,
	Assignments,
	BooksAnalyzed,
	CompletedBatches,
	TotalBatches,
	CreatedAt,
	UpdatedAt,
}

#[derive(DeriveIden)]
enum ServerConfig {
	Table,
	LlmTaggingConfig,
}

#[derive(DeriveIden)]
enum Media {
	#[sea_orm(iden = "media")]
	Table,
	Id,
}

#[derive(DeriveIden)]
enum Library {
	#[sea_orm(iden = "library")]
	Table,
	Id,
}
