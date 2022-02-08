use rocket::serde::json::Json;

use crate::database::{entities, queries};
use crate::State;

type GetLogs = Json<Vec<entities::log::Model>>;

#[get("/logs")]
pub async fn get_logs(state: &State) -> Result<GetLogs, String> {
    Ok(Json(queries::log::get_logs(state.get_connection()).await?))
}
