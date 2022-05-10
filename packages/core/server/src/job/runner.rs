use serde::{Deserialize, Serialize};

use super::{Job, JobUpdate};

// https://api.rocket.rs/v0.5-rc/rocket/response/stream/struct.EventStream.html

#[derive(Clone, Serialize, Deserialize)]
pub enum RunnerEvent {
    Progress(Vec<JobUpdate>),
    Completed,
    Failed,
}

pub struct Runner {}

impl Runner {
    pub fn new(job: Box<dyn Job>) -> Self {
        unimplemented!()
    }
}
