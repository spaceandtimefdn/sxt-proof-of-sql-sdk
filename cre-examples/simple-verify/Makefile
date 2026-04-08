# Example: prebuilt-plugin — compile workflow with a pre-built .plugin.wasm
# Assumes sxt_proof_of_sql has been built (make -C ../sxt_proof_of_sql build).
.PHONY: build clean

build:
	mkdir -p wasm
	bun cre-compile --plugin ../node_modules/sxt-proof-of-sql-cre-sdk-typescript/dist/sxt_proof_of_sql.plugin.wasm \
		index.ts \
		wasm/workflow.wasm

clean:
	rm -rf wasm
