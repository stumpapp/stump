mod event;
mod log;

use event::EventSubscription;
use log::LogSubscription;

#[derive(async_graphql::MergedSubscription, Default)]
pub struct Subscription(LogSubscription, EventSubscription);
