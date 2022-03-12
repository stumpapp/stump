use entity::series;
use rocket::{
    response::content::Json,
    serde::{json, Deserialize, Serialize},
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub enum EventType {
    SeriesCreated,

    ScanStarted,
    ScanProgress,
    ScanCompleted,
}

// pub struct ScanStartedEvent {

// }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct Event {
    pub event_type: EventType,
    pub data: Option<json::Value>,
}

impl Event {
    pub fn new(event_type: EventType, data: Option<json::Value>) -> Event {
        Event { event_type, data }
    }

    pub fn series_created(series: series::Model) -> Event {
        Event::new(
            EventType::SeriesCreated,
            Some(json::serde_json::to_value(series).expect("Failed to serialize series")),
        )
    }
}
