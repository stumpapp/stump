import { zodResolver } from '@hookform/resolvers/zod'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { Check, Plus, X } from 'lucide-react-native'
import { useCallback, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { ScrollView, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { Heading, Icon } from '~/components/ui'
import { HeaderButton } from '~/components/ui/header-button/header-button'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { useSavedServers } from '~/stores'

import { CreateOrUpdateServerForm } from './CreateOrUpdateServerForm'
import { CreateOrUpdateServerData, createSchema, defaultCreateData } from './schemas'

export function CreateServerSheet() {
	const colors = useColors()
	const insets = useSafeAreaInsets()
	const sheetRef = useRef<TrueSheet>(null)

	const [isOpen, setIsOpen] = useState(false)

	const { t } = useTranslate()
	const { savedServers, createServer } = useSavedServers()

	const onSubmit = useCallback(
		(data: CreateOrUpdateServerData) => {
			// createServer(transformFormData(data))
			// ref.current?.dismiss()
		},
		[createServer],
	)

	const form = useForm<CreateOrUpdateServerData>({
		defaultValues: defaultCreateData,
		resolver: zodResolver(
			createSchema(
				savedServers.map(({ name }) => name),
				t,
			),
		),
	})

	return (
		<>
			<Pressable
				// onPress={() => ref.current?.present()}
				onPress={() => TrueSheet.present('createServerSheet')}
				style={
					IS_IOS_26_PLUS
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

			<FormProvider {...form}>
				<TrueSheet
					name="createServerSheet"
					ref={sheetRef}
					detents={[1]}
					dimmed={false}
					grabber
					scrollable
					backgroundColor={IS_IOS_26_PLUS ? undefined : colors.sheet.background}
					grabberOptions={{ color: colors.sheet.grabber }}
					style={{
						paddingBottom: insets.bottom,
					}}
					insetAdjustment="automatic"
					header={
						<View className="px-4 pt-4 flex-row items-center justify-between">
							<HeaderButton
								ios={{ variant: 'glass' }}
								icon={{ ios: 'xmark', android: X }}
								onPress={() => sheetRef.current?.dismiss()}
							/>

							<Heading className="font-semibold leading-6">Create Server</Heading>

							<HeaderButton
								ios={{ variant: 'glassProminent' }}
								android={{ variant: 'prominent' }}
								// onPress={handleSubmit(onSubmit)}
								// disabled={editingServer ? !isUpdateReady : false}
								icon={{ ios: 'checkmark', android: Check }}
							/>
						</View>
					}
					onDidPresent={() => setIsOpen(true)}
					onDidDismiss={() => setIsOpen(false)}
				>
					<ScrollView className="p-6 flex-1" nestedScrollEnabled>
						<CreateOrUpdateServerForm />
					</ScrollView>

					<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
				</TrueSheet>
			</FormProvider>
		</>
	)
}
