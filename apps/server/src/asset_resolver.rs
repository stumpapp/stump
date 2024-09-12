pub trait AssetResolverExt {
	fn get_embedded_asset(&self, path: &str) -> Option<(String, Vec<u8>)>;
}
