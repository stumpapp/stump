use super::{event::Event, log::Log};
use rocket::tokio::sync::broadcast::{channel, Receiver, Sender};

pub struct EventHandler {
    pub log_queue: Sender<Log>,
    pub event_queue: Sender<Event>,
}

// TODO: error handling
impl EventHandler {
    pub fn new() -> Self {
        EventHandler {
            log_queue: channel::<Log>(1024).0,
            event_queue: channel::<Event>(1024).0,
        }
    }

    pub fn event_subscribe(&self) -> Receiver<Event> {
        self.event_queue.subscribe()
    }

    pub fn log_subscribe(&self) -> Receiver<Log> {
        self.log_queue.subscribe()
    }

    pub fn emit_event(&self, event: Event) {
        let _ = self.event_queue.send(event);
    }

    pub fn log_error(&self, message: String) -> Log {
        let log = Log::error(message);
        let _ = self.log_queue.send(log.clone());
        log
    }

    pub fn log_warn(&self, message: String) -> Log {
        let log = Log::warn(message);
        let _ = self.log_queue.send(log.clone());
        log
    }

    pub fn log_info(&self, message: String) -> Log {
        let log = Log::info(message);
        let _ = self.log_queue.send(log.clone());
        log
    }

    pub fn log_debug(&self, message: String) -> Log {
        let log = Log::debug(message);
        let _ = self.log_queue.send(log.clone());
        log
    }
}
