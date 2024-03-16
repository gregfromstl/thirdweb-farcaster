**This repository includes a basic node script to test the write functions on the new Thirdweb SDK Farcaster extension (since there is not yet a TestClient in the SDK)**

### Running the Tests

-   Install dependencies (just typescript and thirdweb) with `yarn`
-   If the farcaster extension is not yet released or testing new features, link your local `thirdweb` package with `yarn link`
-   Run a local optimism fork with anvil `anvil --fork-url [OPTIMISM_RPC_URL] --chain-id 10`
-   `yarn start`
-   If everything is working properly you should see logs for each function tested. If a transaction or function fails, it will throw error.
