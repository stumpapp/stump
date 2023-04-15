type BookReaderParams = {
	page?: number
	isEpub?: boolean
	isAnimated?: boolean
}

const paths = {
	bookOverview: (id: string) => `/book/${id}`,
	bookReader: (id: string, { page, isEpub, isAnimated }: BookReaderParams) => {
		const baseUrl = paths.bookOverview(id)
		const searchParams = new URLSearchParams()

		if (isAnimated) {
			searchParams.append('animated', 'true')
		}

		if (isEpub) {
			searchParams.append('stream', 'false')
			return `${baseUrl}/epub-reader?${searchParams.toString()}`
		}

		if (page) {
			searchParams.append('page', page.toString())
		}

		return `${baseUrl}/reader?${searchParams.toString()}`
		// return `${baseUrl}/reader/${page || 1}?${searchParams.toString()}`
	},
	home: () => '/',
	libraryCreate: () => '/library/create',
	libraryEdit: (id: string) => `/library/${id}/edit`,
	libraryOverview: (id: string, page?: number) => {
		if (page !== undefined) {
			return `/library/${id}/${page}`
		}
		return `/library/${id}`
	},
	notFound: () => '/404',
	seriesOverview: (id: string, page?: number) => {
		if (page !== undefined) {
			return `/series/${id}/${page}`
		}
		return `/series/${id}`
	},
	settings: (subpath?: string) => `/settings/${subpath || ''}`,
} as const

export default paths
