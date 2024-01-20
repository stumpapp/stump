import React from 'react'

import { SceneContainer } from '@/components/container'

import CreateSmartListHeader from './CreateSmartListHeader'
import { CreateSmartListForm } from './form'

export default function CreateSmartListScene() {
	return (
		<>
			<CreateSmartListHeader />
			<SceneContainer>
				<CreateSmartListForm />
			</SceneContainer>
		</>
	)
}
