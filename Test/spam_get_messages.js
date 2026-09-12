const axios = require('axios');

// Configuration
const TARGET_URL = 'http://27.79.188.129:9999/jeremy58.7432@npcmaxxing.asia/message';
const TOTAL_REQUESTS = 15000; // Increase this to spam more
const CONCURRENCY = 1000;      // Number of simultaneous requests

let startedRequests = 0;
let completedRequests = 0;
let activeRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
const errorCounts = {}; // Track error types
const startTime = Date.now();

async function makeOneRequest() {
    activeRequests++;
    try {
        const res = await axios.get(TARGET_URL, {
            timeout: 10000 // 10s timeout
        });
        if (res.status === 200) {
            successfulRequests++;
        } else {
            failedRequests++;
            const status = res.status;
            errorCounts[`Status ${status}`] = (errorCounts[`Status ${status}`] || 0) + 1;
        }
    } catch (error) {
        failedRequests++;
        let errorMsg = error.message;
        if (error.code) {
            errorMsg = `${error.code}: ${errorMsg}`;
        }
        errorCounts[errorMsg] = (errorCounts[errorMsg] || 0) + 1;
    } finally {
        activeRequests--;
        completedRequests++;
        updateProgress();
    }
}

function updateProgress() {
    const elapsed = (Date.now() - startTime) / 1000;
    const rps = (completedRequests / elapsed).toFixed(2);

    process.stdout.write(
        `\rProgress: ${completedRequests}/${TOTAL_REQUESTS} | ` +
        `Active: ${activeRequests} | ` +
        `Success: ${successfulRequests} | ` +
        `Failed: ${failedRequests} | ` +
        `RPS: ${rps}`
    );
}

async function startStressTest() {
    console.log(`Starting stress test to: ${TARGET_URL}`);
    console.log(`Total Requests: ${TOTAL_REQUESTS}`);
    console.log(`Concurrency: ${CONCURRENCY}\n`);

    const workers = [];

    async function worker() {
        while (true) {
            const requestId = startedRequests++;
            if (requestId >= TOTAL_REQUESTS) break;

            await makeOneRequest();
        }
    }

    // Start workers
    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(worker());
    }

    // Wait for all workers to finish
    await Promise.all(workers);

    const totalTime = (Date.now() - startTime) / 1000;
    console.log('\n\n--- Stress Test Finished ---');
    console.log(`Total Time: ${totalTime.toFixed(2)}s`);
    console.log(`Success rate: ${((successfulRequests / TOTAL_REQUESTS) * 100).toFixed(2)}%`);
    console.log(`Average RPS: ${(TOTAL_REQUESTS / totalTime).toFixed(2)}`);

    if (failedRequests > 0) {
        console.log('\n--- Error Summary ---');
        for (const [error, count] of Object.entries(errorCounts)) {
            console.log(`- ${error}: ${count}`);
        }
    }
}

startStressTest().catch(err => {
    console.error('Fatal error in stress test:', err);
});
