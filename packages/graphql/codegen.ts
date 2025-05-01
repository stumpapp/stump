import { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
	schema: '../../crates/graphql/schema.graphql',
	documents: ['../browser/src/**/*.{ts,tsx}', '../client/src/**/*.{ts,tsx}'],
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
