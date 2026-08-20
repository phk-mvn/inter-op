use light_core::{IpcMessage, WindowBackend, WindowOptions};
use std::result::Result as StdResult;
use std::sync::mpsc::{channel, Receiver, Sender};
use webview2_com::Microsoft::Web::WebView2::Win32::{
    CreateCoreWebView2EnvironmentWithOptions,
    ICoreWebView2,
    ICoreWebView2Controller,
    ICoreWebView2EnvironmentOptions,
};
use webview2_com::{
    CoreWebView2EnvironmentOptions,
    CreateCoreWebView2ControllerCompletedHandler,
    CreateCoreWebView2EnvironmentCompletedHandler,
    WebMessageReceivedEventHandler,
};
use windows::core::{w, PCWSTR, PWSTR};
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::UpdateWindow;
use windows::Win32::System::Com::{CoInitializeEx, COINIT_APARTMENTTHREADED};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::WindowsAndMessaging::*;

const WM_USER_DISPATCH: u32 = WM_USER + 101;

enum WindowCommand {
    LoadUrl(String),
    LoadHtml(String),
    ExecuteScript(String),
    SendIpc(IpcMessage),
    Show,
    Hide,
    SetSize(u32, u32),
    SetTitle(String),
    Close,
}

pub struct WebView2Window {
    cmd_sender: Sender<WindowCommand>,
    hwnd: HWND,
}

unsafe impl Send for WebView2Window {}
unsafe impl Sync for WebView2Window {}

impl WebView2Window {
    pub fn new(options: WindowOptions, ipc_sender: Sender<IpcMessage>) -> StdResult<Self, Box<dyn std::error::Error>> {
        let (ready_tx, ready_rx) = channel::<StdResult<HWND, String>>();
        let (cmd_tx, cmd_rx) = channel::<WindowCommand>();

        // Окно создается в отдельном нативном UI потоке, чтобы никогда не висеть
        std::thread::spawn(move || {
            unsafe {
                let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

                let class_name = w!("LightElectronWindowClass");
                let h_instance = match GetModuleHandleW(None) {
                    Ok(h) => h,
                    Err(e) => {
                        let _ = ready_tx.send(Err(e.to_string()));
                        return;
                    }
                };

                let wnd_class = WNDCLASSEXW {
                    cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32,
                    lpfnWndProc: Some(Self::wnd_proc),
                    hInstance: h_instance.into(),
                    lpszClassName: class_name,
                    hCursor: LoadCursorW(None, IDC_ARROW).unwrap_or_default(),
                    ..Default::default()
                };

                RegisterClassExW(&wnd_class);

                let title_wide: Vec<u16> = options.title.encode_utf16().chain(std::iter::once(0)).collect();

                let hwnd = CreateWindowExW(
                    WINDOW_EX_STYLE::default(),
                    class_name,
                    PCWSTR(title_wide.as_ptr()),
                    WS_OVERLAPPEDWINDOW,
                    CW_USEDEFAULT,
                    CW_USEDEFAULT,
                    options.width as i32,
                    options.height as i32,
                    HWND(0),
                    HMENU(0),
                    h_instance,
                    None,
                );

                if hwnd.0 == 0 {
                    let _ = ready_tx.send(Err("Failed to create Win32 window".into()));
                    return;
                }

                let preload_content = options.preload_script.and_then(|p| std::fs::read_to_string(p).ok());
                let (controller, webview) = match Self::setup_webview(hwnd, preload_content, ipc_sender) {
                    Ok(res) => res,
                    Err(e) => {
                        let _ = ready_tx.send(Err(e.to_string()));
                        return;
                    }
                };

                let _ = ready_tx.send(Ok(hwnd));

                // Постоянный цикл обработки сообщений Windows
                let mut msg = MSG::default();
                loop {
                    while let Ok(cmd) = cmd_rx.try_recv() {
                        Self::handle_command(cmd, hwnd, &controller, &webview);
                    }

                    if PeekMessageW(&mut msg, HWND(0), 0, 0, PM_REMOVE).as_bool() {
                        if msg.message == WM_QUIT {
                            break;
                        }
                        TranslateMessage(&msg);
                        DispatchMessageW(&msg);
                    } else {
                        WaitMessage();
                    }
                }
            }
        });

        let hwnd = ready_rx.recv()??;

        Ok(Self {
            cmd_sender: cmd_tx,
            hwnd,
        })
    }

