type BookReaderParams = {
	page?: number
	isEpub?: boolean
	isPdf?: boolean
	epubcfi?: string | null
	isAnimated?: boolean
}

const paths = {
	bookOverview: (id: string) => `/book/${id}`,
	bookReader: (id: string, { isEpub, isPdf, epubcfi, isAnimated, page }: BookReaderParams) => {
		const baseUrl = paths.bookOverview(id)
		const searchParams = new URLSearchParams()

		if (isEpub) {
			searchParams.append('stream', 'false')
			if (epubcfi) {
				searchParams.append('cfi', encodeURIComponent(epubcfi))
			}
			return `${baseUrl}/epub-reader?${searchParams.toString()}`
		}

		if (isPdf) {
			// searchParams.append('native', 'true')
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
	home: () => '/',
	libraryCreate: () => '/library/create',
	libraryFileExplorer: (id: string) => `/library/${id}/explore`,
	libraryManage: (id: string) => `/library/${id}/manage`,
	libraryOverview: (id: string, page?: number) => {
		if (page !== undefined) {
			return `/library/${id}?page=${page}`
		}
		return `/library/${id}`
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
