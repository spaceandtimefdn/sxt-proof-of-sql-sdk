fn main() {
    // Check for conflicting features
    let native = std::env::var("CARGO_FEATURE_NATIVE").is_ok();
    let wasm = std::env::var("CARGO_FEATURE_WASM").is_ok();
    if native && wasm {
        panic!("features \"native\" and \"wasm\" cannot be enabled together");
    }
}
