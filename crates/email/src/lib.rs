mod emailer;
mod error;

pub use emailer::{EmailerClient, EmailerClientConfig, EmailerSMTPHost};
pub use error::{EmailError, EmailResult};

pub use lettre::message::header::ContentType as EmailContentType;
