use crate::database::entities::{media, series};

use crate::types::dto::SeriesWithThumbnail;

pub type SeriesModel = series::Model;
// pub type SeriesEntity = series::Entity;

pub type MediaModel = media::Model;
// pub type MediaEntity = media::Entity;

// pub type SeriesList = Vec<SeriesWithThumbnail>;
pub type SeriesWithMedia = (SeriesModel, Vec<MediaModel>);
