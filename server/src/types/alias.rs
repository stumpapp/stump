use crate::database::entities::{library, media, series};

pub type SeriesModel = series::Model;
pub type LibraryModel = library::Model;
pub type MediaModel = media::Model;

pub type SeriesWithMedia = (SeriesModel, Vec<MediaModel>);
pub type FeedPages = (usize, Option<usize>);
pub type LibraryWithSeries = (LibraryModel, Vec<SeriesModel>);
pub type SeriesWithLibraries = Vec<(SeriesModel, Vec<LibraryModel>)>;
