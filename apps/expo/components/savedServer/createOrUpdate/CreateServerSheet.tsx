import { zodResolver } from '@hookform/resolvers/zod'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { Plus } from 'lucide-react-native'
import { useCallback, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Pressable } from 'react-native-gesture-handler'

import ScrollViewSheet from '~/components/ScrollViewSheet'
import { Icon } from '~/components/ui'
import { IS_IOS_26_PLUS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { useSavedServers } from '~/stores'

import { CreateOrUpdateServerForm } from './CreateOrUpdateServerForm'
import {
	CreateOrUpdateServerData,
	createSchema,
	defaultCreateData,
	intoCreateServer,
} from './schemas'

export function CreateServerSheet() {
	const sheetRef = useRef<TrueSheet>(null)

	const { t } = useTranslate()
	const { savedServers, createServer } = useSavedServers()

	const onSubmit = useCallback(
		async (data: CreateOrUpdateServerData) => {
			await createServer(intoCreateServer(data))
			sheetRef.current?.dismiss()
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
				<ScrollViewSheet
					name="createServerSheet"
					ref={sheetRef}
					detents={[1]}
					headerLabel={t('addOrEditServer.createServer')}
					headerLeftButton={{ type: 'dismiss' }}
					headerRightButton={{
						type: 'check',
						// eslint-disable-next-line react-hooks/refs
						onPress: form.handleSubmit(onSubmit),
					}}
				>
					<CreateOrUpdateServerForm />
				</ScrollViewSheet>
			</FormProvider>
		</>
	)
}
