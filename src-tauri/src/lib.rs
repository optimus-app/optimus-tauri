use lazy_static::lazy_static;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Emitter, EventTarget, Listener, Manager};

lazy_static! {
    static ref window_names: HashMap<String, String> = {
        let mut m = HashMap::new();
        m.insert("im".to_string(), "http://localhost:3000/im".to_string());
        m.insert(
            "dashboard".to_string(),
            "http://localhost:3000/dashboard".to_string(),
        );
        m.insert(
            "trade-exec".to_string(),
            "http://localhost:3000/orders".to_string(),
        );
        m.insert(
            "backtest".to_string(),
            "http://localhost:3000/backtest".to_string(),
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
    println!("Creating window: {}", name);
    let new_name = name.clone();
    let window_id = format!("{}", new_name);
    let _ = if let Some(existing_window) = app.get_webview_window(&name) {
        existing_window.set_focus().unwrap();
        let _ = app.emit_to(EventTarget::webview_window("im"), "window_created", ());
        existing_window
    } else {
        let mut state = state.lock().unwrap();
        println!("New window id: {}", window_id);

        let path: PathBuf = Path::new(window_names.get(&new_name).unwrap()).into();
        let webview_url = tauri::WebviewUrl::App(path);

        let window = tauri::WebviewWindowBuilder::new(&app, &window_id, webview_url.clone())
            .title(&name)
            .decorations(false)
            .inner_size(1200.00, 800.00)
            .build()
            .unwrap();

        window.open_devtools();
        state.window_id += 1;
        window
    };
    println!("Window creation completed for: {}", name);
    let _ = app.emit_to(EventTarget::webview_window("im"), "cmd_request", ());
    Ok(())
}

#[tauri::command]
async fn command_handling(
    app: tauri::AppHandle,
    args: String,
    command: String,
) -> Result<(), String> {
    // Check if args is empty
    println!("Command: {}", command);
    println!("Args: {}", args);
    if args.is_empty() {
        Ok(())
    } else {
        match command.as_str() {
            "im" => {
                let _ = app.emit_to(
                    EventTarget::webview_window("im"),
                    "target_field",
                    args.clone(),
                );
            }
            _ => {
                println!("Command not found: {}", command);
            }
        }
        Ok(())
    }
}

// async fn command_name(state: tauri::State<'_, MyState>) -> Result<(), String> {
//   *state.s.lock().unwrap() = "new string".into();
//   state.t.lock().unwrap().insert("key".into(), "value".into());
//   Ok(())
// }

// #[derive(Default)]
// struct MyState {
//   s: std::sync::Mutex<String>,
//   t: std::sync::Mutex<std::collections::HashMap<String, String>>,
// }
// remember to call `.manage(MyState::default())`

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
                app.listen_any("test", |event| {
                    println!("Recived event: {:?}", event.payload());
                });

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
        .invoke_handler(tauri::generate_handler![create_window, command_handling])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
