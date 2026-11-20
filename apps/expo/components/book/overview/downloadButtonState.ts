type DownloadQueueBook = {
	bookId: string
	serverId: string
}

type GetDownloadButtonStateParams = {
	bookId: string
	serverId: string
	isDownloaded: boolean
	pendingItems: DownloadQueueBook[]
	activeItems: DownloadQueueBook[]
}

export type DownloadButtonState = 'queued' | 'downloading' | 'completed'

export function getDownloadButtonState({
	bookId,
	serverId,
	isDownloaded,
	pendingItems,
	activeItems,
}: GetDownloadButtonStateParams): DownloadButtonState | undefined {
	if (isDownloaded) return 'completed'
	if (activeItems.some((item) => item.bookId === bookId && item.serverId === serverId)) {
		return 'downloading'
	}
	if (pendingItems.some((item) => item.bookId === bookId && item.serverId === serverId)) {
		return 'queued'
	}
	return undefined
}
