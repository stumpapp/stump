import { ReaderBookRef } from '../../image/context'

export type PagedActionMenuProps = {
	incognito?: boolean
	book: ReaderBookRef
	serverId: string
	onResetTimer?: () => void
	onChangeReadingDirection?: () => void
	onShowSettings?: () => void
	isFeatureSupported?: {
		paginated: boolean
		verticalScroll: boolean
		horizontalScroll: boolean
	}
}
