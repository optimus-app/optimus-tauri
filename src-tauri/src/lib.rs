use lazy_static::lazy_static;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::Manager;

lazy_static! {
    static ref window_names: HashMap<String, String> = {
        let mut m = HashMap::new();
        m.insert("im".to_string(), "http://localhost:3000/im".to_string());
        m.insert(
            "other".to_string(),
            "http://localhost:3000/other".to_string(),
        );
        m
    };
}

#[tauri::command]
async fn create_window(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
    name: String,
) -> Result<(), String> {
    // This will unlock the mutex with .unwrap(), and thus accessing the state of
    let mut state = state.lock().unwrap();
    let window_id = format!("{}", name);
    let path: PathBuf = Path::new(window_names.get(&name).unwrap()).into();
    // println!("{}", window_id);
    let webview_url = tauri::WebviewUrl::App(path);
    tauri::WebviewWindowBuilder::new(&app, &window_id, webview_url.clone())
        .title(&window_id)
        .build()
        .unwrap();
    // At the end of the scope, it will lock the mutex again
    state.window_id += 1;
    Ok(())
}

#[derive(Default)]
struct AppState {
    window_id: u8,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            app.manage(Mutex::new(AppState::default()));
            #[cfg(debug_assertions)]
            app.get_webview_window("main").unwrap().open_devtools();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![create_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
