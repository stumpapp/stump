import { Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import GenericEmptyState from '@/components/GenericEmptyState'

import { useEpubReaderContext } from '../context'
import type { EpubAnnotation } from './types'

type Props = {
	onLocationChanged?: () => void
}

export default function AnnotationsList({ onLocationChanged }: Props) {
	const { t } = useLocaleContext()
	const {
		readerMeta: { bookMeta },
		controls: { onGoToLocator },
	} = useEpubReaderContext()

	const annotations = bookMeta?.annotations ?? []

	const handleSelect = useCallback(
		async (annotation: EpubAnnotation) => {
			const navigated = await onGoToLocator(annotation.locator)
			if (navigated) {
				onLocationChanged?.()
			}
		},
		[onGoToLocator, onLocationChanged],
	)

	if (!annotations.length) {
		return <GenericEmptyState title={t('epubReader.noAnnotations')} />
	}

	return (
		<div className="px-2 scrollbar-hide flex max-h-full flex-col divide-y divide-border overflow-y-auto">
			{annotations.map((annotation) => {
				const subtitle = annotation.locator.chapterTitle || annotation.locator.href
				const highlight = annotation.locator.text?.highlight

				return (
					<button
						key={annotation.id}
						className="gap-1.5 p-2 px-1 py-1.5 flex flex-col justify-start text-left hover:bg-muted"
						onClick={() => void handleSelect(annotation)}
					>
						<Text variant="muted" size="xs" className="line-clamp-1">
							{subtitle}
						</Text>
						{highlight && (
							<Text size="sm" className="line-clamp-2 italic">
								&ldquo;{highlight}&rdquo;
							</Text>
						)}
						{annotation.annotationText && (
							<Text size="sm" variant="muted" className="line-clamp-2">
								{annotation.annotationText}
							</Text>
						)}
					</button>
				)
			})}
		</div>
	)
}
