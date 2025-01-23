use tauri::Manager;
#[tauri::command]
async fn create_window(app: tauri::AppHandle) {
    // Not able to create more than one new window
    // The second argument in builder could not be a variable or something (not sure why)
    // In Rust, not sure how global variables are created as well -.-
    let webview_url = tauri::WebviewUrl::App("index.html".into());
    let window = tauri::WebviewWindowBuilder::new(&app, "first", webview_url.clone())
                .title("First")
                .build()
                .unwrap();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_websocket::init())
        .setup(|app| {
            let webview_url = tauri::WebviewUrl::App("index.html".into());
            #[cfg(debug_assertions)]
            app.get_webview_window("main").unwrap().open_devtools(); 
            // tauri::WebviewWindowBuilder::new(app, "first", webview_url.clone())
            //     .title("First")
            //     .build()?;
            // tauri::WebviewWindowBuilder::new(app, "second", webview_url)
            //     .title("Second")
            //     .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![create_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
