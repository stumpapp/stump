type BookReaderParams = {
	page?: number
	isEpub?: boolean
}

const paths = {
	bookOverview: (id: string) => `/book/${id}`,
	bookReader: (id: string, { page, isEpub }: BookReaderParams) => {
		const baseUrl = paths.bookOverview(id)
		if (isEpub) {
			return `${baseUrl}/epub-reader?stream=false`
		}
		return `${baseUrl}/page/${page || 1}`
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
