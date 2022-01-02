use crate::State;

/// BASE URL: /opds/v1.2

#[get("/catalog")]
pub fn catalog(db: &State) -> String {
    let connection = db.get_connection();

    format!("{:?}", connection)
}
