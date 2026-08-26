import { Locator, Manifest, Publication } from '@readium/shared'
import type { Api } from '@stump/sdk'

import { createStumpFetch, createStumpHttpFetcher } from './createStumpHttpFetcher'
import { collectAllowedDomains } from './preferences'

export type OpenedPublication = {
	publication: Publication
	positions: Locator[]
	manifestUrl: string
	allowedDomains: string[]
}

/**
 * Fetch and open a Stump RWPM as a Readium Publication with authenticated fetch.
 */
export async function openStumpPublication(
	sdk: Api,
	id: string,
	signal?: AbortSignal,
): Promise<OpenedPublication> {
	const manifestUrl = sdk.epub.manifestURL(id)
	const stumpFetch = createStumpFetch(sdk)

	const response = await stumpFetch(manifestUrl, { signal })
	if (!response.ok) {
		if (response.status === 401 || response.status === 403) {
			throw new Error('Unauthorized — check that you are logged in.')
		}
		if (response.status === 404) {
			throw new Error('EPUB not found.')
		}
		throw new Error(`Failed to load manifest (${response.status}).`)
	}

	const json = await response.json()
	const manifest = Manifest.deserialize(json)
	if (!manifest) {
		throw new Error('Failed to parse Readium Web Publication Manifest.')
	}

	manifest.setSelfLink(manifestUrl)

	const fetcher = createStumpHttpFetcher(sdk)
	const publication = new Publication({ manifest, fetcher })

	const positions = await publication.positionsFromManifest()
	if (!positions.length) {
		throw new Error(
			'No positions list linked from the RWPM. Expected a links[] entry with type application/vnd.readium.position-list+json.',
		)
	}

	const hrefs: Array<string | undefined> = [
		manifestUrl,
		...positions.map((p) => p.href),
		...(manifest.readingOrder?.items?.map((l) => l.href) ?? []),
		...(manifest.resources?.items?.map((l) => l.href) ?? []),
		...(manifest.links?.items?.map((l) => l.href) ?? []),
	]

	let serviceOrigin: string | undefined
	try {
		serviceOrigin = new URL(sdk.serviceURL).origin
	} catch {
		serviceOrigin = undefined
	}

	return {
		publication,
		positions,
		manifestUrl,
		allowedDomains: collectAllowedDomains(hrefs, [serviceOrigin]),
	}
}
