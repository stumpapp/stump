type BookReaderParams = {
	page?: number
	isEpub?: boolean
	isPdf?: boolean
	epubcfi?: string | null
	isAnimated?: boolean
	isStreaming?: boolean
	isIncognito?: boolean
}

type SettingsPage =
	| 'app/general'
	| 'app/appearance'
	| 'app/desktop'
	| 'server/general'
	| 'server/logs'
	| 'server/users'
	| 'server/access'
	| 'server/email'
	| 'server/email/new'
	| 'server/notifications'
type DocTopic = 'access-control' | 'book-club'
type BookClubTab = 'overview' | 'members' | 'chat-board' | 'settings'

const IS_DEV = import.meta.env.DEV

const paths = {
	bookClub: (id: string, tab?: BookClubTab) => `/book-clubs/${id}${tab ? `/${tab}` : ''}`,
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
	bookClubScheduler: (id: string) => paths.bookClub(id, 'settings') + '/scheduler',
	bookClubSettings: (id: string) => paths.bookClub(id, 'settings'),
	bookClubs: () => '/book-clubs',
	bookManagement: (id: string) => `/books/${id}/manage`,
	bookOverview: (id: string) => `/books/${id}`,
	bookReader: (
		id: string,
		{ isEpub, isPdf, epubcfi, isAnimated, page, isStreaming, isIncognito }: BookReaderParams,
	) => {
		const baseUrl = paths.bookOverview(id)
		const searchParams = new URLSearchParams()

		if (isIncognito) {
			searchParams.append('incognito', 'true')
		}

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
	createEmailer: () => paths.settings('server/email/new'),
	docs: (topic?: DocTopic, section?: string) =>
		`https://www.stumpapp.dev/guides/${topic || ''}${section ? `#${section}` : ''}`,
	editEmailer: (id: number) => paths.settings('server/email') + `/${id}/edit`,
	home: () => '/',
	libraryBooks: (id: string, page?: number) => {
		if (page !== undefined) {
			return `/libraries/${id}/books?page=${page}`
		}
		return `/libraries/${id}/books`
	},
	libraryCreate: () => '/libraries/create',
	libraryFileExplorer: (id: string) => `/libraries/${id}/files`,
	libraryManage: (id: string) => `/libraries/${id}/settings`,
	librarySeries: (id: string, page?: number) => {
		if (page !== undefined) {
			return `/libraries/${id}/series?page=${page}`
		}
		return `/libraries/${id}`
	},
	notFound: () => '/404',
	notifications: () => '/notifications',
	seriesManagement: (id: string) => `/series/${id}/manage`,
	seriesOverview: (id: string, page?: number) => {
		if (page !== undefined) {
			return `/series/${id}?page=${page}`
		}
		return `/series/${id}`
	},
	serverLogs: (jobId?: string) => paths.settings('server/logs') + (jobId ? `?job_id=${jobId}` : ''),
	settings: (subpath: SettingsPage = 'app/general') => `/settings/${subpath || ''}`,
	smartList: (id: string) => `/smart-lists/${id}`,
	smartListCreate: () =>
		IS_DEV ? '/smart-lists/create' : 'https://stumpapp.dev/guides/smart-list#creating-a-smart-list',
	smartLists: () => '/smart-lists',
	updateUser: (id: string) => `${paths.settings('server/users')}/${id}/manage`,
} as const

export default paths
