use napi::bindgen_prelude::*;
use napi::threadsafe_function::ThreadSafeCallContext;
use napi_derive::napi;
use light_core::{WindowBackend, WindowOptions, IpcMessage, WindowEvent};
use light_backend_webview2::WebView2Window;
use std::sync::Arc;
use std::sync::mpsc::channel;
use parking_lot::Mutex;
use crate::napi_ipc::{JsIpcCallback, NodeIpcEmitter, NodeWindowEventEmitter, JsEventCallback};

fn window_event_to_json(event: &WindowEvent) -> String {
    match event {
        WindowEvent::Created => r#"{"type":"created"}"#.to_string(),
        WindowEvent::Closed => r#"{"type":"closed"}"#.to_string(),
        WindowEvent::Resized { width, height } => {
            format!(r#"{{"type":"resized","width":{},"height":{}}}"#, width, height)
        }
        WindowEvent::Moved { x, y } => {
            format!(r#"{{"type":"moved","x":{},"y":{}}}"#, x, y)
        }
        WindowEvent::IpcReceived(_) => r#"{"type":"ipc"}"#.to_string(),
    }
}

#[napi(object)]
pub struct JsWindowOptions {
    pub title: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub resizable: Option<bool>,
    pub frameless: Option<bool>,
    pub devtools: Option<bool>,
    #[napi(js_name = "preloadScript")]
    pub preload_script: Option<String>,
    #[napi(js_name = "contextIsolation")]
    pub context_isolation: Option<bool>,
    #[napi(js_name = "nodeIntegration")]
    pub node_integration: Option<bool>,
}

#[napi]
pub struct NativeWindow {
    backend: Arc<Mutex<Option<Box<dyn WindowBackend>>>>,
    emitter: Arc<Mutex<NodeIpcEmitter>>,
    event_emitter: Arc<Mutex<NodeWindowEventEmitter>>,
}

#[napi]
impl NativeWindow {
    #[napi(constructor)]
    pub fn new(options: JsWindowOptions) -> Result<Self> {
        let opts = WindowOptions {
            title: options.title.unwrap_or_else(|| "Light Electron App".into()),
            width: options.width.unwrap_or(800),
            height: options.height.unwrap_or(600),
            resizable: options.resizable.unwrap_or(true),
            frameless: options.frameless.unwrap_or(false),
            devtools: options.devtools.unwrap_or(false),
            preload_script: options.preload_script.map(std::path::PathBuf::from),
            context_isolation: options.context_isolation.unwrap_or(true),
            node_integration: options.node_integration.unwrap_or(false),
        };

        let (ipc_tx, ipc_rx) = channel::<IpcMessage>();
        let (event_tx, event_rx) = channel::<WindowEvent>();

        let window = WebView2Window::new(opts, ipc_tx, event_tx)
            .map_err(|e| Error::from_reason(format!("Failed to create WebView2 window: {}", e)))?;

        let emitter = Arc::new(Mutex::new(NodeIpcEmitter::new()));
        let emitter_clone = emitter.clone();

        // Фоновый поток для пересылки входящих IPC-сообщений из UI потока в Node.js
        std::thread::spawn(move || {
            while let Ok(msg) = ipc_rx.recv() {
                emitter_clone.lock().emit(&msg);
            }
        });

        let event_emitter = Arc::new(Mutex::new(NodeWindowEventEmitter::new()));
        let event_emitter_clone = event_emitter.clone();

        // Фоновый поток для пересылки событий жизненного цикла окна в Node.js
        std::thread::spawn(move || {
            while let Ok(event) = event_rx.recv() {
                event_emitter_clone.lock().emit(window_event_to_json(&event));
            }
        });

        Ok(Self {
            backend: Arc::new(Mutex::new(Some(Box::new(window)))),
            emitter,
            event_emitter,
        })
    }

    #[napi]
    pub fn set_ipc_callback(&self, callback: JsFunction) -> Result<()> {
        let tsfn: JsIpcCallback = callback.create_threadsafe_function(0, |ctx: ThreadSafeCallContext<String>| {
            ctx.env.create_string(&ctx.value).map(|v| vec![v])
        })?;

        self.emitter.lock().set_callback(tsfn);
        Ok(())
    }

    #[napi]
    pub fn set_event_callback(&self, callback: JsFunction) -> Result<()> {
        let tsfn: JsEventCallback = callback.create_threadsafe_function(0, |ctx: ThreadSafeCallContext<String>| {
            ctx.env.create_string(&ctx.value).map(|v| vec![v])
        })?;

        self.event_emitter.lock().set_callback(tsfn);
        Ok(())
    }

    #[napi]
    pub fn load_url(&self, url: String) -> Result<()> {
        if let Some(ref mut backend) = *self.backend.lock() {
            backend.load_url(&url).map_err(|e| Error::from_reason(e.to_string()))?;
        }
        Ok(())
    }

    #[napi]
    pub fn load_html(&self, html: String) -> Result<()> {
        if let Some(ref mut backend) = *self.backend.lock() {
            backend.load_html(&html).map_err(|e| Error::from_reason(e.to_string()))?;
        }
        Ok(())
    }

    #[napi]
    pub fn execute_script(&self, script: String) -> Result<()> {
        if let Some(ref mut backend) = *self.backend.lock() {
            backend.execute_script(&script).map_err(|e| Error::from_reason(e.to_string()))?;
        }
        Ok(())
    }

    #[napi]
    pub fn send_ipc(&self, channel: String, payload: serde_json::Value) -> Result<()> {
        if let Some(ref mut backend) = *self.backend.lock() {
            let msg = IpcMessage::new(channel, payload);
            backend.send_ipc(&msg).map_err(|e| Error::from_reason(e.to_string()))?;
        }
        Ok(())
    }

    #[napi]
    pub fn show(&self) -> Result<()> {
        if let Some(ref mut backend) = *self.backend.lock() {
            backend.show().map_err(|e| Error::from_reason(e.to_string()))?;
        }
        Ok(())
    }

    #[napi]
    pub fn hide(&self) -> Result<()> {
        if let Some(ref mut backend) = *self.backend.lock() {
            backend.hide().map_err(|e| Error::from_reason(e.to_string()))?;
        }
        Ok(())
    }

    #[napi]
    pub fn set_size(&self, width: u32, height: u32) -> Result<()> {
        if let Some(ref mut backend) = *self.backend.lock() {
            backend.set_size(width, height).map_err(|e| Error::from_reason(e.to_string()))?;
        }
        Ok(())
    }

    #[napi]
    pub fn set_title(&self, title: String) -> Result<()> {
        if let Some(ref mut backend) = *self.backend.lock() {
            backend.set_title(&title).map_err(|e| Error::from_reason(e.to_string()))?;
        }
        Ok(())
    }

    #[napi]
    pub fn close(&self) -> Result<()> {
        if let Some(ref mut backend) = *self.backend.lock() {
            backend.close().map_err(|e| Error::from_reason(e.to_string()))?;
        }
        Ok(())
    }
}