import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { Alert, View } from 'react-native'

import SheetWithHeader from '~/components/SheetWithHeader'
import { Button, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { Decoration } from '~/modules/readium'

import AnnotatedText from './AnnotatedText'
import AnnotationInput from './AnnotationInput'

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

		return (
			<SheetWithHeader
				ref={sheetRef}
				detents={[0.5, 1]}
				scrollable
				backgroundColor={colors.sheet.background}
				onDidDismiss={handleDismiss}
				headerLabel="Edit Annotation"
				headerLeftButton={{ type: 'dismiss' }}
				headerRightButton={{ type: 'check', onPress: handleSaveAnnotation }}
			>
				<View className="gap-4">
					{highlightedText && <AnnotatedText text={highlightedText} />}

					<AnnotationInput
						value={annotation}
						onChangeText={(text) => {
							setAnnotation(text)
							setIsDirty(true)
						}}
					/>

					{/* TODO: Probably look better as joined button with primary action, however too lazy for that now */}
					<Button variant="destructive" onPress={handleDelete} roundness="full">
						<Text>Delete</Text>
					</Button>
				</View>
			</SheetWithHeader>
		)
	},
)

UpdateAnnotationSheet.displayName = 'UpdateAnnotationSheet'

export default UpdateAnnotationSheet
