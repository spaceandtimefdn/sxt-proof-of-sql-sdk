use cre_wasm_exports::extend_wasm_exports;
use javy_plugin_api::javy::quickjs::{prelude::*, Ctx, Object};
use sxt_proof_of_sql_sdk::base::proof_of_sql_verify_from_json_responses;

pub fn register(ctx: &Ctx<'_>) {
    let obj = Object::new(ctx.clone()).unwrap();
    obj.set(
        "verify",
        Func::from(proof_of_sql_verify_from_json_responses),
    )
    .unwrap();
    extend_wasm_exports(ctx, "proofOfSql", obj);
}
