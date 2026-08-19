import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { PortalHost } from '@rn-primitives/portal'
import { useState } from 'react'
import { Platform } from 'react-native'
import { KeyboardController } from 'react-native-keyboard-controller'

import { KeyboardDraftNumberToolbar, useDraftNumber } from '~/components/keyboard'
import { SheetBackDetection } from '~/components/SheetBackDetection'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { PortalHostContext } from '~/lib/PortalHostContext'
import { useEpubLocationStore } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import { useEpubReaderContext } from './context'
import TableOfContentsSheetContent from './TableOfContentsSheetContent'

const SHEET_PORTAL_HOST = 'table-of-contents-sheet'

export default function TableOfContentsSheet() {
	const sheetRef = useEpubSheetStore((state) => state.tableOfContentsSheetRef)
	const totalPages = useEpubLocationStore((store) => store.totalPages)
	const { timer, readerRef } = useEpubReaderContext()
	const { t } = useTranslate()

	const colors = useColors()

	const [isOpen, setIsOpen] = useState(false)

	const goToPage = useDraftNumber({ validate: (number) => number <= totalPages && number > 0 })

	const positions = useEpubLocationStore((store) => store.positions)
	const pushJump = useEpubLocationStore((state) => state.pushJump)
	const closeSheet = useEpubSheetStore((state) => state.closeSheet)

	const handleGoToPage = async () => {
		if (!goToPage.isValid || goToPage.number == undefined) {
			goToPage.reset()
			KeyboardController.dismiss()
			return
		}

		const pageLocator = positions[goToPage.number - 1]
		if (pageLocator) {
			pushJump(pageLocator)
			await readerRef?.goToLocation(pageLocator)
			closeSheet('tableOfContents')
			goToPage.reset()
		}
	}

	return (
		<>
			<TrueSheet
				ref={sheetRef}
				detents={[1]}
				scrollable
				grabber
				backgroundColor={IS_IOS_26_PLUS ? undefined : colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
				style={{ flex: 1 }}
				insetAdjustment="automatic"
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => {
					setIsOpen(false)
					timer.resume()
				}}
				footer={
					<KeyboardDraftNumberToolbar
						draft={goToPage}
						onPress={handleGoToPage}
						messages={{
							button: t(getKey('goToPageX'), { page: goToPage.number }),
							invalidDefined: t(getKey('errors.pageDoesNotExist'), { page: goToPage.number }),
							undefined: t(getKey('errors.invalidPage'), { page: goToPage.string }),
						}}
						isSheetFooter
					/>
				}
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

const LOCALE_BASE = 'tableOfContents'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
