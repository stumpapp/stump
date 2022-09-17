#![cfg_attr(
	all(not(debug_assertions), target_os = "windows"),
	windows_subsystem = "windows"
)]

// TODO: https://github.com/tauri-apps/tauri-plugin-store
// TODO: https://tauri.app/v1/guides/features/menu

mod utils;

// use utils::menu;

fn main() {
	tauri::Builder::default()
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
