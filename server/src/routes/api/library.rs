use rocket::serde::json::Json;
use serde::Deserialize;

use crate::{
    guards::auth::StumpAuth,
    prisma::library,
    types::{
        alias::{ApiResult, Context},
        errors::ApiError,
    },
};

#[get("/libraries")]
pub async fn get_libraries(ctx: &Context, _auth: StumpAuth) -> ApiResult<Json<Vec<library::Data>>> {
    let db = ctx.get_db();

    Ok(Json(db.library().find_many(vec![]).exec().await?))
}

// FIXME: this needs to return either the media count or just the media loaded,
// same issue as in a few other files, not currently supported.
#[get("/libraries/<id>")]
pub async fn get_library_by_id(
    id: String,
    ctx: &Context,
    _auth: StumpAuth,
) -> ApiResult<Json<library::Data>> {
    let db = ctx.get_db();

    let lib = db
        .library()
        .find_unique(library::id::equals(id.clone()))
        .with(library::series::fetch(vec![]))
        .exec()
        .await?;

    if lib.is_none() {
        return Err(ApiError::NotFound(format!(
            "Library with id {} not found",
            id
        )));
    }

    Ok(Json(lib.unwrap()))
}

// TODO: write me
#[get("/library/<id>/scan")]
pub async fn scan_library(id: String, ctx: &Context) -> Result<(), ApiError> {
    let db = ctx.get_db();

    let lib = db
        .library()
        .find_unique(library::id::equals(id.clone()))
        .exec()
        .await?;

    if lib.is_none() {
        return Err(ApiError::NotFound(format!(
            "Library with id {} not found",
            id
        )));
    }

    let lib = lib.unwrap();

    todo!()
}

#[derive(Deserialize)]
pub struct CreateLibrary {
    name: String,
    path: String,
    description: Option<String>,
}

#[post("/library", data = "<input>")]
pub async fn create_library(
    input: Json<CreateLibrary>,
    ctx: &Context,
    _auth: StumpAuth,
) -> ApiResult<Json<library::Data>> {
    let db = ctx.get_db();

    Ok(Json(
        db.library()
            .create(
                library::name::set(input.name.to_owned()),
                library::path::set(input.path.to_owned()),
                vec![library::description::set(input.description.to_owned())],
            )
            .exec()
            .await?,
    ))
}

#[derive(Deserialize)]
pub struct UpdateLibrary {
    name: String,
    path: String,
    description: Option<String>,
}

#[put("/library/<id>", data = "<input>")]
pub async fn update_library(
    id: String,
    input: Json<UpdateLibrary>,
    ctx: &Context,
    _auth: StumpAuth,
) -> ApiResult<Json<library::Data>> {
    let db = ctx.get_db();

    let updated = db
        .library()
        .find_unique(library::id::equals(id.clone()))
        .update(vec![
            library::name::set(input.name.to_owned()),
            library::path::set(input.path.to_owned()),
            library::description::set(input.description.to_owned()),
        ])
        .exec()
        .await?;

    if updated.is_none() {
        return Err(ApiError::NotFound(format!(
            "Library with id {} not found",
            &id
        )));
    }

    Ok(Json(updated.unwrap()))
}

#[delete("/library/<id>")]
pub async fn delete_library(
    id: String,
    ctx: &Context,
    _auth: StumpAuth,
) -> ApiResult<Json<library::Data>> {
    let db = ctx.get_db();

    let deleted = db
        .library()
        .find_unique(library::id::equals(id.clone()))
        .delete()
        .exec()
        .await?;

    if deleted.is_none() {
        return Err(ApiError::NotFound(format!(
            "Library with id {} not found",
            &id
        )));
    }

    Ok(Json(deleted.unwrap()))
}
