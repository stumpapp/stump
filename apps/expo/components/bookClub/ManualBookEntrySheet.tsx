import { zodResolver } from '@hookform/resolvers/zod'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { BookClubBookInput } from '@stump/graphql'
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import { Controller, useForm, useFormState } from 'react-hook-form'
import { ScrollView, View } from 'react-native'
import { z } from 'zod'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'

import { Input, SheetHeader } from '../ui'

const schema = z.object({
	title: z.string().min(1, { message: 'Title is required' }),
	author: z.string().min(1, { message: 'Author is required' }),
	url: z.string().optional(),
	imageUrl: z.string().optional(),
})

type ManualBookEntrySchema = z.infer<typeof schema>

export type ManualBookEntrySheetRef = {
	open: () => void
	close: () => void
}

type Props = {
	onAddBook: (input: BookClubBookInput) => void
}

export const ManualBookEntrySheet = forwardRef<ManualBookEntrySheetRef, Props>(
	({ onAddBook }, ref) => {
		const sheetRef = useRef<TrueSheet>(null)

		const colors = useColors()

		const { control, handleSubmit, reset } = useForm<ManualBookEntrySchema>({
			resolver: zodResolver(schema),
			defaultValues: {
				title: '',
				author: '',
				url: '',
				imageUrl: '',
			},
		})
		const { errors } = useFormState({ control })

		useImperativeHandle(ref, () => ({
			open: () => {
				sheetRef.current?.present()
			},
			close: () => {
				sheetRef.current?.dismiss()
			},
		}))

		const handleDismiss = useCallback(() => {
			reset()
		}, [reset])

		const onSubmit = useCallback(
			(data: ManualBookEntrySchema) => {
				onAddBook({
					external: {
						title: data.title,
						author: data.author,
						url: data.url || undefined,
						imageUrl: data.imageUrl || undefined,
					},
				})
			},
			[onAddBook],
		)

		return (
			<TrueSheet
				ref={sheetRef}
				detents={['auto', 1]}
				cornerRadius={24}
				grabber
				scrollable
				backgroundColor={IS_IOS_24_PLUS ? undefined : colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
				onDidDismiss={handleDismiss}
				header={
					<SheetHeader
						title="Enter book details"
						onClose={() => sheetRef.current?.dismiss()}
						onSubmit={handleSubmit(onSubmit)}
					/>
				}
			>
				<ScrollView
					contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
					keyboardShouldPersistTaps="handled"
				>
					<View className="gap-4">
						<Controller
							control={control}
							name="title"
							render={({ field: { onChange, onBlur, value } }) => (
								<Input
									label="Title"
									placeholder="Book title"
									value={value}
									onChangeText={onChange}
									onBlur={onBlur}
									errorMessage={errors.title?.message}
									autoCapitalize="words"
									autoCorrect={false}
								/>
							)}
						/>

						<Controller
							control={control}
							name="author"
							render={({ field: { onChange, onBlur, value } }) => (
								<Input
									label="Author"
									placeholder="Author name"
									value={value}
									onChangeText={onChange}
									onBlur={onBlur}
									errorMessage={errors.author?.message}
									autoCapitalize="words"
									autoCorrect={false}
								/>
							)}
						/>

						<Controller
							control={control}
							name="url"
							render={({ field: { onChange, onBlur, value } }) => (
								<Input
									label="URL (optional)"
									placeholder="https://..."
									value={value}
									onChangeText={onChange}
									onBlur={onBlur}
									errorMessage={errors.url?.message}
									keyboardType="url"
									autoCapitalize="none"
									autoCorrect={false}
								/>
							)}
						/>

						<Controller
							control={control}
							name="imageUrl"
							render={({ field: { onChange, onBlur, value } }) => (
								<Input
									label="Cover image URL (optional)"
									placeholder="https://..."
									value={value}
									onChangeText={onChange}
									onBlur={onBlur}
									errorMessage={errors.imageUrl?.message}
									keyboardType="url"
									autoCapitalize="none"
									autoCorrect={false}
								/>
							)}
						/>
					</View>
				</ScrollView>
			</TrueSheet>
		)
	},
)

ManualBookEntrySheet.displayName = 'ManualBookEntrySheet'
