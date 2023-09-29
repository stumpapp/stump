type BookReaderParams = {
	page?: number
	isEpub?: boolean
	isPdf?: boolean
	epubcfi?: string | null
	isAnimated?: boolean
	isStreaming?: boolean
}

const paths = {
	bookManagement: (id: string) => `/books/${id}/manage`,
	bookOverview: (id: string) => `/books/${id}`,
	bookReader: (
		id: string,
		{ isEpub, isPdf, epubcfi, isAnimated, page, isStreaming }: BookReaderParams,
	) => {
		const baseUrl = paths.bookOverview(id)
		const searchParams = new URLSearchParams()

		if (isEpub || !!epubcfi) {
			searchParams.append('stream', 'false')
			if (epubcfi) {
				searchParams.append('cfi', encodeURIComponent(epubcfi))
			}
			return `${baseUrl}/epub-reader?${searchParams.toString()}`
		}

		if (isPdf && !isStreaming) {
			return `${baseUrl}/pdf-reader?${searchParams.toString()}`
		}

		if (isAnimated) {
			searchParams.append('animated', 'true')
		}

		if (page) {
			searchParams.append('page', page.toString())
		}

		return `${baseUrl}/reader?${searchParams.toString()}`
	},
	bookSearch: () => '/books',
	home: () => '/',
	libraryCreate: () => '/libraries/create',
	libraryFileExplorer: (id: string) => `/libraries/${id}/explore`,
	libraryManage: (id: string) => `/libraries/${id}/manage`,
	libraryOverview: (id: string, page?: number) => {
		if (page !== undefined) {
			return `/libraries/${id}?page=${page}`
		}
		return `/libraries/${id}`
	},
	notFound: () => '/404',
	seriesOverview: (id: string, page?: number) => {
		if (page !== undefined) {
			return `/series/${id}?page=${page}`
		}
		return `/series/${id}`
	},
	settings: (subpath?: string) => `/settings/${subpath || ''}`,
} as const

export default paths
