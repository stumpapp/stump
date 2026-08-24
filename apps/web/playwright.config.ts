import { defineConfig, devices } from '@playwright/test'

// TODO: e2e assumes a clean slate, which is quite fine for ci but quite annoying for local
// runs, so i think it would be in my best interest to dedicate some more chore time to
// create some scripts to help with runs that auto clean up the database

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
	// note the ordering is important here, e.g., so setups are first
	projects: [
		{ name: 'setup', testMatch: /.*\.setup\.ts/ },
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['setup'],
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
