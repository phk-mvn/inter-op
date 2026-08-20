use crate::window::WindowEvent;
use std::sync::mpsc::{Receiver, Sender};

pub type EventSender = Sender<WindowEvent>;
pub type EventReceiver = Receiver<WindowEvent>;

pub struct EventBus {
    sender: EventSender,
    receiver: EventReceiver,
}

impl EventBus {
    pub fn new() -> Self {
        let (sender, receiver) = std::sync::mpsc::channel();
        Self { sender, receiver }
    }

    pub fn sender(&self) -> EventSender {
        self.sender.clone()
    }

    pub fn try_recv(&self) -> Option<WindowEvent> {
        self.receiver.try_recv().ok()
    }
}