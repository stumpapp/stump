import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { Alert, ScrollView, View } from 'react-native'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { Button, Text } from '~/components/ui'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { Decoration } from '~/modules/readium'

import AnnotatedText from './AnnotatedText'
import AnnotationInput from './AnnotationInput'
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
		const { t } = useTranslate()
		const sheetRef = useRef<TrueSheet>(null)
		const [decoration, setDecoration] = useState<Decoration | null>(null)
		const [annotation, setAnnotation] = useState('')
		const [isDirty, setIsDirty] = useState(false)
		const [isOpen, setIsOpen] = useState(false)
		const [naturalDetent, setNaturalDetent] = useState<number>(0)

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

			Alert.alert(t('reader.deleteHighlight'), t('reader.deleteAnnotationConfirmation'), [
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: t('common.delete'),
					style: 'destructive',
					onPress: () => {
						onDelete(decoration.id)
						sheetRef.current?.dismiss()
					},
				},
			])
		}, [decoration, onDelete, t])

		const handleDismiss = useCallback(() => {
			setIsOpen(false)
			if (isDirty && decoration && annotation !== (decoration.annotationText ?? '')) {
				onAnnotationChange(decoration.id, annotation.trim() || undefined)
			}
			setDecoration(null)
			setIsDirty(false)
			setNaturalDetent(0)
		}, [isDirty, decoration, annotation, onAnnotationChange])

		const highlightedText = decoration?.locator?.text?.highlight

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
							title={t('reader.editAnnotation')}
							onClose={() => sheetRef.current?.dismiss()}
							onPrimaryAction={handleSaveAnnotation}
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
								<Text>{t('common.delete')}</Text>
							</Button>
						</View>
					</ScrollView>
				</TrueSheet>

				<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
			</>
		)
	},
)

UpdateAnnotationSheet.displayName = 'UpdateAnnotationSheet'

export default UpdateAnnotationSheet
