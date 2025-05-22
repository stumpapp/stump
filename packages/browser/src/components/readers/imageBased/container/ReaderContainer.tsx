import { ReadingMode } from '@stump/graphql'
import { Fragment, PropsWithChildren } from 'react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'
import ReaderFooter from './ReaderFooter'
import ReaderHeader from './ReaderHeader'

const ReaderContainer = ({ children }: PropsWithChildren) => {
	const { book } = useImageBaseReaderContext()
	const {
		bookPreferences: { readingMode },
	} = useBookPreferences({ book })

	const showBottomToolbar = readingMode === ReadingMode.Paged

	return (
		<Fragment>
			<ReaderHeader />
			{children}
			{showBottomToolbar && <ReaderFooter />}
		</Fragment>
	)
}

export default ReaderContainer
