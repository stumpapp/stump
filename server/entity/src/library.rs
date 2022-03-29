use rocket::serde::{Deserialize, Serialize};
use sea_orm::{entity::prelude::*, DbBackend, QuerySelect, QueryTrait, SelectTwoMany, Statement};

use crate::{series, util::FileStatus};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(crate = "rocket::serde", rename_all = "camelCase")]
#[sea_orm(table_name = "library")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// The name of the library. ex: "Marvel Comics"
    pub name: String,
    /// The location of the library in the fs. ex: "/home/user/media/comics/marvel"
    #[sea_orm(unique)]
    pub path: String,
    /// The status of the series since last scan or access
    #[sea_orm(default_value = FileStatus::Ready)]
    pub status: FileStatus,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::series::Entity")]
    Series,
}

impl Related<series::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Series.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl Entity {
    /// Finds a library by its id, and loads all its series.
    pub fn find_by_id(id: i32) -> SelectTwoMany<Entity, series::Entity> {
        Self::find()
            .filter(Column::Id.eq(id))
            .find_with_related(series::Entity)
    }

    /// Finds all libraries, and loads all their series.
    pub fn find_with_series() -> SelectTwoMany<Entity, series::Entity> {
        Self::find().find_with_related(series::Entity)
    }

    // TODO: construct this programatically!!
    pub fn find_with_series_raw(id: i32) {
        let test = Statement::from_sql_and_values(
            DbBackend::Sqlite,
            r#"SELECT
                "library"."id" AS "A_id",
                "library"."name" AS "A_name",
                "library"."path" AS "A_path",
                "library"."status" AS "A_status",
                "series"."id" AS "B_id",
                "series"."library_id" AS "B_library_id",
                "series"."title" AS "B_title",
                "series"."updated_at" AS "B_updated_at",
                "series"."path" AS "B_path",
                "series"."status" AS "B_status",
                "series"."book_count" AS "B_book_count"
                FROM
                "library"
            LEFT JOIN (
                    SELECT
                        "series"."id",
                        "series"."library_id",
                        "series"."title",
                        "series"."updated_at",
                        "series"."path",
                        "series"."status",
                        COUNT("media"."series_id") AS "book_count"
                    FROM
                        "series"
                        LEFT JOIN "media" ON "media"."series_id" = "series"."id"
                    GROUP BY
                        "series"."id"
            ) as "series" ON "library"."id" = "series"."library_id"
            WHERE
                "library"."id" = $1
            ORDER BY
                "library"."id" ASC;"#,
            vec![id.into()],
        );

        println!("QUERY: {}", test);
    }
}
