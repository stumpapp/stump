use sea_orm_migration::prelude::*;

#[tokio::main]
async fn main() {
	if std::env::var("DATABASE_URL").is_err() {
		std::env::set_var("DATABASE_URL", "sqlite://./core/dev.db?mode=rwc");
	}
	cli::run_cli(migrations::Migrator).await;
}
