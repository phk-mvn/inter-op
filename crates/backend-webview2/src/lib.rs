#[cfg(windows)]
mod win_window;

#[cfg(windows)]
pub use win_window::WebView2Window;