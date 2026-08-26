// 防止 Windows release 模式弹出控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Emitter, Manager, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_notification::NotificationExt;

/// 托盘"今日收入"菜单项句柄，前端通过命令更新文字
struct TrayState {
    earnings: Mutex<Option<tauri::menu::MenuItem<tauri::Wry>>>,
}

// ===== Tauri 命令 =====

#[tauri::command]
fn update_tray_earnings(app: tauri::AppHandle, text: String) -> Result<(), String> {
    let state = app.state::<TrayState>();
    let guard = state.earnings.lock().map_err(|e| e.to_string())?;
    if let Some(item) = guard.as_ref() {
        item.set_text(text).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn show_main(app: tauri::AppHandle, section: Option<String>) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
        if let Some(s) = section {
            let _ = app.emit_to("main", "navigate", s);
        }
    }
    Ok(())
}

#[tauri::command]
fn toggle_widget(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("widget") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            let _ = w.show();
            let _ = w.set_focus();
        }
    }
    Ok(())
}

#[tauri::command]
fn set_widget_on_top(app: tauri::AppHandle, on_top: bool) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("widget") {
        w.set_always_on_top(on_top).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn set_widget_size(app: tauri::AppHandle, w: f64, h: f64) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("widget") {
        win.set_size(tauri::LogicalSize::new(w, h))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 触发 OS 通知（喝水/站立提醒）
#[tauri::command]
fn show_notification(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 单实例：第二个启动时聚焦主窗口
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--start-hidden"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .manage(TrayState {
            earnings: Mutex::new(None),
        })
        .setup(|app| {
            // ===== 构建托盘菜单 =====
            let title = MenuItemBuilder::with_id("title", "Fish")
                .enabled(false)
                .build(app)?;
            let earnings = MenuItemBuilder::with_id("earnings", "今日 ¥0.00")
                .enabled(false)
                .build(app)?;
            let open = MenuItemBuilder::with_id("open_main", "打开主界面").build(app)?;
            let toggle = MenuItemBuilder::with_id("toggle_widget", "显示/隐藏桌面卡片").build(app)?;
            let fish = MenuItemBuilder::with_id("fish", "开始摸鱼").build(app)?;
            let goals = MenuItemBuilder::with_id("goals", "目标").build(app)?;
            let settings = MenuItemBuilder::with_id("settings", "设置").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&title)
                .item(&earnings)
                .separator()
                .item(&open)
                .item(&toggle)
                .item(&fish)
                .separator()
                .item(&goals)
                .item(&settings)
                .separator()
                .item(&quit)
                .build()?;

            let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))?;

            TrayIconBuilder::with_id("tray")
                .icon(icon)
                .tooltip("Fish")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "quit" => app.exit(0),
                        "open_main" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "toggle_widget" => {
                            if let Some(w) = app.get_webview_window("widget") {
                                if w.is_visible().unwrap_or(false) {
                                    let _ = w.hide();
                                } else {
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                }
                            }
                        }
                        "fish" => {
                            let _ = app.emit_to("widget", "tray-action", "fish");
                            let _ = app.emit_to("main", "tray-action", "fish");
                        }
                        "goals" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                            let _ = app.emit_to("main", "navigate", "goals");
                        }
                        "settings" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                            let _ = app.emit_to("main", "navigate", "settings");
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // 保存 earnings 菜单项句柄供命令更新
            *app.state::<TrayState>()
                .earnings
                .lock()
                .map_err(|_| "lock error")? = Some(earnings);

            // ===== 主窗口关闭 → 隐藏到托盘而非退出 =====
            if let Some(main_win) = app.get_webview_window("main") {
                let mw = main_win.clone();
                main_win.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = mw.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            update_tray_earnings,
            show_main,
            toggle_widget,
            set_widget_on_top,
            set_widget_size,
            show_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running Fish");
}
