use sha256::digest_file;
use std::path::Path;

pub struct Crc {
    pub checksum: String,
    path: String,
}

// FIXME: this is terribly slow... I need to determine if there is a faster way
// to do this, otherwise maybe instead of storing checksums in the database to
// ensure there are no duplicated files I can just take the risk and compare
// url paths. It won't prevent duplicates, but it will take significantly less time.
impl Crc {
    pub fn new(file_path: &str) -> Crc {
        Crc {
            checksum: String::default(),
            path: file_path.to_string(),
        }
    }

    pub fn checksum(&mut self) -> String {
        let path = Path::new(&self.path);

        self.checksum = digest_file(path).unwrap();

        self.get_checksum()
    }

    pub fn get_checksum(&self) -> String {
        self.checksum.clone()
    }
}
