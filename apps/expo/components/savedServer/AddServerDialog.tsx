import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { Plus } from 'lucide-react-native'
import { useCallback, useRef } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'
import { useSavedServers } from '~/stores'

import { Icon } from '../ui/icon'
import AddOrEditServerForm, {
	AddOrEditServerSchema,
	transformFormData,
} from './AddOrEditServerForm'

export default function AddServerDialog() {
	const { createServer } = useSavedServers()
	const { isDarkColorScheme } = useColorScheme()
	const colors = useColors()

	const ref = useRef<TrueSheet>(null)

	const onSubmit = useCallback(
		(data: AddOrEditServerSchema) => {
			createServer(transformFormData(data))
			ref.current?.dismiss()
		},
		[createServer],
	)

	return (
		<View>
			<Pressable
				onPress={() => ref.current?.present()}
				style={
					IS_IOS_24_PLUS
						? {
								width: 35,
								height: 35,
								justifyContent: 'center',
								alignItems: 'center',
							}
						: undefined
				}
			>
				{({ pressed }) => (
					<Icon
						as={Plus}
						className={cn('text-foreground', pressed && 'opacity-70')}
						size={24}
						strokeWidth={1.25}
					/>
				)}
			</Pressable>

			<TrueSheet
				ref={ref}
				detents={[1]}
				backgroundColor={colors.background.DEFAULT}
				scrollable
				scrollableOptions={{ keyboardScrollOffset: 8 }}
				grabber
				grabberOptions={{ color: isDarkColorScheme ? '#333' : '#ccc' }}
			>
				<ScrollView className="p-6">
					<AddOrEditServerForm onSubmit={onSubmit} onClose={() => ref.current?.dismiss()} />
				</ScrollView>
			</TrueSheet>
		</View>
	)
}
