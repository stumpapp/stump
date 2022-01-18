use crate::{database::entities::library, State};

use rocket::serde::{json::Json, Deserialize};
use sea_orm::{sea_query::Expr, ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};

// TODO: fix terrible error handling

// type alias for the get_libraries return
type GetLibrary = Json<Vec<library::Model>>;

#[get("/library")]
// pub async fn get_libraries(db: &State) -> Result<Vec<library::Model>, String> {
pub async fn get_libraries(db: &State) -> Result<GetLibrary, String> {
    let libraries = library::Entity::find()
        .all(db.get_connection())
        .await
        .map_err(|e| e.to_string())?;

    Ok(Json(libraries))
}

#[derive(Deserialize)]
pub struct InsertLibrary<'r> {
    name: &'r str,
    path: &'r str,
}

/// A handler for POST /api/library. Inserts a new library into the database.
#[post("/library", data = "<lib>")]
pub async fn insert_library(db: &State, lib: Json<InsertLibrary<'_>>) -> Result<String, String> {
    let new_lib = library::ActiveModel {
        name: Set(lib.name.to_string()),
        path: Set(lib.path.to_string()),
        ..Default::default()
    };

    let res = new_lib
        .insert(db.get_connection())
        .await
        .map_err(|e| e.to_string())?;

    // FIXME: ew, why does the responder not work with numbers??
    Ok(res.id.to_string())
}

/// A handler for PUT /api/library/:id. Update an existing library in the database.
#[put("/library/<id>", data = "<changes>")]
pub async fn update_library(
    db: &State,
    id: i32,
    changes: Json<InsertLibrary<'_>>,
) -> Result<(), String> {
    library::Entity::update_many()
        .col_expr(library::Column::Name, Expr::value(changes.name))
        .col_expr(library::Column::Path, Expr::value(changes.path))
        .filter(library::Column::Id.eq(id))
        .exec(db.get_connection())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// A handler for DELETE /api/library/:id. Deletes a library from the database.
#[delete("/library/<id>")]
pub async fn delete_library(db: &State, id: i32) -> Result<(), String> {
    library::Entity::delete_many()
        .filter(library::Column::Id.eq(id))
        .exec(db.get_connection())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
