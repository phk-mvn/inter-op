use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode};
use light_core::IpcMessage;

pub type JsIpcCallback = ThreadsafeFunction<String, ErrorStrategy::Fatal>;

#[derive(Clone)]
pub struct NodeIpcEmitter {
    callback: Option<JsIpcCallback>,
}

impl NodeIpcEmitter {
    pub fn new() -> Self {
        Self { callback: None }
    }

    pub fn set_callback(&mut self, cb: JsIpcCallback) {
        self.callback = Some(cb);
    }

    pub fn emit(&self, msg: &IpcMessage) {
        if let Some(ref cb) = self.callback {
            if let Ok(json_str) = msg.to_json() {
                cb.call(json_str, ThreadsafeFunctionCallMode::NonBlocking);
            }
        }
    }
}