use entity::{
    sea_orm::{DbBackend, EntityTrait, Schema},
    *,
};
use sea_schema::migration::prelude::*;

pub struct Migration;

fn get_seaorm_create_stmt<E: EntityTrait>(e: E) -> TableCreateStatement {
    let schema = Schema::new(DbBackend::Sqlite);

    schema
        .create_table_from_entity(e)
        .if_not_exists()
        .to_owned()

    // This throws error, replace with this once bug is gone
    // Table::create().table(e).if_not_exists().to_owned()
}

fn get_seaorm_drop_stmt<E: EntityTrait>(e: E) -> TableDropStatement {
    Table::drop().table(e).if_exists().to_owned()
}

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20220120_000001_create_post_table"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let stmts = vec![
            get_seaorm_create_stmt(server_preferences::Entity),
            get_seaorm_create_stmt(user::Entity),
            get_seaorm_create_stmt(media::Entity),
            get_seaorm_create_stmt(read_progress::Entity),
            get_seaorm_create_stmt(series::Entity),
            get_seaorm_create_stmt(library::Entity),
            get_seaorm_create_stmt(log::Entity),
        ];

        for stmt in stmts {
            manager.create_table(stmt.to_owned()).await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let stmts = vec![
            get_seaorm_drop_stmt(server_preferences::Entity),
            get_seaorm_drop_stmt(user::Entity),
            get_seaorm_drop_stmt(media::Entity),
            get_seaorm_drop_stmt(read_progress::Entity),
            get_seaorm_drop_stmt(series::Entity),
            get_seaorm_drop_stmt(library::Entity),
            get_seaorm_drop_stmt(log::Entity),
        ];

        for stmt in stmts {
            manager.drop_table(stmt.to_owned()).await?;
        }

        Ok(())
    }
}
