# GEGL.wasm Browser Tests

This directory contains browser-based tests for GEGL.wasm functionality.

## Setup

1. **Build GEGL.wasm**:
   ```bash
   ./build-wasm.sh
   ```
   This creates the `build-wasm-prod/` directory with the compiled WebAssembly module.

2. **Install Playwright**:
   ```bash
   npm install playwright
   npx playwright install
   ```
   This installs Playwright and the browser binaries.

## Running Tests

Run the browser tests across Chrome, Firefox, Safari, and Edge:

```bash
node tests/run-browser-tests.js
```

Or make it executable:

```bash
chmod +x tests/run-browser-tests.js
./tests/run-browser-tests.js
```

## Test Structure

- `test-runner.html`: HTML page that loads GEGL modules and runs all tests
- `run-browser-tests.js`: Playwright script that launches browsers and runs tests
- `wasm/`: WebAssembly-specific tests
- `../js/test-*.js`: JavaScript utility tests

## Test Results

The test runner will:
- Launch each browser in headless mode
- Navigate to the test page
- Wait for tests to complete
- Collect and display results
- Report overall pass/fail status

Each test suite runs automatically and reports its results to the console.