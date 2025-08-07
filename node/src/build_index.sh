#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Enable error handling
set -euo pipefail

# Define an error handler to gracefully handle errors
error_handler() {
    echo "Error: Script encountered an issue. Exiting gracefully."
    exit 1
}

# Trap errors and call the error handler
trap error_handler ERR

# Truncate the JavaScript file at the specified line
truncate_js_file() {
    local input_js_file=$1
    local output_js_file=$2
    if ! sed '/^const wasm_url = new URL('\''sxt_proof_of_sql_sdk_bg.wasm'\'', import.meta.url);/,$d' "$input_js_file" > "$output_js_file"; then
        echo "Error: Failed to truncate the JavaScript file."
        return 1
    fi
}

# Base64-encode the WASM file and append it as a string to the JS file
append_base64_wasm_to_js() {
    local wasm_file=$1
    local js_file=$2
    if ! base64 "$wasm_file" > /dev/null 2>&1; then
        echo "Error: Failed to Base64-encode the WASM file."
        return 1
    fi
    local base64_wasm=$(base64 "$wasm_file")
    echo -e "\n// Embedded WASM (Base64 Encoded)" >> "$js_file"
    echo "let wasmCode = \`$base64_wasm\`;" >> "$js_file"
    echo "const wasmBytes = Uint8Array.from(atob(wasmCode), c => c.charCodeAt(0));" >> "$js_file"
}

# Append WebAssembly instantiation code
append_wasm_instantiation_code() {
    local js_file=$1
    echo -e "\n// Instantiate the WebAssembly module" >> "$js_file"
    echo "const wasmInstance = (await WebAssembly.instantiate(wasmBytes, imports)).instance;" >> "$js_file"
    echo "const wasm = wasmInstance.exports;" >> "$js_file"
    echo "export const __wasm = wasm;" >> "$js_file"
}

# Main logic
main() {
    local input_js_file="$1/sxt_proof_of_sql_sdk.js"
    local wasm_file="$1/sxt_proof_of_sql_sdk_bg.wasm"
    local output_js_file="$SCRIPT_DIR/index.js"

    if [[ ! -f "$input_js_file" ]]; then
        echo "Error: Input JavaScript file '$input_js_file' not found."
        return 1
    fi

    if [[ ! -f "$wasm_file" ]]; then
        echo "Error: WASM file '$wasm_file' not found."
        return 1
    fi

    echo "Truncating the JavaScript file..."
    truncate_js_file "$input_js_file" "$output_js_file" || return 1

    echo "Embedding the Base64-encoded WASM file..."
    append_base64_wasm_to_js "$wasm_file" "$output_js_file" || return 1

    echo "Appending WebAssembly instantiation code..."
    append_wasm_instantiation_code "$output_js_file" || return 1

    cp "$output_js_file" "$output_js_file.tmp"

    cat "$output_js_file.tmp" "$SCRIPT_DIR/index_tail.js" > "$output_js_file"
    
    rm "$output_js_file.tmp"
    
    echo "Modified JavaScript file created: $output_js_file"
}

main "$@"
