import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.STUMP_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: [['html', { open: 'never' }]],
	use: {
		baseURL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	// when the url is set we assume it is running, otherwise we start the dev server manually
	webServer: process.env.STUMP_BASE_URL
		? undefined
		: {
				command: 'yarn dev',
				url: 'http://localhost:3000',
				reuseExistingServer: true,
			},
})
