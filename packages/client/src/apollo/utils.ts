import { PaginationInfo } from '@stump/graphql'

type FieldWithNodesAndPageInfo<T> = {
	nodes: Array<T>
	pageInfo: PaginationInfo
}

type ExtractPaginatedKeys<T> = {
	[K in keyof T]: T[K] extends FieldWithNodesAndPageInfo<any> ? K : never
}[keyof T]

type UpdateQueryOptions = {
	append?: boolean
}

// TODO: Probably would be good to make a bit more type safe
// FIXME: This won't work for nested queries

/**
 * A utility function to update the query result when fetching more data
 */
export function updateQuery<
	TData extends Record<string, unknown>,
	K extends ExtractPaginatedKeys<TData> = ExtractPaginatedKeys<TData>,
>(
	prev: TData,
	{ fetchMoreResult }: { fetchMoreResult: TData | null | undefined },
	{ append }: UpdateQueryOptions = { append: true },
): TData {
	if (!fetchMoreResult) return prev

	const key = Object.keys(fetchMoreResult).find((k) => {
		const value = fetchMoreResult[k as keyof TData]
		return value && typeof value === 'object' && 'nodes' in value && 'pageInfo' in value
	}) as K | undefined

	if (!key) return prev

	const prevField = prev[key] as FieldWithNodesAndPageInfo<unknown>
	const newField = fetchMoreResult[key] as FieldWithNodesAndPageInfo<unknown>

	if (!prevField || !newField) return { ...prev, ...fetchMoreResult }

	const mergedNodes = append
		? [...prevField.nodes, ...newField.nodes]
		: [...newField.nodes, ...prevField.nodes]

	return {
		[key]: {
			...prevField,
			nodes: mergedNodes,
			pageInfo: newField.pageInfo,
		},
	} as TData
}
