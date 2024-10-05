import React from 'react'

import { SceneContainer } from '@/components/container'

import CreateSmartListHeader from './CreateSmartListHeader'
import { CreateSmartListForm } from './form'
// import { SmartListQueryBuilder } from './queryBuilder'

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
