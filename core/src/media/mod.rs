pub mod analysis;
pub(crate) mod prepare;
pub mod processor;
pub mod series;
mod utils;

#[cfg(test)]
pub(crate) use tests::fixtures;
