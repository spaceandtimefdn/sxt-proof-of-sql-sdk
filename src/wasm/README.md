# `sxt-proof-of-sql-sdk-wasm`
Provides wasm bindings for the stateless logic of the sdk.
This includes creating requests for and handling responses from the SxT platform, but without performing the IO.

## Package membership
This package is not a default member of this workspace.
This is because it enables dependency features that are contradictory to those enabled by the typical sdk client.
During development, run cargo commands with `-p sxt-proof-of-sql-sdk-wasm` to select this package exclusively.
