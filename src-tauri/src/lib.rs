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
    // TODO: As we are accessing a dynamic path, functions such as im should have some path like '/im/group1' and '/im/group2'. The window_id will be the same
    if (app.get_webview_window(&name)).is_some() {
        app.get_webview_window(&name).unwrap().set_focus().unwrap();
    } else {
        let new_name = name.clone(); // Rust points the reference to the same memory address
        let mut state = state.lock().unwrap();
        let window_id = format!("{}", new_name);
        let path: PathBuf = Path::new(window_names.get(&new_name).unwrap()).into();
        let webview_url = tauri::WebviewUrl::App(path);
        tauri::WebviewWindowBuilder::new(&app, &window_id, webview_url.clone())
            .title("Instant Messaging")
            .build()
            .unwrap();
        // At the end of the scope, it will lock the mutex again
        state.window_id += 1;
    }
    // This will unlock the mutex with .unwrap(), and thus accessing the state of
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
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{
                    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
                };

                let ctrl_n_shortcut = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyN);
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |app, shortcut, event| {
                            println!("{:?}", shortcut);
                            if shortcut == &ctrl_n_shortcut {
                                match event.state() {
                                    ShortcutState::Pressed => {
                                        println!("Ctrl-N Pressed!");
                                    }
                                    ShortcutState::Released => {
                                        app.get_webview_window("main")
                                            .unwrap()
                                            .set_focus()
                                            .unwrap();
                                    }
                                }
                            }
                        })
                        .build(),
                )?;

                app.global_shortcut().register(ctrl_n_shortcut)?;
            }
            app.manage(Mutex::new(AppState::default()));
            #[cfg(debug_assertions)]
            app.get_webview_window("main").unwrap().open_devtools();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![create_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
