import { MetadataField } from '@stump/graphql'
import React, { createContext, useCallback, useContext } from 'react'

import { BINDING_TO_METADATA_FIELD } from '../fieldDefs'

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
	lockedFields?: Set<MetadataField>
	onToggleLock?: (field: MetadataField) => void
}

export const MetadataEditorContext = createContext<IMetadataEditorContext | null>(null)

export const useMetadataEditorContext = () => {
	const context = useContext(MetadataEditorContext)
	if (!context) {
		throw new Error('useMetadataEditorContext must be used within a MetadataEditorProvider')
	}

	const { lockedFields } = context

	const isFieldLocked = useCallback(
		(binding: string): boolean => {
			const metadataField = BINDING_TO_METADATA_FIELD[binding]
			if (!metadataField) return false
			return lockedFields?.has(metadataField) ?? false
		},
		[lockedFields],
	)

	return {
		...context,
		isEditing: context.state === MetadataEditorState.Editing,
		isFieldLocked,
	}
}
