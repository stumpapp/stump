import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useCallback, useEffect, useRef } from 'react'
import { ScrollView } from 'react-native-gesture-handler'

import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { CreateServer, SavedServerWithConfig } from '~/stores/savedServer'

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
	const { isDarkColorScheme } = useColorScheme()
	const colors = useColors()

	const ref = useRef<TrueSheet>(null)

	const handleSubmit = useCallback(
		(data: AddOrEditServerSchema) => {
			onSubmit(transformFormData(data))
		},
		[onSubmit],
	)

	useEffect(() => {
		if (editingServer) {
			ref.current?.present()
		} else {
			ref.current?.dismiss()
		}
	}, [editingServer])

	return (
		<TrueSheet
			ref={ref}
			detents={[1]}
			backgroundColor={colors.background.DEFAULT}
			scrollable
			scrollableOptions={{ keyboardScrollOffset: 8 }}
			grabber
			grabberOptions={{ color: isDarkColorScheme ? '#333' : '#ccc' }}
			onDidDismiss={onClose}
		>
			<ScrollView className="p-6">
				<AddOrEditServerForm
					editingServer={editingServer || undefined}
					onSubmit={handleSubmit}
					onClose={() => ref.current?.dismiss()}
				/>
			</ScrollView>
		</TrueSheet>
	)
}
