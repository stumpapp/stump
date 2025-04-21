import { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
	schema: '../../crates/graphql/schema.graphql',
	// documents: 'src/**/!(*.generated).{ts,tsx}',
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
		'./src/client.ts': {
			preset: 'client',
		},
	},
}

export default config
