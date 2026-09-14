import { Button } from '@stump/components'

import { MetadataEditorState, useMetadataEditorContext } from './context'

export const MetadataEditorHeader = () => {
	const { state, setState, isEditing, onCancel, onSave } = useMetadataEditorContext()

	// Note: I had to separate the buttons because dynamically setting `type` based
	// on state would trigger a submit
	return (
		<div className="gap-2 pr-1.5 flex h-full flex-1 items-center justify-end">
			{state === MetadataEditorState.Editing && (
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="h-7 px-2.5 rounded-lg"
					onClick={onCancel}
				>
					Cancel
				</Button>
			)}

			{isEditing && (
				<Button type="submit" size="sm" className="h-7 px-2.5 rounded-lg" onClick={onSave}>
					Save
				</Button>
			)}

			{!isEditing && (
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="h-7 px-2.5 rounded-lg"
					onClick={() => setState(MetadataEditorState.Editing)}
				>
					Edit
				</Button>
			)}
		</div>
	)
}
