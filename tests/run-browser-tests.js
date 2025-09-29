#!/usr/bin/env node

/**
 * GEGL.wasm Browser Test Runner
 *
 * Runs browser tests across multiple browsers using Playwright.
 * Requires Playwright to be installed: npm install playwright
 * Also requires GEGL.wasm to be built: run build-wasm.sh first
 */

const { chromium, firefox, webkit } = require('playwright');

const TEST_URL = `file://${__dirname}/test-runner.html`;
const TIMEOUT = 120000; // 2 minutes timeout

// Browser configurations
const browsers = [
    { name: 'Chrome', launcher: chromium, options: {} },
    { name: 'Firefox', launcher: firefox, options: {} },
    { name: 'Safari', launcher: webkit, options: {} },
    { name: 'Edge', launcher: chromium, options: {
        // Edge is Chromium-based, but we can set a different user agent
        args: ['--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59"']
    }}
];

async function runTestsInBrowser(browserConfig) {
    const { name, launcher, options } = browserConfig;
    console.log(`\n🚀 Launching ${name}...`);

    const browser = await launcher.launch({
        headless: true,
        ...options
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log(`📄 Navigating to test page in ${name}...`);

        // Listen for console messages
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push(`${msg.type()}: ${msg.text()}`);
        });

        // Navigate to test page
        await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });

        console.log(`⏳ Waiting for tests to complete in ${name}...`);

        // Wait for test results to be available
        await page.waitForFunction(
            () => window.testResults !== undefined,
            { timeout: TIMEOUT }
        );

        // Get test results
        const results = await page.evaluate(() => window.testResults);

        console.log(`✅ Tests completed in ${name}`);
        console.log(`📊 Results: ${results.success ? 'PASSED' : 'FAILED'}`);

        // Print test details
        console.log('\nTest Details:');
        for (const [testName, passed] of Object.entries(results.results)) {
            console.log(`  ${passed ? '✓' : '✗'} ${testName}`);
        }

        // Print any errors
        if (results.errors.length > 0) {
            console.log('\nErrors:');
            results.errors.forEach(error => console.log(`  ❌ ${error}`));
        }

        return {
            browser: name,
            success: results.success,
            results: results.results,
            errors: results.errors,
            consoleMessages
        };

    } catch (error) {
        console.error(`❌ Error running tests in ${name}:`, error.message);
        return {
            browser: name,
            success: false,
            error: error.message,
            consoleMessages
        };
    } finally {
        await browser.close();
    }
}

async function main() {
    console.log('🧪 GEGL.wasm Browser Test Runner');
    console.log('================================\n');

    // Check if Playwright is available
    try {
        require('playwright');
    } catch (error) {
        console.error('❌ Playwright is not installed.');
        console.log('Please install Playwright:');
        console.log('  npm install playwright');
        console.log('  npx playwright install');
        process.exit(1);
    }

    // Check if test file exists
    const fs = require('fs');
    if (!fs.existsSync(`${__dirname}/test-runner.html`)) {
        console.error('❌ Test runner HTML file not found.');
        console.log('Make sure test-runner.html exists in the tests directory.');
        process.exit(1);
    }

    // Check if GEGL wasm build exists
    if (!fs.existsSync(`${__dirname}/../build-wasm-prod/gegl.js`)) {
        console.error('❌ GEGL.wasm build not found.');
        console.log('Please build GEGL.wasm first:');
        console.log('  ./build-wasm.sh');
        process.exit(1);
    }

    const allResults = [];
    let totalPassed = 0;

    for (const browser of browsers) {
        const result = await runTestsInBrowser(browser);
        allResults.push(result);
        if (result.success) {
            totalPassed++;
        }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 FINAL SUMMARY');
    console.log('='.repeat(50));

    allResults.forEach(result => {
        const status = result.success ? '✅ PASSED' : '❌ FAILED';
        console.log(`${result.browser}: ${status}`);
    });

    console.log(`\n🎯 Overall: ${totalPassed}/${browsers.length} browsers passed`);

    if (totalPassed === browsers.length) {
        console.log('🎉 All browser tests passed!');
        process.exit(0);
    } else {
        console.log('💥 Some browser tests failed.');
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the tests
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { runTestsInBrowser, browsers };