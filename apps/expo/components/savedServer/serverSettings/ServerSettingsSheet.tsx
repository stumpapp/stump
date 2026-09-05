import { TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet'
import { useRef } from 'react'

import SheetWithHeader from '~/components/SheetWithHeader'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { ServerSettingsProvider } from '~/providers/ServerSettingsProvider'
import { SavedServer } from '~/stores/savedServer'

import { ServerSettingsSheetContent } from './ServerSettingsSheetContent'

type Props = {
	activeServer?: SavedServer
} & TrueSheetProps

export function ServerSettingsSheet({ activeServer, ...sheetProps }: Props) {
	const colors = useColors()
	const sheetRef = useRef<TrueSheet>(null)

	return (
		<ServerSettingsProvider activeServer={activeServer}>
			<SheetWithHeader
				name="serverSettingsSheet"
				ref={sheetRef}
				detents={[1]}
				grabber
				scrollable
				backgroundColor={IS_IOS_26_PLUS ? undefined : colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
				{...sheetProps}
				onDidDismiss={(event) => {
					sheetProps?.onDidDismiss?.(event)
				}}
				headerLeftButton={{ type: 'dismiss' }}
				headerLabel="Server Settings"
			>
				<ServerSettingsSheetContent />
			</SheetWithHeader>
		</ServerSettingsProvider>
	)
}
