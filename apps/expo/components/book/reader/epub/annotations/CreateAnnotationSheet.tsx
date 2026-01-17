import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { TextInput, View } from 'react-native'

import { Text } from '~/components/ui'
import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { ReadiumLocator } from '~/modules/readium'

import AnnotationSheetHeader from './AnnotationSheetHeader'

export type CreateAnnotationSheetRef = {
	open: (locator: ReadiumLocator, selectedText: string) => void
	close: () => void
}

type Props = {
	onCreateAnnotation: (locator: ReadiumLocator, annotation?: string) => void
	onDismiss?: () => void
}

const CreateAnnotationSheet = forwardRef<CreateAnnotationSheetRef, Props>(
	({ onCreateAnnotation, onDismiss }, ref) => {
		const sheetRef = useRef<TrueSheet>(null)
		const [locator, setLocator] = useState<ReadiumLocator | null>(null)
		const [selectedText, setSelectedText] = useState('')
		const [annotation, setAnnotation] = useState('')

		const colors = useColors()

		useImperativeHandle(ref, () => ({
			open: (loc, text) => {
				setLocator(loc)
				setSelectedText(text)
				setAnnotation('')
				sheetRef.current?.present()
			},
			close: () => {
				sheetRef.current?.dismiss()
			},
		}))

		const handleCreate = useCallback(() => {
			if (!locator) return
			onCreateAnnotation(locator, annotation.trim() || undefined)
			sheetRef.current?.dismiss()
		}, [locator, annotation, onCreateAnnotation])

		const handleDismiss = useCallback(() => {
			setLocator(null)
			setSelectedText('')
			setAnnotation('')
			onDismiss?.()
		}, [onDismiss])

		// TODO: Make look better for iOS sheet, either adjust colors or remove glass
		return (
			<TrueSheet
				ref={sheetRef}
				detents={['auto', 1]}
				cornerRadius={24}
				grabber
				backgroundColor={IS_IOS_24_PLUS ? undefined : colors.background.DEFAULT}
				grabberOptions={{
					color: colors.sheet.grabber,
				}}
				onDidDismiss={handleDismiss}
				header={
					<AnnotationSheetHeader
						title="New Annotation"
						onClose={() => sheetRef.current?.dismiss()}
						onPrimaryAction={handleCreate}
					/>
				}
			>
				<View className="gap-4 p-4">
					{selectedText && (
						<View className="rounded-lg bg-background-surface p-3">
							<Text className="italic text-foreground-muted" numberOfLines={3}>
								&ldquo;{selectedText}&rdquo;
							</Text>
						</View>
					)}

					<View className="gap-2">
						<Text className="text-foreground-muted">Note</Text>
						<TextInput
							value={annotation}
							onChangeText={setAnnotation}
							placeholder="Enter your notes..."
							placeholderTextColor={colors.foreground.muted}
							multiline
							numberOfLines={3}
							className="min-h-[80px] rounded-lg border border-edge bg-background-surface p-3 text-foreground"
							textAlignVertical="top"
							autoFocus
						/>
					</View>
				</View>
			</TrueSheet>
		)
	},
)

CreateAnnotationSheet.displayName = 'CreateAnnotationSheet'

export default CreateAnnotationSheet
