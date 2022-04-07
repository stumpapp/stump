use entity::library;
use entity::sea_orm;
use entity::series;
use rocket::{
    http::Status,
    serde::{json::Json, Deserialize},
};
use sea_orm::{sea_query::Expr, ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};

use crate::types::dto::series::SeriesWithBookCount;
use crate::{
    fs::scanner,
    routing::error::{ApiError, ApiResult},
    types::dto::GetLibraryWithSeriesQuery_refactor,
    State,
};

type GetLibraries = ApiResult<Json<Vec<library::Model>>>;

#[get("/library")]
pub async fn get_libraries(state: &State) -> GetLibraries {
    let libraries = library::Entity::find().all(state.get_connection()).await?;

    Ok(Json(libraries))
}

type GetLibraryResult = ApiResult<Json<GetLibraryWithSeriesQuery_refactor>>;
type GetLibrarySeries = ApiResult<Json<Vec<SeriesWithBookCount>>>;

// TODO: this is a work around until I can solve STU-12: Construct library with series query programmatically
// I very much dislike having to make two queries here
#[get("/library/<id>")]
pub async fn get_library(state: &State, id: i32) -> GetLibraryResult {
    let res = library::Entity::find()
        .filter(library::Column::Id.eq(id))
        .all(state.get_connection())
        .await?;

    if res.is_empty() {
        return Err(ApiError::NotFound(format!(
            "Library with id {} not found",
            id
        )));
    } else if res.len() > 1 {
        return Err(ApiError::InternalServerError(
            "Multiple libraries with the same id found".to_string(),
        ));
    }

    let library = res.first().unwrap();

    let series = series::Entity::find_with_book_count()
        .filter(series::Column::LibraryId.eq(id))
        .into_model::<SeriesWithBookCount>()
        .all(state.get_connection())
        .await?;

    Ok(Json((library.to_owned(), series).into()))

    // library::Entity::find_by_id(id)
    //     .all(state.get_connection())
    //     .await
    //     .map(|res| {
    //         if res.is_empty() {
    //             Err(ApiError::NotFound(format!(
    //                 "Library with id {} not found",
    //                 id
    //             )))
    //         } else {
    //             Ok(Json(res[0].to_owned().into()))
    //         }
    //     })?
}

// TODO: this is a work around until I can solve STU-12: Construct library with series query programmatically
#[get("/library/<id>/series")]
pub async fn get_library_series(state: &State, id: i32) -> GetLibrarySeries {
    series::Entity::find_with_book_count()
        .filter(series::Column::LibraryId.eq(id))
        .into_model::<SeriesWithBookCount>()
        .all(state.get_connection())
        .await
        .map(|res| Ok(Json(res)))?
}

// TODO: use ApiResult
#[get("/library/<id>/scan")]
pub async fn scan_library(state: &State, id: i32) -> Result<(), String> {
    scanner::scan(state, Some(id)).await?;

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
    let libraries = library::Entity::find().all(state.get_connection()).await?;

    let invalid = libraries.iter().any(|l| {
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
    });

    if invalid {
        return Err(ApiError::BadRequest(
            "Library already exists is a child/parent to an existing library".to_string(),
        ));
    }

    let new_lib = library::ActiveModel {
        name: Set(lib.name.to_string()),
        path: Set(lib.path.to_string()),
        status: Set(entity::util::FileStatus::Ready),
        // FIXME: this was not setting the library status >:(
        ..Default::default()
    };

    let res = new_lib.insert(state.get_connection()).await?;

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
        .map(|_| Status::Ok)?)
}

/// A handler for DELETE /api/library/:id. Deletes a library from the database.
#[delete("/library/<id>")]
pub async fn delete_library(state: &State, id: i32) -> ApiResult<()> {
    library::Entity::delete_many()
        .filter(library::Column::Id.eq(id))
        .exec(state.get_connection())
        .await?;

    Ok(())
}