    fn setup_webview(
        hwnd: HWND,
        preload_content: Option<String>,
        ipc_sender: Sender<IpcMessage>,
    ) -> StdResult<(ICoreWebView2Controller, ICoreWebView2), Box<dyn std::error::Error>> {
        let (tx, rx) = channel();

        let handler = CreateCoreWebView2EnvironmentCompletedHandler::create(Box::new(
            move |_res, env| {
                if let Some(env) = env {
                    tx.send(env).unwrap();
                }
                Ok(())
            },
        ));

        let user_data_folder = std::env::temp_dir().join("light_electron_webview2");
        let user_data_wide: Vec<u16> = user_data_folder
            .to_string_lossy()
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        // Оптимизация памяти: отключение фоновых сервисов и тяжелых процессов
        let browser_args = [
            "--disable-gpu",
            "--disable-gpu-compositing",
            "--disable-software-rasterizer",
            "--disable-background-networking",
            "--disable-component-update",
            "--disable-domain-reliability",
            "--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process,Translate",
            "--disable-sync",
            "--renderer-process-limit=1",
            "--no-sandbox",
            "--js-flags=--lite-mode",
        ].join(" ");

        let mut options = CoreWebView2EnvironmentOptions::default();
        unsafe {
            options.set_additional_browser_arguments(browser_args);
            let env_options: ICoreWebView2EnvironmentOptions = options.into();

            CreateCoreWebView2EnvironmentWithOptions(
                None,
                PCWSTR(user_data_wide.as_ptr()),
                &env_options,
                &handler,
            )?;
        }

        let env = Self::pump_until(rx);

        let (tx_ctrl, rx_ctrl) = channel();

        let ctrl_handler = CreateCoreWebView2ControllerCompletedHandler::create(Box::new(
            move |_res, controller| {
                if let Some(controller) = controller {
                    tx_ctrl.send(controller).unwrap();
                }
                Ok(())
            },
        ));

        unsafe {
            env.CreateCoreWebView2Controller(hwnd, &ctrl_handler)?;
        }

        let controller = Self::pump_until(rx_ctrl);

        unsafe {
            let mut client_rect = RECT::default();
            GetClientRect(hwnd, &mut client_rect)?;
            controller.SetBounds(client_rect)?;
            controller.SetIsVisible(true)?;

            let webview = controller.CoreWebView2()?;

            let bridge_code = r#"
                window.__native_ipc_dispatch = function(msg) {
                    window.dispatchEvent(new CustomEvent('__native_ipc_message__', { detail: msg }));
                };
            "#;

            let mut combined_preload = bridge_code.to_string();
            if let Some(user_preload) = preload_content {
                combined_preload.push_str(&user_preload);
            }

            let preload_wide: Vec<u16> = combined_preload.encode_utf16().chain(std::iter::once(0)).collect();
            webview.AddScriptToExecuteOnDocumentCreated(
                PCWSTR(preload_wide.as_ptr()),
                None,
            )?;

            let msg_handler = WebMessageReceivedEventHandler::create(Box::new(
                move |_sender, args| {
                    if let Some(args) = args {
                        let mut msg_raw = PWSTR::null();
                        if args.WebMessageAsJson(&mut msg_raw).is_ok() {
                            let json_slice = std::slice::from_raw_parts(
                                msg_raw.0,
                                (0..).take_while(|&i| *msg_raw.0.add(i) != 0).count(),
                            );
                            let json_str = String::from_utf16_lossy(json_slice);
                            if let Ok(ipc_msg) = light_core::IpcMessage::from_json(&json_str) {
                                let _ = ipc_sender.send(ipc_msg);
                            }
                        }
                    }
                    Ok(())
                },
            ));

            let mut token = std::mem::zeroed();
            webview.add_WebMessageReceived(&msg_handler, &mut token)?;

            Ok((controller, webview))
        }
    }

