use serde::Serialize;

use crate::types::alias::{MediaModel, SeriesModel};

#[derive(Serialize, Debug)]
pub struct GetSeriesById {
    pub series: SeriesModel,
    pub media: Vec<MediaModel>,
}

impl Into<GetSeriesById> for (SeriesModel, Vec<MediaModel>) {
    fn into(self) -> GetSeriesById {
        GetSeriesById {
            series: self.0,
            media: self.1,
        }
    }
}
