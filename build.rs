use std::{env, fs, path::Path};

fn main() {
    // Check for conflicting features
    let native = std::env::var("CARGO_FEATURE_NATIVE").is_ok();
    let wasm = std::env::var("CARGO_FEATURE_WASM").is_ok();
    let hyperkzg = std::env::var("CARGO_FEATURE_HYPERKZG").is_ok();
    if native && wasm {
        panic!("features \"native\" and \"wasm\" cannot be enabled together");
    }
    if hyperkzg && wasm {
        panic!("features \"hyperkzg\" and \"wasm\" cannot be enabled together");
    }

    let pwd = env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR env variable unset");

    let proto_path = Path::new(&pwd).join("src/base/proto/");

    let proto_defs = fs::read_dir(&proto_path)
        .unwrap()
        .map(|v| proto_path.join(v.expect("read dir must success").path()))
        .collect::<Vec<_>>();

    tonic_build::configure()
        .type_attribute(".", "#[derive(serde::Serialize,serde::Deserialize)]")
        .field_attribute(
            "sxt.core.ProverResponse.exec_time",
            "#[serde(default, serialize_with = \"crate::base::duration_serde::serialize\", deserialize_with = \"crate::base::duration_serde::deserialize\")]",
        )
        .field_attribute(
            "sxt.core.ProofAndResultForCommitments.exec_time",
            "#[serde(default, serialize_with = \"crate::base::duration_serde::serialize\", deserialize_with = \"crate::base::duration_serde::deserialize\")]",
        )
        .type_attribute(".", "#[allow(clippy::all)]")
        .build_client(cfg!(feature = "prover-client"))
        .build_server(false)
        .compile(&proto_defs, &[&proto_path])
        .unwrap();
}
