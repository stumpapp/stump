import { ReaderBookRef } from '../../image/context'

export type PagedActionMenuProps = {
	book: ReaderBookRef
	serverId: string
	onResetTimer?: () => void
	onShowSettings?: () => void
}
