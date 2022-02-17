use rocket::serde::json::Json;

use crate::database::queries;
use crate::State;

type GetLogs = Json<Vec<entity::log::Model>>;

#[get("/logs")]
pub async fn get_logs(state: &State) -> Result<GetLogs, String> {
    Ok(Json(queries::log::get_logs(state.get_connection()).await?))
}
