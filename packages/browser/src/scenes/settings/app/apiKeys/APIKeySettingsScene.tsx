import { ContentContainer, SceneContainer } from '@/components/container'
import { Heading, Text } from '@stump/components'
import React, { Suspense } from 'react'
import APIKeyTable from './APIKeyTable'
import CreateAPIKeyModal from './CreateAPIKeyModal'

// TODO(koreader): localize
export default function APIKeySettingsScene() {
	return (
		<SceneContainer>
			<ContentContainer>
				<div className="flex flex-col gap-4">
					<div className="flex items-end justify-between">
						<div>
							<Heading size="sm">Your keys</Heading>
							<Text size="sm" variant="muted" className="mt-1">
								These are the API keys you have created
							</Text>
						</div>

						<CreateAPIKeyModal />
					</div>

					<Suspense>
						<APIKeyTable />
					</Suspense>
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
