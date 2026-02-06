use async_graphql::SimpleObject;
use chrono::Utc;
use sea_orm::{
	prelude::{async_trait::async_trait, *},
	ActiveValue, DeriveEntityModel,
};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "MetadataProviderConfigModel")]
#[sea_orm(table_name = "metadata_provider_configs")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	pub provider_type: String,
	pub enabled: bool,
	#[graphql(skip)]
	pub encrypted_api_token: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	// Mostly just to serve as a reminder, this isn't enforced since it isn't managed
	// within our system
	pub api_key_expires_at: Option<DateTimeWithTimeZone>,
	pub auto_apply_threshold: Decimal,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub updated_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			self.created_at = ActiveValue::Set(DateTimeWithTimeZone::from(Utc::now()));
			if self.auto_apply_threshold.is_not_set() {
				self.auto_apply_threshold = ActiveValue::Set(
					Decimal::from_str_exact("0.95").expect("This should never happen!"),
				);
			}
		} else {
			self.updated_at =
				ActiveValue::Set(Some(DateTimeWithTimeZone::from(Utc::now())));
		}

		Ok(self)
	}
}
