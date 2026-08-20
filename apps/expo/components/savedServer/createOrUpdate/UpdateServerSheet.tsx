import { zodResolver } from '@hookform/resolvers/zod'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import isEqual from 'lodash/isEqual'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'

import SheetWithHeader from '~/components/SheetWithHeader'
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
	const sheetRef = useRef<TrueSheet>(null)

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
				<SheetWithHeader
					name="updateServerSheet"
					ref={sheetRef}
					detents={[1]}
					scrollable
					headerLabel={t('addOrEditServer.updateServer')}
					headerLeftButton={{ type: 'dismiss' }}
					headerRightButton={{
						type: 'check',
						// eslint-disable-next-line react-hooks/refs
						onPress: form.handleSubmit(onSubmit),
						// FIXME: disabled not working or styles not right
						disabled: editingServer ? !isUpdateReady : false,
					}}
					onDidDismiss={onClose}
				>
					<CreateOrUpdateServerForm />
				</SheetWithHeader>
			</FormProvider>
		</>
	)
}
