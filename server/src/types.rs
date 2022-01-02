use std::collections::HashMap;

use crate::database::entities::{media, series};

pub type SeriesAndMedia = (series::Model, Vec<media::Model>);

/// Tuple of a series and a hashmap of media file checksums and their corresponding media models.
pub type SeriesAndMediaHashed = (series::Model, HashMap<String, media::Model>);
