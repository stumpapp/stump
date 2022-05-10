use std::{collections::HashMap, sync::Arc};

use rocket::tokio::sync::Mutex;

use crate::config::context::Context;

use super::{runner::Runner, Job};

// https://github.com/SergioBenitez/Rocket/blob/master/examples/state/src/managed_queue.rs
// https://github.com/SergioBenitez/Rocket/issues/714

pub struct Jobs {
    queue: HashMap<String, Arc<Mutex<Runner>>>,
}

impl Jobs {
    pub fn new() -> Self {
        Jobs {
            queue: HashMap::new(),
        }
    }

    pub async fn enqueue(&mut self, job: Box<dyn Job>, ctx: &Context) {
        let runner = Runner::new(job);

        unimplemented!()
    }

    pub async fn kill_job(&mut self, thread: String) {
        unimplemented!()
    }
}
