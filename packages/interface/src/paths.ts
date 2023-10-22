type BookReaderParams = {
	page?: number
	isEpub?: boolean
	isPdf?: boolean
	epubcfi?: string | null
	isAnimated?: boolean
	isStreaming?: boolean
}

type SettingsPage = 'general' | 'users' | 'jobs' | 'desktop' | 'server'
type DocTopic = 'access-control' | 'book-club'
type BookClubArea = 'overview' | 'members' | 'chat-board' | 'settings'

const paths = {
	bookClub: (id: string, area?: BookClubArea) => `/book-clubs/${id}${area ? `/${area}` : ''}`,
	bookClubChatBoard: (id: string, chatBoardId?: string) => {
		const url = paths.bookClub(id, 'chat-board')
		if (chatBoardId?.length) {
			return `${url}?archived_chat_id=${chatBoardId}`
		}
		return url
	},
	bookClubChatBoardMessage: (id: string, messageId: string, chatBoardId?: string) => {
		const url = paths.bookClubChatBoard(id, chatBoardId) + '/thread/' + messageId
		if (chatBoardId?.length) {
			return `${url}?archived_chat_id=${chatBoardId}`
		}
		return url
	},
	bookClubCreate: () => '/book-clubs/create',
	bookClubs: () => '/book-clubs',
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
	docs: (topic?: DocTopic, section?: string) =>
		`https://www.stumpapp.dev/guides/${topic || ''}${section ? `#${section}` : ''}`,
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
	seriesManagement: (id: string) => `/series/${id}/manage`,
	seriesOverview: (id: string, page?: number) => {
		if (page !== undefined) {
			return `/series/${id}?page=${page}`
		}
		return `/series/${id}`
	},
	settings: (subpath?: SettingsPage) => `/settings/${subpath || ''}`,
} as const

export default paths
