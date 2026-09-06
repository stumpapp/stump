import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { View } from 'react-native'

import SheetWithHeader from '~/components/SheetWithHeader'
import { useColors } from '~/lib/constants'
import { ReadiumLocator } from '~/modules/readium'

import AnnotatedText from './AnnotatedText'
import AnnotationInput from './AnnotationInput'

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

		// TODO: use computed scoped mini-themes to prevent light colours with dark epub theme (and vice versa):
		//   - Use dark mode colours (i.e. black background, white text, etc.) with dark epub theme?
		//   - Or derive from epub theme colours and replace accent colour with something else?
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

		return (
			<SheetWithHeader
				ref={sheetRef}
				detents={[0.5, 1]}
				scrollable
				backgroundColor={colors.sheet.background}
				onDidDismiss={handleDismiss}
				headerLabel="New Annotation"
				headerLeftButton={{ type: 'dismiss' }}
				headerRightButton={{ type: 'check', onPress: handleCreate }}
			>
				<View className="gap-4">
					{selectedText && <AnnotatedText text={selectedText} />}

					<AnnotationInput value={annotation} onChangeText={setAnnotation} />
				</View>
			</SheetWithHeader>
		)
	},
)

CreateAnnotationSheet.displayName = 'CreateAnnotationSheet'

export default CreateAnnotationSheet
