import { cn } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Lock, LockOpen } from 'lucide-react'

import { BINDING_TO_METADATA_FIELD } from '../../fieldDefs'
import { useMetadataEditorContext } from '../context'

type Props = {
	binding: string
}

export default function LockFieldButton({ binding }: Props) {
	const { t } = useLocaleContext()
	const { lockedFields, onToggleLock } = useMetadataEditorContext()

	const metadataField = BINDING_TO_METADATA_FIELD[binding]
	if (!metadataField || !onToggleLock) return null

	const isLocked = lockedFields?.has(metadataField) ?? false

	return (
		<button
			type="button"
			onClick={(e) => {
				e.preventDefault()
				e.stopPropagation()
				onToggleLock(metadataField)
			}}
			className={cn(
				'shrink-0 transition-opacity',
				isLocked
					? 'text-muted-foreground opacity-100'
					: 'text-muted-foreground/50 opacity-0 group-hover/row:opacity-100',
			)}
			title={t(
				`metadataMatching.reviewDialog.fieldAction.${isLocked ? 'unlockField' : 'lockField'}`,
			)}
		>
			{isLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
		</button>
	)
}
