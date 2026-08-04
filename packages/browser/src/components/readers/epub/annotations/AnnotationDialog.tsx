import { Button, Dialog, Text, TextArea } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useEffect, useState } from 'react'

type Props = {
	open: boolean
	mode: 'create' | 'edit'
	quotedText?: string | null
	initialNote?: string | null
	isPending?: boolean
	onOpenChange: (open: boolean) => void
	onSave: (annotationText: string) => void
	onDelete?: () => void
}

/**
 * Create/edit surface for a single annotation: shows the quoted highlight text (if
 * any), a note textarea, and Save / Cancel / Delete (edit mode only) actions.
 */
export default function AnnotationDialog({
	open,
	mode,
	quotedText,
	initialNote,
	isPending,
	onOpenChange,
	onSave,
	onDelete,
}: Props) {
	const { t } = useLocaleContext()
	const [note, setNote] = useState(initialNote ?? '')

	useEffect(() => {
		if (open) {
			setNote(initialNote ?? '')
		}
	}, [open, initialNote])

	return (
		<Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
			<Dialog.Content size="sm">
				<Dialog.Header>
					<Dialog.Title>
						{t(mode === 'create' ? 'epubReader.annotation.addNote' : 'epubReader.annotation.edit')}
					</Dialog.Title>
					<Dialog.Close onClick={() => onOpenChange(false)} />
				</Dialog.Header>

				{quotedText && (
					<Text variant="muted" size="sm" className="pl-3 border-l-2 border-border italic">
						&ldquo;{quotedText}&rdquo;
					</Text>
				)}

				<TextArea
					label={t('epubReader.annotation.note')}
					placeholder={t('epubReader.annotation.optionalNote')}
					value={note}
					onChange={(event) => setNote(event.target.value)}
					rows={4}
					autoFocus
				/>

				<Dialog.Footer>
					{mode === 'edit' && onDelete && (
						<Button
							variant="destructive"
							size="sm"
							disabled={isPending}
							onClick={onDelete}
							className="sm:mr-auto"
						>
							{t('common.delete')}
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						disabled={isPending}
						onClick={() => onOpenChange(false)}
					>
						{t('common.cancel')}
					</Button>
					<Button size="sm" disabled={isPending} onClick={() => onSave(note.trim())}>
						{t('common.save')}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
