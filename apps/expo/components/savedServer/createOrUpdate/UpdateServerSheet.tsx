import { zodResolver } from '@hookform/resolvers/zod'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import isEqual from 'lodash/isEqual'
import { Check, X } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { Heading } from '~/components/ui'
import { HeaderButton } from '~/components/ui/header-button/header-button'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useSavedServers } from '~/stores'
import { SavedServerWithConfig } from '~/stores/savedServer'

import { CreateOrUpdateServerForm } from './CreateOrUpdateServerForm'
import {
	CreateOrUpdateServerData,
	createSchema,
	getUpdateServerDefaults,
	intoCreateServer,
} from './schemas'

type Props = {
	editingServer: SavedServerWithConfig | null
	onClose: () => void
}

export function UpdateServerSheet({ editingServer, onClose }: Props) {
	const colors = useColors()
	const insets = useSafeAreaInsets()
	const sheetRef = useRef<TrueSheet>(null)

	const [isOpen, setIsOpen] = useState(false)

	const { t } = useTranslate()
	const { savedServers, updateServer } = useSavedServers()

	const hasBeenPresentedRef = useRef(false)
	useEffect(() => {
		if (editingServer) {
			hasBeenPresentedRef.current = true
			sheetRef.current?.present()
		} else if (hasBeenPresentedRef.current) {
			sheetRef.current?.dismiss()
		}
	}, [editingServer])

	const onSubmit = useCallback(
		async (data: CreateOrUpdateServerData) => {
			if (editingServer) {
				await updateServer(editingServer.id, {
					...intoCreateServer(data),
					avatar: editingServer.avatar, // keep the existing avatar, not part of form
				})
				sheetRef.current?.dismiss()
			}
		},
		[editingServer, updateServer],
	)

	const form = useForm<CreateOrUpdateServerData>({
		defaultValues: getUpdateServerDefaults(editingServer),
		resolver: zodResolver(
			createSchema(
				savedServers.map(({ name }) => name).filter((name) => name !== editingServer?.name),
				t,
			),
		),
	})

	const formValues = useWatch({ control: form.control })
	const isUpdateReady = useMemo(
		() => !isEqual(getUpdateServerDefaults(editingServer), formValues),
		[formValues, editingServer],
	)

	useEffect(() => {
		if (editingServer) {
			form.reset(getUpdateServerDefaults(editingServer))
		}
	}, [form, editingServer])

	return (
		<>
			<FormProvider {...form}>
				<TrueSheet
					name="updateServerSheet"
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

							<Heading className="font-semibold leading-6">
								{t('addOrEditServer.updateServer')}
							</Heading>

							<HeaderButton
								ios={{ variant: 'glassProminent' }}
								android={{ variant: 'prominent' }}
								// eslint-disable-next-line react-hooks/refs
								onPress={form.handleSubmit(onSubmit)}
								// FIXME: disabled not working or styles not right
								disabled={editingServer ? !isUpdateReady : false}
								icon={{ ios: 'checkmark', android: Check }}
							/>
						</View>
					}
					onDidPresent={() => setIsOpen(true)}
					onDidDismiss={() => {
						setIsOpen(false)
						onClose()
					}}
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
