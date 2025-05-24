import { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
	schema: '../../crates/graphql/schema.graphql',
	documents: [
		'../browser/src/**/*.ts',
		'../browser/src/**/*.tsx',
		'../client/src/**/*.ts',
		'../client/src/**/*.tsx',
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
