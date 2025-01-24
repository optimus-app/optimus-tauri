use tauri::{Builder, Manager};
use std::sync::Mutex;

#[tauri::command]
async fn create_window(app: tauri::AppHandle, state: tauri::State<'_, Mutex<AppState>>) -> Result<(), String> {
    // This will unlock the mutex with .unwrap(), and thus accessing the state of
    let mut state = state.lock().unwrap();
    let window_id = format!("window_{}", state.window_id);
    println!("{}", window_id);
    let webview_url = tauri::WebviewUrl::App("index.html".into());
    let window = tauri::WebviewWindowBuilder::new(&app, &window_id, webview_url.clone())
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
