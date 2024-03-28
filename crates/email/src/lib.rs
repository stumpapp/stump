mod emailer;
mod error;
mod template;

pub use emailer::{EmailerClient, EmailerClientConfig};
pub use error::{EmailError, EmailResult};
pub use template::render_template;

pub use lettre::message::header::ContentType as EmailContentType;
