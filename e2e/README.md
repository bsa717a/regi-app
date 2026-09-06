# E2E Tests

End-to-end tests for REGI critical paths using Playwright.

## Coverage

The E2E test suite covers the following critical user flows:

### 1. Login (`tests/login.spec.ts`)
- Display and validation of login form
- Error handling for invalid credentials
- Form state management during submission
- Navigation links (signup, forgot password)

### 2. Add Vehicle (`tests/add-vehicle.spec.ts`)
- Empty garage state and first registration flow
- VIN lookup and vehicle confirmation
- Manual vehicle type selection
- Complete add vehicle flow with nickname

### 3. Renewal Flow (`tests/renewal.spec.ts`)
- Vehicle display with renewal status
- Starting renewal from garage
- Required documents display
- Fee estimate visibility
- Submit button state management

### 4. Document Upload (`tests/document-upload.spec.ts`)
- Upload form in renewal flow
- Progress indicator during upload
- Upload status feedback
- Submit button enablement after upload
- Documents page upload functionality

## Running Tests

### Prerequisites

1. **Node.js 20+** and **npm** installed
2. **Playwright browsers** installed:
   ```bash
   npx playwright install
   ```

### Local Development

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with visible browser
npx playwright test --headed

# Run in interactive UI mode
npx playwright test --ui

# Run specific test file
npx playwright test tests/login.spec.ts

# Run tests matching a pattern
npx playwright test -g "login"
```

### With Dev Server Auto-Start

The Playwright config automatically starts the dev server when running locally:

```bash
# Tests will auto-start dev server on port 8080
npx playwright test
```

To use an existing server:

```bash
# Start dev server in another terminal
npm run dev

# Run tests against existing server
PLAYWRIGHT_BASE_URL=http://localhost:8080 npx playwright test
```

## Test Architecture

### API Mocking Strategy

Tests use Playwright's route interception to mock API responses:

```typescript
await page.route("**/api/me", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: mockUser }),
  });
});
```

**Why mock APIs?**
- Tests run without database/Firebase dependencies
- Consistent, reproducible test data
- Fast execution (no network latency)
- CI-friendly (no external service credentials needed)

### Stable Selectors

Tests use `data-testid` attributes for reliable element selection:

```typescript
await page.getByTestId("login-submit").click();
await expect(page.getByTestId("login-error")).toBeVisible();
```

**testid locations:**
- Login form: `login-form`, `login-email`, `login-password`, `login-submit`, `login-error`
- Garage: `add-vehicle-button`, `add-first-registration-button`, `vehicle-list`, `vehicle-item-{id}`
- Add vehicle: `vin-lookup-form`, `vin-input`, `vin-lookup-submit`, `add-manually-button`, `type-picker-{type}`, `confirm-vehicle-button`, `save-registration-button`
- Renewal: `renew-vehicle-{id}`, `upload-doc-{type}`, `upload-doc-input-{type}`, `submit-renewal-button`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PLAYWRIGHT_BASE_URL` | App URL for tests | `http://127.0.0.1:8080` |
| `CI` | CI environment flag | - |

### For Real Auth Testing (Future)

If you want to test against real Firebase authentication:

| Variable | Description |
|----------|-------------|
| `E2E_TEST_EMAIL` | Test user email |
| `E2E_TEST_PASSWORD` | Test user password |

**Note:** Current tests use API mocking and don't require real credentials.

## Configuration

### `playwright.config.ts`

Key configuration:

```typescript
{
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: true,
  },
}
```

## Debugging Failed Tests

### View Test Report

```bash
npx playwright show-report
```

### View Traces

After a failed test with `trace: "on-first-retry"`:

```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Debug Mode

```bash
# Run with debugger
npx playwright test --debug

# Run specific test with debugger
npx playwright test tests/login.spec.ts --debug
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots in `test-results/[test-name]/`
- Videos (on retry) in `test-results/[test-name]/`

## CI Integration

For CI pipelines, tests run headless without the webServer:

```yaml
# Example GitHub Actions step
- name: Run E2E tests
  run: |
    npm run build
    npm start &
    sleep 10
    PLAYWRIGHT_BASE_URL=http://localhost:8080 npm run test:e2e
```

The config disables webServer auto-start in CI (`process.env.CI`).

## Adding New Tests

1. Create a new spec file in `e2e/tests/`
2. Add API route mocks for required endpoints
3. Use `data-testid` attributes for stable selectors
4. Follow existing patterns for consistency

### Example Test Structure

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks
    await page.route("**/api/endpoint", async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({}) });
    });
  });

  test("does something expected", async ({ page }) => {
    await page.goto("/path");
    await expect(page.getByTestId("element")).toBeVisible();
  });
});
```

## Known Limitations

1. **Firebase Auth**: Tests mock authentication rather than using real Firebase. For true end-to-end auth testing, you'd need test Firebase credentials.

2. **File Uploads**: Document upload tests mock the GCS signed URL flow. Real uploads require GCS credentials.

3. **Browser Coverage**: Currently only Chromium. Add other browsers in `playwright.config.ts` projects array if needed.

## Troubleshooting

### "Cannot find module" errors

```bash
npm install
npx playwright install
```

### Tests timing out

- Increase timeouts in config
- Check if dev server is running
- Verify API mocks are set up correctly

### Flaky tests

- Add explicit waits for async operations
- Use `toBeVisible({ timeout: X })` for elements that load asynchronously
- Ensure API mocks complete before assertions
