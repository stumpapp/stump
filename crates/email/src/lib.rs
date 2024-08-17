//! Email module for sending emails using SMTP. This module uses the `lettre` crate to send emails,
//! and the `handlebars` crate to render email templates.

#![warn(clippy::dbg_macro)]

/// A module containing the emailer client and its configuration, as well as the sending of emails
mod emailer;
/// A module containing the error type for this crate
mod error;
/// A module containing the template rendering functionality, via the `handlebars` crate
mod template;

pub use emailer::{AttachmentPayload, EmailerClient, EmailerClientConfig};
pub use error::{EmailError, EmailResult};
pub use template::{render_template, EmailTemplate};

pub use lettre::message::header::ContentType as EmailContentType;
