#!/usr/bin/env ts-node
/**
 * Master API Key Integration Test
 *
 * This script tests the master API key authentication system.
 * Run with: npx ts-node test-master-key.ts
 *
 * Prerequisites:
 * 1. Backend server must be running on http://localhost:3001
 * 2. MASTER_API_KEY must be set in .env file
 * 3. Run: npm run dev (in another terminal)
 */

import axios, { AxiosError } from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3001';
const MASTER_KEY = process.env.MASTER_API_KEY;

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? '✅' : '❌';
  const status = passed ? 'PASSED' : 'FAILED';
  console.log(`${icon} ${name}: ${status}`);
  console.log(`   ${message}\n`);
}

async function testHealthCheck() {
  try {
    const response = await axios.get(`${API_URL}/health`);
    if (response.status === 200 && response.data.status === 'ok') {
      logTest(
        'Health Check',
        true,
        'Health endpoint is public and bypasses master key'
      );
      return true;
    }
  } catch (error) {
    logTest(
      'Health Check',
      false,
      'Health endpoint should be accessible without master key'
    );
    return false;
  }
}

async function testMissingMasterKey() {
  try {
    await axios.get(`${API_URL}/api/products`);
    logTest(
      'Missing Master Key',
      false,
      'Should reject requests without master key'
    );
    return false;
  } catch (error) {
    const axiosError = error as AxiosError<any>;
    if (
      axiosError.response?.status === 401 &&
      axiosError.response?.data?.error?.code === 'MASTER_KEY_MISSING'
    ) {
      logTest(
        'Missing Master Key',
        true,
        'Correctly rejects requests without master key (401)'
      );
      return true;
    }
    logTest(
      'Missing Master Key',
      false,
      `Unexpected error: ${axiosError.response?.data?.error?.message || axiosError.message}`
    );
    return false;
  }
}

async function testInvalidMasterKey() {
  try {
    await axios.get(`${API_URL}/api/products`, {
      headers: { 'X-API-Key': 'invalid-master-key-12345' }
    });
    logTest(
      'Invalid Master Key',
      false,
      'Should reject requests with invalid master key'
    );
    return false;
  } catch (error) {
    const axiosError = error as AxiosError<any>;
    if (
      axiosError.response?.status === 401 &&
      axiosError.response?.data?.error?.code === 'MASTER_KEY_INVALID'
    ) {
      logTest(
        'Invalid Master Key',
        true,
        'Correctly rejects requests with invalid master key (401)'
      );
      return true;
    }
    logTest(
      'Invalid Master Key',
      false,
      `Unexpected error: ${axiosError.response?.data?.error?.message || axiosError.message}`
    );
    return false;
  }
}

async function testValidMasterKey() {
  if (!MASTER_KEY) {
    logTest(
      'Valid Master Key',
      false,
      'MASTER_API_KEY not found in environment variables'
    );
    return false;
  }

  try {
    const response = await axios.get(`${API_URL}/api/products`, {
      headers: { 'X-API-Key': MASTER_KEY }
    });

    if (response.status === 200 && response.data.success !== false) {
      logTest(
        'Valid Master Key',
        true,
        'Accepts requests with valid master key (200)'
      );
      return true;
    }
  } catch (error) {
    const axiosError = error as AxiosError<any>;
    logTest(
      'Valid Master Key',
      false,
      `Should accept valid master key. Error: ${axiosError.response?.data?.error?.message || axiosError.message}`
    );
    return false;
  }
}

async function testCaseInsensitiveHeader() {
  if (!MASTER_KEY) {
    logTest(
      'Case-Insensitive Header',
      false,
      'MASTER_API_KEY not found in environment variables'
    );
    return false;
  }

  try {
    const response = await axios.get(`${API_URL}/api/products`, {
      headers: { 'x-api-key': MASTER_KEY } // lowercase
    });

    if (response.status === 200) {
      logTest(
        'Case-Insensitive Header',
        true,
        'Accepts both X-API-Key and x-api-key headers'
      );
      return true;
    }
  } catch (error) {
    const axiosError = error as AxiosError<any>;
    logTest(
      'Case-Insensitive Header',
      false,
      `Should accept lowercase header. Error: ${axiosError.response?.data?.error?.message || axiosError.message}`
    );
    return false;
  }
}

async function testProtectedEndpoint() {
  if (!MASTER_KEY) {
    logTest(
      'Protected Endpoint',
      false,
      'MASTER_API_KEY not found in environment variables'
    );
    return false;
  }

  try {
    await axios.get(`${API_URL}/api/cart`, {
      headers: { 'X-API-Key': MASTER_KEY }
      // No Authorization header (Clerk token)
    });
    logTest(
      'Protected Endpoint',
      false,
      'Should require both master key AND user authentication'
    );
    return false;
  } catch (error) {
    const axiosError = error as AxiosError<any>;
    // Should fail with authentication error (not master key error)
    if (
      axiosError.response?.status === 401 &&
      axiosError.response?.data?.error?.code !== 'MASTER_KEY_MISSING' &&
      axiosError.response?.data?.error?.code !== 'MASTER_KEY_INVALID'
    ) {
      logTest(
        'Protected Endpoint',
        true,
        'Master key passed, but requires user authentication (correct behavior)'
      );
      return true;
    }
    logTest(
      'Protected Endpoint',
      false,
      `Unexpected error: ${axiosError.response?.data?.error?.message || axiosError.message}`
    );
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Master API Key Authentication - Integration Test');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`🌐 API URL: ${API_URL}`);
  console.log(`🔑 Master Key: ${MASTER_KEY ? '***' + MASTER_KEY.slice(-4) : 'NOT SET'}\n`);

  if (!MASTER_KEY) {
    console.error('❌ ERROR: MASTER_API_KEY environment variable is not set');
    console.error('   Please add MASTER_API_KEY to your .env file\n');
    process.exit(1);
  }

  console.log('Running tests...\n');

  // Run all tests
  await testHealthCheck();
  await testMissingMasterKey();
  await testInvalidMasterKey();
  await testValidMasterKey();
  await testCaseInsensitiveHeader();
  await testProtectedEndpoint();

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('                      SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error: Error) => {
  console.error('\n❌ Unhandled error:', error.message);
  console.error('\nMake sure the backend server is running:');
  console.error('  npm run dev\n');
  process.exit(1);
});

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test execution failed:', error.message);
  console.error('\nCommon issues:');
  console.error('  1. Backend server not running (npm run dev)');
  console.error('  2. MASTER_API_KEY not set in .env');
  console.error('  3. Port 3001 in use by another process\n');
  process.exit(1);
});
