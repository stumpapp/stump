import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { PortalHost } from '@rn-primitives/portal'
import { useState } from 'react'
import { Platform } from 'react-native'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { PortalHostContext } from '~/lib/PortalHostContext'
import { useEpubLocationStore } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import { useEpubReaderContext } from './context'
import TableOfContentsSheetContent from './TableOfContentsSheetContent'
import TableOfContentsSheetFooter from './TableOfContentsSheetFooter'

const SHEET_PORTAL_HOST = 'table-of-contents-sheet'

export default function TableOfContentsSheet() {
	const sheetRef = useEpubSheetStore((state) => state.tableOfContentsSheetRef)
	const { timer } = useEpubReaderContext()

	const colors = useColors()

	const [isOpen, setIsOpen] = useState(false)

	const goToPage = useGoToPage()

	return (
		<>
			<TrueSheet
				ref={sheetRef}
				detents={[1]}
				scrollable
				grabber
				backgroundColor={IS_IOS_26_PLUS ? undefined : colors.background.DEFAULT}
				grabberOptions={{ color: colors.sheet.grabber }}
				style={{ flex: 1 }}
				insetAdjustment="automatic"
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => {
					setIsOpen(false)
					timer.resume()
				}}
				footer={<TableOfContentsSheetFooter goToPage={goToPage} />}
			>
				<PortalHostContext.Provider
					value={Platform.OS === 'android' ? SHEET_PORTAL_HOST : undefined}
				>
					<TableOfContentsSheetContent isOpen={isOpen} goToPage={goToPage} />
					{Platform.OS === 'android' && <PortalHost name={SHEET_PORTAL_HOST} />}
				</PortalHostContext.Provider>
			</TrueSheet>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</>
	)
}

function useGoToPage() {
	const totalPages = useEpubLocationStore((store) => store.totalPages)

	const [string, setString] = useState<string>('')
	const reset = () => setString('')

	const numberOrNaN = Number(string)
	const goToPageNumber = Number.isInteger(numberOrNaN) ? numberOrNaN : undefined
	const isEmpty = string === ''
	const isValidNumber =
		goToPageNumber != undefined && goToPageNumber <= totalPages && goToPageNumber > 0

	return { string, setString, reset, number: goToPageNumber, isEmpty, isValid: isValidNumber }
}

export type GoToPage = ReturnType<typeof useGoToPage>
