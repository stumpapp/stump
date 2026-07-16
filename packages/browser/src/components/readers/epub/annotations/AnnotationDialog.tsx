import { Button, Dialog, Text, TextArea } from '@stump/components'
import { useCallback, useEffect, useState } from 'react'

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
	const [note, setNote] = useState(initialNote ?? '')

	useEffect(() => {
		if (open) {
			setNote(initialNote ?? '')
		}
	}, [open, initialNote])

	const handleSave = useCallback(() => {
		onSave(note.trim())
	}, [note, onSave])

	return (
		<Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
			<Dialog.Content size="sm">
				<Dialog.Header>
					<Dialog.Title>{mode === 'create' ? 'Add note' : 'Edit annotation'}</Dialog.Title>
					<Dialog.Close onClick={() => onOpenChange(false)} />
				</Dialog.Header>

				{quotedText && (
					<Text variant="muted" size="sm" className="pl-3 border-l-2 border-border italic">
						&ldquo;{quotedText}&rdquo;
					</Text>
				)}

				<TextArea
					label="Note"
					placeholder="Add an optional note…"
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
							Delete
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						disabled={isPending}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button size="sm" disabled={isPending} onClick={handleSave}>
						Save
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
