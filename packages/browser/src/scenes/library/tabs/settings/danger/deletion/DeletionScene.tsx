import React from 'react'

import CleanLibrary from './CleanLibrary'
import DeleteLibrary from './DeleteLibrary'

export default function DeletionScene() {
	return (
		<div className="flex flex-col gap-12">
			<CleanLibrary />
			<DeleteLibrary />
		</div>
	)
}
