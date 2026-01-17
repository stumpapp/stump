import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { Alert, TextInput, View } from 'react-native'

import { Button, Text } from '~/components/ui'
import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { Decoration } from '~/modules/readium'

import AnnotationSheetHeader from './AnnotationSheetHeader'

export type UpdateAnnotationSheetRef = {
	open: (decoration: Decoration) => void
	close: () => void
}

type Props = {
	onAnnotationChange: (decorationId: string, annotation: string | undefined) => void
	onDelete: (decorationId: string) => void
}

const UpdateAnnotationSheet = forwardRef<UpdateAnnotationSheetRef, Props>(
	({ onAnnotationChange, onDelete }, ref) => {
		const sheetRef = useRef<TrueSheet>(null)
		const [decoration, setDecoration] = useState<Decoration | null>(null)
		const [annotation, setAnnotation] = useState('')
		const [isDirty, setIsDirty] = useState(false)

		const colors = useColors()

		useImperativeHandle(ref, () => ({
			open: (dec) => {
				setDecoration(dec)
				setAnnotation(dec.annotationText ?? '')
				setIsDirty(false)
				sheetRef.current?.present()
			},
			close: () => {
				sheetRef.current?.dismiss()
			},
		}))

		const handleSaveAnnotation = useCallback(() => {
			if (!decoration) return
			onAnnotationChange(decoration.id, annotation.trim() || undefined)
			setIsDirty(false)
			sheetRef.current?.dismiss()
		}, [decoration, annotation, onAnnotationChange])

		const handleDelete = useCallback(() => {
			if (!decoration) return

			Alert.alert('Delete Highlight', 'Are you sure you want to delete this annotation?', [
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: () => {
						onDelete(decoration.id)
						sheetRef.current?.dismiss()
					},
				},
			])
		}, [decoration, onDelete])

		const handleDismiss = useCallback(() => {
			if (isDirty && decoration && annotation !== (decoration.annotationText ?? '')) {
				onAnnotationChange(decoration.id, annotation.trim() || undefined)
			}
			setDecoration(null)
			setIsDirty(false)
		}, [isDirty, decoration, annotation, onAnnotationChange])

		const highlightedText = decoration?.locator?.text?.highlight

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
						title="Edit Annotation"
						onClose={() => sheetRef.current?.dismiss()}
						onPrimaryAction={handleSaveAnnotation}
					/>
				}
			>
				<View className="gap-4 p-4">
					{highlightedText && (
						<View className="rounded-lg bg-background-surface p-3">
							<Text className="italic text-foreground-muted" numberOfLines={3}>
								&ldquo;{highlightedText}&rdquo;
							</Text>
						</View>
					)}

					<View className="gap-2">
						<Text className="text-foreground-muted">Note</Text>
						<TextInput
							value={annotation}
							onChangeText={(text) => {
								setAnnotation(text)
								setIsDirty(true)
							}}
							placeholder="Enter your notes..."
							placeholderTextColor={colors.foreground.muted}
							multiline
							numberOfLines={3}
							className="min-h-[80px] rounded-lg border border-edge bg-background-surface p-3 text-foreground"
							textAlignVertical="top"
						/>
					</View>

					{/* TODO: Probably look better as joined button with primary action, however too lazy for that now */}
					<Button variant="destructive" onPress={handleDelete} roundness="full">
						<Text className="text-white">Delete</Text>
					</Button>
				</View>
			</TrueSheet>
		)
	},
)

UpdateAnnotationSheet.displayName = 'UpdateAnnotationSheet'

export default UpdateAnnotationSheet
