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
}

export type ReadingNowWidgetProps = {
	books: WidgetBook[]
}
