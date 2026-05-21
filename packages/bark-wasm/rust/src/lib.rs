pub use bark_ffi::*;

use wasm_bindgen::prelude::*;

pub fn init_logging() {
    let _ = console_log::init_with_level(log::Level::Trace);
}

#[wasm_bindgen(start)]
pub fn init() {
    init_logging();
	#[cfg(feature = "debug")]
	console_error_panic_hook::set_once();
}