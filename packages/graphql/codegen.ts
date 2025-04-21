import { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
	schema: '../../crates/graphql/schema.graphql',
	documents: ['../browser/src/**/*.{ts,tsx}'],
	// generates: {
	// 	'src/types.ts': {
	// 		plugins: ['typescript'],
	// 	},
	// 	'src/': {
	// 		preset: 'near-operation-file',
	// 		presetConfig: { extension: '.generated.ts', baseTypesPath: 'types.ts' },
	// 		plugins: ['typescript-operations', 'typescript-urql'],
	// 		config: { withHooks: true },
	// 	},
	// },
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
