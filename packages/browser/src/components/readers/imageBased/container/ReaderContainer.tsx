import React, { PropsWithChildren } from 'react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'
import ReaderFooter from './ReaderFooter'
import ReaderHeader from './ReaderHeader'

const ReaderContainer = ({ children }: PropsWithChildren) => {
	const { book } = useImageBaseReaderContext()
	const {
		bookPreferences: { readingMode },
	} = useBookPreferences({ book })

	const showBottomToolbar = readingMode === 'paged'

	return (
		<React.Fragment>
			<ReaderHeader />
			{children}
			{showBottomToolbar && <ReaderFooter />}
		</React.Fragment>
	)
}

export default ReaderContainer
