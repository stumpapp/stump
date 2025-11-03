import { ReaderBookRef } from '../../image/context'

export type PagedActionMenuProps = {
	incognito?: boolean
	book: ReaderBookRef
	serverId: string
	onResetTimer?: () => void
	onChangeReadingDirection?: () => void
	onShowSettings?: () => void
}
