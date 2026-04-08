# sxt_proof_of_sql distribution build — produces both .plugin.wasm and .rlib
# Run from the sxt_proof_of_sql directory: make build
PLUGIN_SDK := ./node_modules/@chainlink/cre-sdk-javy-plugin

.PHONY: build clean

build: dist/sxt_proof_of_sql.plugin.wasm

dist/sxt_proof_of_sql.plugin.wasm: ../crates/sxt-proof-of-sql-cre-plugins/src/lib.rs ../crates/sxt-proof-of-sql-cre-plugins/Cargo.toml
	mkdir -p dist
	bun $(PLUGIN_SDK)/scripts/build-plugin.ts \
		--cre-exports ../crates/sxt-proof-of-sql-cre-plugins \
		-o dist/sxt_proof_of_sql.plugin.wasm

clean:
	rm -rf dist
