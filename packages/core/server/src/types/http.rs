use std::{
	io::{Cursor, SeekFrom},
	num::ParseIntError,
	str::FromStr,
};

use rocket::{
	fs::NamedFile,
	futures::executor::block_on,
	http::{ContentType, Status},
	response::{self, Responder},
	// serde::json::Json,
	tokio::io::AsyncSeekExt,
	Request,
	Response,
};
// use serde::Serialize;

// use super::pageable::Pageable;

#[derive(Responder)]
#[response(content_type = "xml")]
pub struct XmlResponse(pub String);

pub struct UnauthorizedResponse;

impl<'r> Responder<'r, 'static> for UnauthorizedResponse {
	fn respond_to(self, _: &'r Request<'_>) -> response::Result<'static> {
		println!("Responding to request");
		Response::build()
			// .sized_body(self.0.len(), Cursor::new(self.0))
			// .header(ContentType::XML)
			.raw_header("Authorization", "Basic")
			.raw_header("WWW-Authenticate", "Basic realm=\"stump\"")
			.ok()
	}
}

pub type ImageResponse = (ContentType, Vec<u8>);

pub struct ImageResponseCached {
	// size: u64,
	pub data: Vec<u8>,
	pub content_type: ContentType,
}

impl<'r> Responder<'r, 'static> for ImageResponseCached {
	fn respond_to(self, _: &'r Request<'_>) -> response::Result<'static> {
		Response::build()
			.sized_body(self.data.len(), Cursor::new(self.data))
			// 10 minutes
			.raw_header("Cache-Control", "private,max-age=600")
			.header(self.content_type)
			.ok()
	}
}

// pub struct PageableResponse<T: Serialize>(pub Pageable<T>);

// // TODO: figure out if this is best method for this, and if so make it :)
// impl<'r, T> Responder<'r, 'static> for PageableResponse<T>
// where
// 	T: Serialize,
// {
// 	fn respond_to(self, req: &'r Request<'_>) -> response::Result<'static> {
// 		// let _links = &self._links;

// 		let unpaged = req.query_value::<bool>("unpaged").unwrap_or(Ok(true));

// 		if unpaged.is_err() {
// 			let e = format!("{:?}", unpaged.err().unwrap());

// 			log::debug!("Error in Pageable Response: {:?}", e);

// 			return Response::build()
// 				.status(Status::InternalServerError)
// 				.sized_body(e.len(), Cursor::new(e))
// 				.ok();
// 		}

// 		let unpaged = unpaged.unwrap();

// 		let mut response = self.0.respond_to(req)?;

// 		if unpaged {
// 			// Response::from(self)
// 			// return Response::build_from(Json(self.0));
// 		}

// 		todo!()
// 	}
// }

struct Range {
	pub ranges: Vec<u64>,
}

impl FromStr for Range {
	type Err = ParseIntError;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		let base_str = s.replace("bytes=", "");

		let mut ranges = Vec::<u64>::new();

		// Split the Range req header (bytes=0-, bytes=0-10, etc) and ignore empty strings
		let nums: Vec<&str> = base_str.split('-').filter(|&x| !x.is_empty()).collect();

		for num in nums {
			ranges.push(num.parse::<u64>()?);
		}

		Ok(Range { ranges })
	}
}

// Note: adding this in just in case I decide to add support for audio files,
// which implementing partial repsonses for would be nice
pub struct PartialContent(pub NamedFile);

// FIXME: currently I get `Failed to write response: channel closed.` I have a ~feeling~ this is
// might be bc of the async stuff I do here but use `block_on` since responder is NOT async.
// Otherwise, it seemingly works OK.
impl<'r> Responder<'r, 'static> for PartialContent {
	// https://httpwg.org/specs/rfc7233.html#rule.ranges-specifier
	fn respond_to(self, req: &'r Request<'_>) -> response::Result<'static> {
		let range_header = req.headers().get_one("Range").map(|x| Range::from_str(x));

		let mut named_file = self.0;
		let file = named_file.file_mut();

		let size = block_on(file.seek(SeekFrom::End(0)))
			.expect("Attempted to retrieve size by seeking, but failed.");

		match range_header {
			Some(Ok(range)) => {
				// println!("ranges: {:?}", range.ranges);

				let (start, end) = match range.ranges.len() {
					1 => (range.ranges[0], size - 1),
					2 => (range.ranges[0], range.ranges[1]),
					_ => (0, size),
				};

				// TODO: figure out this, taken from https://github.com/SergioBenitez/Rocket/pull/887
				// let (start, end) = match ranges[0] {
				//     ByteRangeSpec::FromTo(start, mut end) => {
				//         // make end exclusive
				//         end += 1;
				//         if end > size {
				//             end = size;
				//         }
				//         (start, end)
				//     }
				//     ByteRangeSpec::AllFrom(start) => (start, size),
				//     ByteRangeSpec::Last(len) => {
				//         // we could seek to SeekFrom::End(-len), but if we reach a value < 0, that is an error.
				//         // but the RFC reads:
				//         //      If the selected representation is shorter than the specified
				//         //      suffix-length, the entire representation is used.
				//         let start = size.checked_sub(len).unwrap_or(0);
				//         (start, size)
				//     }
				// };

				if start > size {
					return Response::build()
						.status(Status::RangeNotSatisfiable)
						.raw_header("Accept-Ranges", "bytes")
						.ok();
				}

				block_on(file.seek(SeekFrom::Start(start))).expect(
					"Attempted to seek to the start of the requested range, but failed.",
				);

				let mut response = named_file.respond_to(req)?;

				response.set_status(Status::PartialContent);
				response.adjoin_raw_header("Accept-Ranges", "bytes");
				response.adjoin_raw_header(
					"Content-Range",
					format!("bytes {}-{}/{}", start, end, size),
				);
				response
					.adjoin_raw_header("Content-Length", format!("{}", end - start + 1));

				Ok(response)
			},
			Some(Err(_)) => {
				// Malformed
				Response::build()
					.status(Status::RangeNotSatisfiable)
					.raw_header("Accept-Ranges", "bytes")
					.ok()
			},
			None => {
				// No range header
				let mut response = named_file.respond_to(req)?;
				response.adjoin_raw_header("Accept-Ranges", "bytes");
				Ok(response)
			},
		}
	}
}
