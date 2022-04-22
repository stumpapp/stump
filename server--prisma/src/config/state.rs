use crate::prisma;

pub struct AppState {
    pub db: prisma::PrismaClient,
}

impl AppState {
    pub async fn new() -> AppState {
        AppState {
            db: prisma::new_client()
                .await
                .expect("Failed to create Prisma client"),
        }
    }

    pub fn get_db(&self) -> &prisma::PrismaClient {
        &self.db
    }
}
