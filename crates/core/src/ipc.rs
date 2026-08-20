use serde::{Deserialize, Serialize};

/// Сообщение, передаваемое через IPC-мост
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpcMessage {
    /// Имя канала (например, "to-main", "api:fetch")
    pub channel: String,
    /// JSON-строка или примитив с данными
    pub payload: serde_json::Value,
    /// Уникальный ID запроса (для handle / invoke асинхронных ответов)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub callback_id: Option<String>,
}

impl IpcMessage {
    pub fn new(channel: impl Into<String>, payload: serde_json::Value) -> Self {
        Self {
            channel: channel.into(),
            payload,
            callback_id: None,
        }
    }

    pub fn with_callback(channel: impl Into<String>, payload: serde_json::Value, callback_id: String) -> Self {
        Self {
            channel: channel.into(),
            payload,
            callback_id: Some(callback_id),
        }
    }

    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }
}