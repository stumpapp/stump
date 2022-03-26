use entity::{library, media, read_progress, series};

pub type SeriesModel = series::Model;
pub type LibraryModel = library::Model;
pub type MediaModel = media::Model;

pub type SeriesWithMedia = (SeriesModel, Vec<MediaModel>);
pub type SeriesWithMediaAndProgress = (SeriesModel, GetUserMediaWithProgress);
pub type FeedPages = (usize, Option<usize>);
pub type LibraryWithSeries = (LibraryModel, Vec<series::Model>);
pub type SeriesWithLibraries = Vec<(SeriesModel, Vec<LibraryModel>)>;

pub type GetMediaWithProgressRaw = Vec<(media::Model, Vec<read_progress::Model>)>;
pub type MediaWithMaybeProgress = (media::Model, Option<read_progress::Model>);
pub type MediaWithProgress = (media::Model, read_progress::Model);
pub type GetMediaWithProgress = Vec<MediaWithProgress>;
pub type UserMediaWithProgress = (media::Model, Option<read_progress::Model>);
pub type GetUserMediaWithProgress = Vec<UserMediaWithProgress>;
