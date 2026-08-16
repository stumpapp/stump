import type { Config } from 'jest'

export default {
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^@readium/decorator$': '<rootDir>/../../node_modules/@readium/decorator/dist/index.js',
		'^@readium/helpers$': '<rootDir>/../../node_modules/@readium/helpers/dist/index.js',
		'^@readium/navigator$': '<rootDir>/../../node_modules/@readium/navigator/dist/index.js',
		'^@readium/navigator-html-injectables$':
			'<rootDir>/../../node_modules/@readium/navigator-html-injectables/dist/index.js',
		'^@readium/shared$': '<rootDir>/../../node_modules/@readium/shared/dist/index.js',
	},
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	modulePathIgnorePatterns: ['<rootDir>/dist/'],
	testEnvironment: 'jsdom',
	transform: {
		'^.+\\.[jt]sx?$': 'babel-jest',
	},
	// Readium's ESM bundles include nested ESM dependencies under their own
	// node_modules directories, so the entire package subtree must be transformed.
	transformIgnorePatterns: [
		'^(?!.*[/\\\\]node_modules[/\\\\]@readium[/\\\\]).*[/\\\\]node_modules[/\\\\]',
	],
} satisfies Config
