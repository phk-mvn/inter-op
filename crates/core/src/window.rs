use crate::ipc::IpcMessage;
use std::path::PathBuf;

/// События жизненного цикла окна
#[derive(Debug, Clone)]
pub enum WindowEvent {
    Created,
    Closed,
    Resized { width: u32, height: u32 },
    Moved { x: i32, y: i32 },
    IpcReceived(IpcMessage),
}

/// Начальные параметры создания окна (аналог BrowserWindowOptions в Electron)
#[derive(Debug, Clone)]
pub struct WindowOptions {
    pub title: String,
    pub width: u32,
    pub height: u32,
    pub resizable: bool,
    pub frameless: bool,
    pub devtools: bool,
    /// Путь к пользовательскому preload скрипту (JS)
    pub preload_script: Option<PathBuf>,
    /// Изоляция контекста (как Electron contextIsolation). true — мост недоступен для
    /// перезаписи из кода страницы (window.ipcRenderer замораживается).
    pub context_isolation: bool,
    /// Node.js внутри WebView2 недоступен — всегда false. Опция оставлена для API-параллели.
    pub node_integration: bool,
}

impl Default for WindowOptions {
    fn default() -> Self {
        Self {
            title: "Light Electron Window".to_string(),
            width: 800,
            height: 600,
            resizable: true,
            frameless: false,
            devtools: false,
            preload_script: None,
            context_isolation: true,
            node_integration: false,
        }
    }
}

/// Главный трейт для бэкенда каждого движка (WebKitGTK, WebView2, IE11)
pub trait WindowBackend: Send + Sync {
    /// Загрузить страницу по URL (http://, https://, file://)
    fn load_url(&mut self, url: &str) -> Result<(), Box<dyn std::error::Error>>;

    /// Загрузить сырой HTML-контент
    fn load_html(&mut self, html: &str) -> Result<(), Box<dyn std::error::Error>>;

    /// Выполнить JavaScript в контексте страницы
    fn execute_script(&mut self, script: &str) -> Result<(), Box<dyn std::error::Error>>;

    /// Отправить IPC-сообщение в Webview (Renderer процесс)
    fn send_ipc(&mut self, message: &IpcMessage) -> Result<(), Box<dyn std::error::Error>> {
        let serialized = message.to_json()?;
        // Вызов глобального обработчика в JS
        let js = format!("window.__native_ipc_dispatch({});", serialized);
        self.execute_script(&js)
    }

    /// Изменение размеров
    fn set_size(&mut self, width: u32, height: u32) -> Result<(), Box<dyn std::error::Error>>;

    /// Изменение заголовка окна
    fn set_title(&mut self, title: &str) -> Result<(), Box<dyn std::error::Error>>;

    /// Показать окно
    fn show(&mut self) -> Result<(), Box<dyn std::error::Error>>;

    /// Скрыть окно
    fn hide(&mut self) -> Result<(), Box<dyn std::error::Error>>;

    /// Закрыть окно
    fn close(&mut self) -> Result<(), Box<dyn std::error::Error>>;
}