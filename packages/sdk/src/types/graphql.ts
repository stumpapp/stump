export type GraphQLError = {
	message: string
	locations: Array<{
		line: number
		column: number
	}>
	path?: Array<string | number>
	extensions?: Record<string, unknown>
}

export type GraphQLResponse<T> = {
	data: T
	errors?: Array<GraphQLError>
}
