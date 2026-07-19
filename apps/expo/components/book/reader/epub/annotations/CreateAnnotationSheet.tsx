import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { ReadiumLocator } from '~/modules/readium'

import AnnotatedText from './AnnotatedText'
import AnnotationInput from './AnnotationInput'
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
		const [isOpen, setIsOpen] = useState(false)
		const [naturalDetent, setNaturalDetent] = useState<number>(0)

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
			setIsOpen(false)
			setLocator(null)
			setSelectedText('')
			setAnnotation('')
			setNaturalDetent(0)
			onDismiss?.()
		}, [onDismiss])

		return (
			<>
				<TrueSheet
					ref={sheetRef}
					detents={['auto']}
					grabber
					backgroundColor={colors.sheet.background}
					grabberOptions={{
						color: colors.sheet.grabber,
					}}
					onDidPresent={(e) => {
						setIsOpen(true)
						setNaturalDetent(e.nativeEvent.detent)
					}}
					onDidDismiss={handleDismiss}
					header={
						<AnnotationSheetHeader
							title="New Annotation"
							onClose={() => sheetRef.current?.dismiss()}
							onPrimaryAction={handleCreate}
						/>
					}
					scrollable={naturalDetent >= 1}
					headerStyle={
						IS_IOS_26_PLUS ? { position: 'absolute', left: 0, right: 0, zIndex: 1 } : undefined
					}
					scrollableOptions={{ topScrollEdgeEffect: 'soft' }}
				>
					<ScrollView
						className={cn('p-4', IS_IOS_26_PLUS && 'pt-20')}
						scrollEnabled={naturalDetent >= 1}
					>
						<View className="gap-4">
							{selectedText && <AnnotatedText text={selectedText} />}

							<AnnotationInput value={annotation} onChangeText={setAnnotation} />
						</View>
					</ScrollView>
				</TrueSheet>

				<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
			</>
		)
	},
)

CreateAnnotationSheet.displayName = 'CreateAnnotationSheet'

export default CreateAnnotationSheet
