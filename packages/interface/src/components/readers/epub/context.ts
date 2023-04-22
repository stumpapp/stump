import { EpubContent, Media } from '@stump/types'
import { createContext, useContext } from 'react'

import { noop } from '../../../utils/misc'

export type EpubReaderChapterMeta = {
	/** The chapter's title. */
	name?: string
	/** The chapter's position in the book. */
	position?: number
	/** The chapter's total number of pages. */
	totalPages?: number
	/**
	 * The chapter's current page. If the viewport is large enough, two pages will
	 * be displayed, so this will be an array of two numbers.
	 */
	currentPage?: [number | undefined, number | undefined]
}

export type EpubReaderBookMeta = {
	chapter: EpubReaderChapterMeta
	toc: EpubContent[]
}

export type EpubReaderMeta = {
	bookEntity: Media | null
	bookMeta: EpubReaderBookMeta | null
	progress: number | null
}

export type EpubReaderControls = {
	visible: boolean
	setVisible: (visible: boolean) => void
	onMouseEnterControls: () => void
	onMouseLeaveControls: () => void
	onLinkClick: (href: string) => void
	onPaginateForward: () => void
	onPaginateBackward: () => void
}

export type EpubReaderContextProps = {
	readerMeta: EpubReaderMeta
	controls: EpubReaderControls
}

export const EpubReaderContext = createContext<EpubReaderContextProps>({
	controls: {
		onLinkClick: noop,
		onMouseEnterControls: noop,
		onMouseLeaveControls: noop,
		onPaginateBackward: noop,
		onPaginateForward: noop,
		setVisible: noop,
		visible: false,
	},
	readerMeta: {
		bookEntity: null,
		bookMeta: null,
		progress: null,
	},
})
export const useEpubReaderContext = () => useContext<EpubReaderContextProps>(EpubReaderContext)
export const useEpubReaderControls = () => useEpubReaderContext().controls
