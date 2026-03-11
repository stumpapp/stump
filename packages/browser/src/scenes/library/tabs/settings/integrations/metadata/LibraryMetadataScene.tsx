import { Suspense } from 'react'

import { PendingMatchesSection } from '@/components/metadata/metadataMatching'

import InitFetchJob from './InitFetchJob'

export default function LibraryMetadataScene() {
	return (
		<div className="flex flex-col gap-y-12">
			<PendingMatchesSection />
			<Suspense>
				<InitFetchJob />
			</Suspense>
		</div>
	)
}
