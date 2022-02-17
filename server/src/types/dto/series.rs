use rocket::serde::Serialize;

use crate::types::alias::{MediaModel, SeriesModel};

#[derive(Serialize, Debug)]
#[serde(crate = "rocket::serde")]
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
