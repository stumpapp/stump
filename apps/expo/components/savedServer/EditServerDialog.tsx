import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView } from 'react-native-gesture-handler'

import { useColors } from '~/lib/constants'
import { CreateServer, SavedServerWithConfig } from '~/stores/savedServer'

import { SheetBackDetection } from '../SheetBackDetection'
import AddOrEditServerForm, {
	AddOrEditServerSchema,
	transformFormData,
} from './AddOrEditServerForm'

type Props = {
	editingServer: SavedServerWithConfig | null
	onClose: () => void
	onSubmit: (server: CreateServer) => void
}

export default function EditServerDialog({ editingServer, onClose, onSubmit }: Props) {
	const colors = useColors()

	const ref = useRef<TrueSheet>(null)
	const hasBeenPresentedRef = useRef(false)
	const [isOpen, setIsOpen] = useState(false)

	const handleSubmit = useCallback(
		(data: AddOrEditServerSchema) => {
			onSubmit(transformFormData(data))
		},
		[onSubmit],
	)

	useEffect(() => {
		if (editingServer) {
			hasBeenPresentedRef.current = true
			ref.current?.present()
		} else if (hasBeenPresentedRef.current) {
			ref.current?.dismiss()
		}
	}, [editingServer])

	return (
		<>
			<TrueSheet
				ref={ref}
				detents={[1]}
				backgroundColor={colors.background.DEFAULT}
				scrollable
				scrollableOptions={{ keyboardScrollOffset: 8 }}
				grabber
				grabberOptions={{ color: colors.sheet.grabber }}
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => {
					setIsOpen(false)
					onClose()
				}}
			>
				<ScrollView className="p-6">
					<AddOrEditServerForm
						editingServer={editingServer || undefined}
						onSubmit={handleSubmit}
						onClose={() => ref.current?.dismiss()}
					/>
				</ScrollView>
			</TrueSheet>

			<SheetBackDetection ref={ref} isOpen={isOpen} />
		</>
	)
}
