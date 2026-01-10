import React, { createContext, useContext } from 'react'

export enum MetadataEditorState {
	Display,
	Editing,
	Matching,
}

export type IMetadataEditorContext = {
	state: MetadataEditorState
	setState: React.Dispatch<React.SetStateAction<MetadataEditorState>>
	onCancel: () => void
	onSave: () => void
}

export const MetadataEditorContext = createContext<IMetadataEditorContext | null>(null)

export const useMetadataEditorContext = () => {
	const context = useContext(MetadataEditorContext)
	if (!context) {
		throw new Error('useMetadataEditorContext must be used within a MetadataEditorProvider')
	}
	return { ...context, isEditing: context.state === MetadataEditorState.Editing }
}
