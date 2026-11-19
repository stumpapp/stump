import { Page } from '@playwright/test'

export const API_URL = process.env.STUMP_BASE_URL ?? 'http://localhost:10801'

/** execute a gql request with the provided (assumed authed) page */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeGql<T = any>(
	page: Page,
	query: string,
	variables?: Record<string, unknown>,
): Promise<T> {
	const res = await page.request.post(`${API_URL}/api/graphql`, {
		data: { query, variables },
	})
	const json = await res.json()
	if (json.errors?.length) {
		throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`)
	}
	return json.data as T
}
