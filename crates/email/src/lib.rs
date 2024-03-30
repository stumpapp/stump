mod emailer;
mod error;
mod template;

pub use emailer::{AttachmentPayload, EmailerClient, EmailerClientConfig};
pub use error::{EmailError, EmailResult};
pub use template::{render_template, Template as EmailTemplate};

pub use lettre::message::header::ContentType as EmailContentType;
