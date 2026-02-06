/**
 * Constructs a search URL by replacing the {?query} template with the actual query parameter.
 * Note that OPDS v2 spec supports more complex templating, but that isn't implemented yet.
 *
 * Examples:
 * - /opds/v2.0/s/0/1{?query}&topGroup=s -> /opds/v2.0/s/0/1?query=some+search+terms&topGroup=s
 * - /opds/v2.0/s/0/1{?query,author}&topGroup=s -> /opds/v2.0/s/0/1?query=some+search+terms&topGroup=s
 *
 * @param templatedUrl The URL containing the OPDS search template
 * @param query The search query to insert into the URL
 */
export function constructSearchURL(templatedUrl: string, query: string) {
	const innerSection = templatedUrl.match(/{\?([^}]+)}/)
	if (!innerSection) {
		return templatedUrl
	}
	const params = innerSection[1]?.split(',').map((param) => param.trim()) || []
	// TODO(opds): Support more than just `query` param. This would be a pretty big jump in UI complexity
	const queryParam = params.find((param) => param === 'query')
	if (!queryParam) {
		return templatedUrl.replace(/{\?([^}]+)}/, '')
	}
	const encodedQuery = encodeURIComponent(query)
	const replacement = `?${queryParam}=${encodedQuery}`
	return templatedUrl.replace(/{\?([^}]+)}/, replacement)
}

export function constructLegacySearchURL(templatedUrl: string, query: string) {
	// OPDS v1.2 uses OpenSearch templates like: ?search={searchTerms}
	// We just replace {searchTerms} (or any {placeholder}) with the query. I don't
	// know if there will be mutltiple but for now this is fine for a POC
	const encodedQuery = encodeURIComponent(query)
	return templatedUrl.replace(/{[^}]+}/g, encodedQuery)
}
