// export type WidgetShared = {
// 	// TODO(widgets): figure out things like locale, colors, etc
// }

export type WidgetBook = {
	id: string
	serverId: string
	name: string
	percentage: number
	thumbnailPath?: string
	lastReadAt: number
	timeAgoLabel: string
	isReadingOffline: boolean
}

type ReadingNowStrings = {
	nothingInProgress: string
}

export type ReadingNowWidgetProps = {
	books: WidgetBook[]
	thumbnailRatio: number
	accentColor: string
	assetsPath: string
	strings: ReadingNowStrings
}