    fn handle_command(
        cmd: WindowCommand,
        hwnd: HWND,
        controller: &ICoreWebView2Controller,
        webview: &ICoreWebView2,
    ) {
        unsafe {
            match cmd {
                WindowCommand::LoadUrl(url) => {
                    let wide: Vec<u16> = url.encode_utf16().chain(std::iter::once(0)).collect();
                    let _ = webview.Navigate(PCWSTR(wide.as_ptr()));
                }
                WindowCommand::LoadHtml(html) => {
                    let wide: Vec<u16> = html.encode_utf16().chain(std::iter::once(0)).collect();
                    let _ = webview.NavigateToString(PCWSTR(wide.as_ptr()));
                }
                WindowCommand::ExecuteScript(script) => {
                    let wide: Vec<u16> = script.encode_utf16().chain(std::iter::once(0)).collect();
                    let _ = webview.ExecuteScript(PCWSTR(wide.as_ptr()), None);
                }
                WindowCommand::SendIpc(msg) => {
                    if let Ok(json) = msg.to_json() {
                        let script = format!("window.__native_ipc_dispatch({});", json);
                        let wide: Vec<u16> = script.encode_utf16().chain(std::iter::once(0)).collect();
                        let _ = webview.ExecuteScript(PCWSTR(wide.as_ptr()), None);
                    }
                }
                WindowCommand::Show => {
                    ShowWindow(hwnd, SW_SHOW);
                    UpdateWindow(hwnd);
                }
                WindowCommand::Hide => {
                    ShowWindow(hwnd, SW_HIDE);
                }
                WindowCommand::SetSize(width, height) => {
                    let _ = SetWindowPos(hwnd, HWND(0), 0, 0, width as i32, height as i32, SWP_NOMOVE | SWP_NOZORDER);
                    let mut client_rect = RECT::default();
                    if GetClientRect(hwnd, &mut client_rect).is_ok() {
                        let _ = controller.SetBounds(client_rect);
                    }
                }
                WindowCommand::SetTitle(title) => {
                    let wide: Vec<u16> = title.encode_utf16().chain(std::iter::once(0)).collect();
                    let _ = SetWindowTextW(hwnd, PCWSTR(wide.as_ptr()));
                }
                WindowCommand::Close => {
                    let _ = DestroyWindow(hwnd);
                }
            }
        }
    }

    fn pump_until<T>(rx: Receiver<T>) -> T {
        unsafe {
            loop {
                if let Ok(res) = rx.try_recv() {
                    return res;
                }
                let mut msg = MSG::default();
                if PeekMessageW(&mut msg, HWND(0), 0, 0, PM_REMOVE).as_bool() {
                    TranslateMessage(&msg);
                    DispatchMessageW(&msg);
                }
            }
        }
    }

    unsafe extern "system" fn wnd_proc(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        match msg {
            WM_DESTROY => {
                PostQuitMessage(0);
                LRESULT(0)
            }
            _ => DefWindowProcW(hwnd, msg, wparam, lparam),
        }
    }

    fn send_cmd(&self, cmd: WindowCommand) -> StdResult<(), Box<dyn std::error::Error>> {
        self.cmd_sender.send(cmd)?;
        unsafe {
            PostMessageW(self.hwnd, WM_USER_DISPATCH, WPARAM(0), LPARAM(0));
        }
        Ok(())
    }
}

impl WindowBackend for WebView2Window {
    fn load_url(&mut self, url: &str) -> StdResult<(), Box<dyn std::error::Error>> {
        self.send_cmd(WindowCommand::LoadUrl(url.to_string()))
    }

    fn load_html(&mut self, html: &str) -> StdResult<(), Box<dyn std::error::Error>> {
        self.send_cmd(WindowCommand::LoadHtml(html.to_string()))
    }

    fn execute_script(&mut self, script: &str) -> StdResult<(), Box<dyn std::error::Error>> {
        self.send_cmd(WindowCommand::ExecuteScript(script.to_string()))
    }

    fn send_ipc(&mut self, message: &IpcMessage) -> StdResult<(), Box<dyn std::error::Error>> {
        self.send_cmd(WindowCommand::SendIpc(message.clone()))
    }

    fn show(&mut self) -> StdResult<(), Box<dyn std::error::Error>> {
        self.send_cmd(WindowCommand::Show)
    }

    fn hide(&mut self) -> StdResult<(), Box<dyn std::error::Error>> {
        self.send_cmd(WindowCommand::Hide)
    }

    fn set_size(&mut self, width: u32, height: u32) -> StdResult<(), Box<dyn std::error::Error>> {
        self.send_cmd(WindowCommand::SetSize(width, height))
    }

    fn set_title(&mut self, title: &str) -> StdResult<(), Box<dyn std::error::Error>> {
        self.send_cmd(WindowCommand::SetTitle(title.to_string()))
    }

    fn close(&mut self) -> StdResult<(), Box<dyn std::error::Error>> {
        self.send_cmd(WindowCommand::Close)
    }
}