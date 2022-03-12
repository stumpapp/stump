use crate::fs::error::ProcessFileError;
use crate::fs::media_file::{self, GetPageResult, ProcessResult};
use epub::doc::EpubDoc;
use walkdir::DirEntry;

pub fn process_epub(file: &DirEntry) -> ProcessResult {
    unimplemented!()
}

// FIXME: error handling here is nasty
pub fn get_epub_page(file: &str, page: usize) -> GetPageResult {
    let res = EpubDoc::new(file);

    match res {
        Ok(mut doc) => {
            if page == 0 {
                let content_type = media_file::get_content_type_from_mime("image/png");
                let contents = doc
                    .get_cover()
                    .map_err(|e| ProcessFileError::EpubReadError(e.to_string()))?;

                return Ok((content_type, contents));
            }
            let _ = doc
                .set_current_page(page)
                .map_err(|e| ProcessFileError::EpubReadError(e.to_string()))?;

            let mime_type = doc
                .get_current_mime()
                .map_err(|e| ProcessFileError::EpubReadError(e.to_string()))?;

            let contents = doc
                .get_current()
                .map_err(|e| ProcessFileError::EpubReadError(e.to_string()))?;

            let content_type = media_file::get_content_type_from_mime(&mime_type);

            Ok((content_type, contents))
        }
        Err(e) => Err(ProcessFileError::EpubReadError(e.to_string())),
    }
}

pub fn get_container_xml(file: &str, resource: &str) -> Option<String> {
    let res = EpubDoc::new(file);

    match res {
        Ok(doc) => {
            println!("{:?}", doc.resources);
            doc.resources.get(resource).map(|(path, s)| s.to_owned())
        }
        Err(_) => unimplemented!(),
    }
}
