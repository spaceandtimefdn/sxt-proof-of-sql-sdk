.PHONY: build

build:
	mkdir -p wasm
	bun cre-compile --plugin node_modules/sxt-proof-of-sql-cre-sdk-typescript/dist/sxt_proof_of_sql.plugin.wasm \
		main.ts \
		wasm/workflow.wasm

clean:
	rm -rf wasm