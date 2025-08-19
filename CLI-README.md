# Proof of SQL CLI

A CLI utility to help users interact with the Space and Time Chain and execute Proof of SQL queries.

## Installation

### Install from Source

1. Install Prerequisites
    * Be sure you have [protoc](https://protobuf.dev/installation/) and OpenSSL installed

        On Debian-based Linux distros you can do the following to install all of them
        ```bash
        apt update
        apt install -y build-essential protobuf-compiler pkg-config libssl-dev
        ```
    * Install cargo via https://www.rust-lang.org/learn/get-started.

        For Linux and macOS users, this is
        ```bash
		curl https://sh.rustup.rs -sSf | sh
        ```

2. Install the CLI using `cargo`
    ```bash
	cargo install --git https://github.com/spaceandtimefdn/sxt-proof-of-sql-sdk
    ```
3. Verify Installation
    ```bash
    proof-of-sql-cli --version
    ```

### Install from pre-built binaries

Coming Soon!


## Usage

1. Create a `.env` file in your working directory with your API key
    ```bash
    # .env
    SXT_API_KEY=sxt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    ```
    Alternatively, add `--sxt-api-key "sxt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"` to the CLI arguments.

2. Run a query
    ```bash
    proof-of-sql-cli query-and-verify --query "SELECT BLOCK_NUMBER FROM ETHEREUM.BLOCKS LIMIT 1"
    ```

3. Generate the EVM-friendly query plan for a query
    ```
	proof-of-sql-cli produce-plan --query "SELECT BLOCK_NUMBER FROM ETHEREUM.BLOCKS LIMIT 1"
    ```