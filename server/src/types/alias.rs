use crate::database::entities::{library, media, series};

use crate::types::dto::SeriesWithThumbnail;

pub type SeriesModel = series::Model;
// pub type SeriesEntity = series::Entity;
pub type LibraryModel = library::Model;

pub type MediaModel = media::Model;
// pub type MediaEntity = media::Entity;

// pub type SeriesList = Vec<SeriesWithThumbnail>;
pub type SeriesWithMedia = (SeriesModel, Vec<MediaModel>);

pub type SeriesWithLibraries = Vec<(SeriesModel, Vec<LibraryModel>)>;
