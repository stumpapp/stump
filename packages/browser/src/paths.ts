import { MediaFilterInput } from '@stump/graphql'
import { toUrlParams } from '@stump/sdk'
import { useCallback } from 'react'
import { useLocation } from 'react-router'

import { useRouterContext } from './context/RouterContext'

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
	| 'account'
	| 'preferences'
	| 'desktop'
	| 'server'
	| 'logs'
	| 'users'
	| 'access'
	| 'email'
	| 'email/new'
	| 'notifications'
type DocTopic = 'access-control' | 'features/book-clubs'
type BookClubTab = 'overview' | 'members' | 'discussion' | 'settings'

const pathsInternal = {
	bookClub: (slug: string, tab?: BookClubTab) => `/clubs/${slug}${tab ? `/${tab}` : ''}`,
	bookClubCreate: () => '/clubs/create',
	bookClubDiscussion: (slug: string, discussionId?: string) => {
		const url = pathsInternal.bookClub(slug, 'discussion')
		if (discussionId?.length) {
			return `${url}?archivedChat=${discussionId}`
		}
		return url
	},
	bookClubDiscussionMessage: (slug: string, messageId: string, discussionId?: string) => {
		const url = pathsInternal.bookClubDiscussion(slug, discussionId) + '/thread/' + messageId
		if (discussionId?.length) {
			return `${url}?archivedChat=${discussionId}`
		}
		return url
	},
	bookClubScheduler: (id: string) => pathsInternal.bookClub(id, 'settings') + '/scheduler',
	bookClubSettings: (id: string) => pathsInternal.bookClub(id, 'settings'),
	bookClubs: () => '/clubs',
	bookManagement: (id: string) => `/books/${id}/manage`,
	bookOverview: (id: string) => `/books/${id}`,
	bookReader: (
		id: string,
		{ isEpub, isPdf, epubcfi, isAnimated, page, isStreaming, isIncognito }: BookReaderParams,
	) => {
		const baseUrl = pathsInternal.bookOverview(id)
		const searchParams = new URLSearchParams()

		if (isIncognito) {
			searchParams.append('incognito', 'true')
		}

		if (isEpub || !!epubcfi) {
			searchParams.append('stream', 'false')
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
	bookSearchWithFilter: (filters: MediaFilterInput) => {
		const params = toUrlParams({ filters: JSON.stringify(filters) })
		return `/books?${params.toString()}`
	},
	createEmailer: () => pathsInternal.settings('email/new'),
	docs: (topic?: DocTopic, section?: string) =>
		`https://www.stumpapp.dev/guides/${topic || ''}${section ? `#${section}` : ''}`,
	editEmailer: (id: number) => pathsInternal.settings('email') + `/${id}/edit`,
	home: () => '/',
	libraries: () => '/libraries',
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
		if (page != undefined) {
			return `/series/${id}/books?page=${page}`
		}
		return `/series/${id}/books`
	},
	serverLogs: (jobId?: string) =>
		pathsInternal.settings('logs') + (jobId ? `?job_id=${jobId}` : ''),
	settings: (subpath: SettingsPage = 'account') => `/settings/${subpath || ''}`,
	smartList: (id: string) => `/smart-lists/${id}`,
	smartListCreate: () => '/smart-lists/create',
	smartLists: () => '/smart-lists',
	updateUser: (id: string) => `${pathsInternal.settings('users')}/${id}/manage`,
} as const

/**
 * Creates a paths object that's aware of the router base path.
 * This function should be used within React components to get properly prefixed paths.
 */
export function usePaths() {
	const { basePath } = useRouterContext()

	if (!basePath) {
		return pathsInternal
	}

	return {
		bookClub: (id: string, tab?: BookClubTab) => `${basePath}${pathsInternal.bookClub(id, tab)}`,
		bookClubCreate: () => `${basePath}${pathsInternal.bookClubCreate()}`,
		bookClubDiscussion: (id: string, discussionId?: string) =>
			`${basePath}${pathsInternal.bookClubDiscussion(id, discussionId)}`,
		bookClubDiscussionMessage: (id: string, messageId: string, discussionId?: string) =>
			`${basePath}${pathsInternal.bookClubDiscussionMessage(id, messageId, discussionId)}`,
		bookClubScheduler: (id: string) => `${basePath}${pathsInternal.bookClubScheduler(id)}`,
		bookClubSettings: (id: string) => `${basePath}${pathsInternal.bookClubSettings(id)}`,
		bookClubs: () => `${basePath}${pathsInternal.bookClubs()}`,
		bookManagement: (id: string) => `${basePath}${pathsInternal.bookManagement(id)}`,
		bookOverview: (id: string) => `${basePath}${pathsInternal.bookOverview(id)}`,
		bookReader: (id: string, params: BookReaderParams) =>
			`${basePath}${pathsInternal.bookReader(id, params)}`,
		bookSearch: () => `${basePath}${pathsInternal.bookSearch()}`,
		bookSearchWithFilter: (filters: MediaFilterInput) =>
			`${basePath}${pathsInternal.bookSearchWithFilter(filters)}`,
		createEmailer: () => `${basePath}${pathsInternal.createEmailer()}`,
		docs: pathsInternal.docs, // Don't prefix external URLs
		editEmailer: (id: number) => `${basePath}${pathsInternal.editEmailer(id)}`,
		home: () => `${basePath}${pathsInternal.home()}`,
		libraries: () => `${basePath}${pathsInternal.libraries()}`,
		libraryBooks: (id: string, page?: number) =>
			`${basePath}${pathsInternal.libraryBooks(id, page)}`,
		libraryCreate: () => `${basePath}${pathsInternal.libraryCreate()}`,
		libraryFileExplorer: (id: string) => `${basePath}${pathsInternal.libraryFileExplorer(id)}`,
		libraryManage: (id: string) => `${basePath}${pathsInternal.libraryManage(id)}`,
		librarySeries: (id: string, page?: number) =>
			`${basePath}${pathsInternal.librarySeries(id, page)}`,
		notFound: () => `${basePath}${pathsInternal.notFound()}`,
		notifications: () => `${basePath}${pathsInternal.notifications()}`,
		seriesManagement: (id: string) => `${basePath}${pathsInternal.seriesManagement(id)}`,
		seriesOverview: (id: string, page?: number) =>
			`${basePath}${pathsInternal.seriesOverview(id, page)}`,
		serverLogs: (jobId?: string) => `${basePath}${pathsInternal.serverLogs(jobId)}`,
		settings: (subpath?: SettingsPage) => `${basePath}${pathsInternal.settings(subpath)}`,
		smartList: (id: string) => `${basePath}${pathsInternal.smartList(id)}`,
		smartListCreate: () => `${basePath}${pathsInternal.smartListCreate()}`,
		smartLists: () => `${basePath}${pathsInternal.smartLists()}`,
		updateUser: (id: string) => `${basePath}${pathsInternal.updateUser(id)}`,
	}
}

const paths = pathsInternal

export default paths

export const usePathActive = () => {
	const location = useLocation()
	const { basePath } = useRouterContext()

	return useCallback(
		(cmp: string) => location.pathname.startsWith(`${basePath}${cmp}`),
		[basePath, location.pathname],
	)
}
