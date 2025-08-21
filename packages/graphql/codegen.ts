import { CodegenConfig } from '@graphql-codegen/cli'

// TODO: This is messy tbh. The mobile app will need generation, but won't need
// to share browser generated code. I think it might just make sense to separate
// things out into their own generated modules? IDK, kinda fucking a headache tbh

const config: CodegenConfig = {
	schema: '../../crates/graphql/schema.graphql',
	documents: [
		'../browser/src/**/*.ts',
		'../browser/src/**/*.tsx',
		'../client/src/**/*.ts',
		'../client/src/**/*.tsx',
		'../../apps/expo/**/*.tsx',
		'../../apps/expo/**/*.ts',
	],
	generates: {
		'./src/client/': {
			preset: 'client',
			config: {
				documentMode: 'string',
			},
		},
	},
}

export default config
