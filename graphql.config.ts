import { IGraphQLConfig } from 'graphql-config'

const config: IGraphQLConfig = {
	schema: './crates/graphql/schema.graphql',
	documents: [
		'./packages/browser/src/**/*.{ts,tsx}',
		'./packages/client/src/**/*.{ts,tsx}',
		'./apps/expo/**/*.{ts,tsx}',
		'./apps/web/src/**/*.{ts,tsx}',
		'./apps/desktop/src/**/*.{ts,tsx}',
	],
}

export default config
