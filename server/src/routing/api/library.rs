use entity::sea_orm;
use entity::{library, series};
use rocket::{
    http::Status,
    serde::{json::Json, Deserialize},
};
use sea_orm::{sea_query::Expr, ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};

use crate::{
    fs::new_scanner,
    routing::error::{ApiError, ApiResult},
    types::dto::GetLibraryWithSeriesQuery,
    State,
};

// TODO: fix terrible error handling
type GetLibraries = Json<Vec<library::Model>>;

#[get("/library")]
pub async fn get_libraries(state: &State) -> Result<GetLibraries, String> {
    let libraries = library::Entity::find()
        .all(state.get_connection())
        .await
        .map_err(|e| e.to_string())?;

    Ok(Json(libraries))
}

type GetLibraryResult = ApiResult<Json<GetLibraryWithSeriesQuery>>;

#[get("/library/<id>")]
pub async fn get_library(state: &State, id: i32) -> GetLibraryResult {
    library::Entity::find()
        .filter(library::Column::Id.eq(id))
        .find_with_related(series::Entity)
        .all(state.get_connection())
        .await
        .map(|res| {
            if res.is_empty() {
                Err(ApiError::NotFound(format!(
                    "Library with id {} not found",
                    id
                )))
            } else {
                Ok(Json(res[0].to_owned().into()))
            }
        })
        .map_err(|e| ApiError::InternalServerError(e.to_string()))?
}

#[get("/library/<id>/scan")]
pub async fn scan_library(state: &State, id: i32) -> Result<(), String> {
    let connection = state.get_connection();
    let queue = state.get_queue();

    new_scanner::scan(connection, queue, Some(id))
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct InsertLibrary<'r> {
    name: &'r str,
    path: &'r str,
}

type InsertLibraryResult = ApiResult<Json<library::Model>>;

/// A handler for POST /api/library. Inserts a new library into the database.
#[post("/library", data = "<lib>")]
pub async fn insert_library(state: &State, lib: Json<InsertLibrary<'_>>) -> InsertLibraryResult {
    let libraries = library::Entity::find()
        .all(state.get_connection())
        .await
        .map_err(|e| ApiError::InternalServerError(e.to_string()))?;

    if libraries.iter().any(|l| {
        // library and name must be unique
        if l.name == lib.name || l.path == lib.path {
            return true;
        }
        // FIXME: this fails an edge case, I need to grab the absolute path to do this in this manner
        // path may not be a subpath or parent of another library
        else if lib.path.starts_with(&l.path) || l.path.starts_with(&lib.path) {
            return true;
        }

        false
    }) {
        return Err(ApiError::BadRequest(
            "Library already exists is a child/parent to an existing library".to_string(),
        ));
    }

    let new_lib = library::ActiveModel {
        name: Set(lib.name.to_string()),
        path: Set(lib.path.to_string()),
        ..Default::default()
    };

    let res = new_lib
        .insert(state.get_connection())
        .await
        .map_err(|e| ApiError::InternalServerError(e.to_string()))?;

    Ok(Json(res))
}

type UpdateLibraryResult = ApiResult<Status>;

/// A handler for PUT /api/library/:id. Update an existing library in the database.
#[put("/library/<id>", data = "<changes>")]
pub async fn update_library(
    state: &State,
    id: i32,
    changes: Json<InsertLibrary<'_>>,
) -> UpdateLibraryResult {
    Ok(library::Entity::update_many()
        .col_expr(library::Column::Name, Expr::value(changes.name))
        .col_expr(library::Column::Path, Expr::value(changes.path))
        .filter(library::Column::Id.eq(id))
        .exec(state.get_connection())
        .await
        .map(|_| Status::Ok)
        .map_err(|e| ApiError::InternalServerError(e.to_string()))?)
}

/// A handler for DELETE /api/library/:id. Deletes a library from the database.
#[delete("/library/<id>")]
pub async fn delete_library(state: &State, id: i32) -> Result<(), String> {
    library::Entity::delete_many()
        .filter(library::Column::Id.eq(id))
        .exec(state.get_connection())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
