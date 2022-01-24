use crate::{
    database::entities::library,
    fs::checksum::Crc,
    types::dto::{GetMediaQuery, GetMediaQueryResult},
};
use sea_orm::DatabaseConnection;
use std::{collections::HashMap, fs, path::PathBuf};

pub struct Scanner<'a> {
    pub db: &'a DatabaseConnection,
    pub libraries: Vec<library::Model>,
    pub media: HashMap<String, GetMediaQuery>,
}

pub trait IgnoredFile {
    fn should_ignore(&self) -> bool;
}

impl IgnoredFile for PathBuf {
    fn should_ignore(&self) -> bool {
        let path = self.to_str().unwrap();

        if self.file_name().unwrap().to_str().unwrap().starts_with(".") {
            return true;
        }

        if path.ends_with(".DS_Store") {
            return true;
        }

        false
    }
}

impl<'a> Scanner<'a> {
    pub fn new(
        db: &'a DatabaseConnection,
        libraries: Vec<library::Model>,
        media: GetMediaQueryResult,
    ) -> Self {
        let mut hashmap = HashMap::new();

        for media in media {
            hashmap.insert(media.checksum.clone(), media);
        }

        Self {
            db,
            libraries,
            media: hashmap,
        }
    }

    fn scan_library(&self, library_path: PathBuf, library: &library::Model) {
        // get all files in the library.path directory
        let files = fs::read_dir(library_path).unwrap();

        for file in files {
            let file = file.unwrap();
            let path = file.path();

            if path.is_dir() {
                self.scan_library(path, library);
            } else if !path.should_ignore() {
                let mut crc = Crc::new(path.to_str().unwrap());
                // FIXME: terribly slow!
                let checksum = crc.checksum();

                if !self.media.contains_key(&checksum) {
                    println!("New file found: {}", path.to_str().unwrap());
                } else {
                    println!("Already present in database: {}", path.to_str().unwrap());
                }
            }
        }

        // generate a checksum for each file and check if it exists in the database
    }

    pub fn scan(&self) -> usize {
        for library in self.libraries.iter() {
            let path = PathBuf::from(&library.path);
            self.scan_library(path, library);
        }

        0
    }
}
