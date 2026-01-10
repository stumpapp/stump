import { Button } from '@stump/components'

import { MetadataEditorState, useMetadataEditorContext } from './context'

export const MetadataEditorHeader = () => {
	const { state, setState, isEditing, onCancel, onSave } = useMetadataEditorContext()

	// Note: I had to separate the buttons because dynamically setting `type` based
	// on state would trigger a submit
	return (
		<div className="flex h-full flex-1 items-center justify-end gap-2 pr-1.5">
			{state === MetadataEditorState.Editing && (
				<Button
					type="button"
					size="sm"
					newYork
					variant="outline"
					className="rounded-lg"
					onClick={onCancel}
				>
					Cancel
				</Button>
			)}

			{isEditing && (
				<Button
					type="submit"
					size="sm"
					newYork
					variant="primary"
					className="rounded-lg"
					onClick={onSave}
				>
					Save
				</Button>
			)}

			{!isEditing && (
				<Button
					type="button"
					size="sm"
					newYork
					variant="outline"
					className="rounded-lg"
					onClick={() => setState(MetadataEditorState.Editing)}
				>
					Edit
				</Button>
			)}
		</div>
	)
}
