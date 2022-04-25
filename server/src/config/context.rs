use crate::prisma;

pub struct Context {
    db: prisma::PrismaClient,
}

/// Context each request will be provided with.
impl Context {
    pub async fn new() -> Context {
        Context {
            db: prisma::new_client()
                .await
                .expect("Failed to create Prisma client"),
        }
    }

    pub fn get_db(&self) -> &prisma::PrismaClient {
        &self.db
    }
}
