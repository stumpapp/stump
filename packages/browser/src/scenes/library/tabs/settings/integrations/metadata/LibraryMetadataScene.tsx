import { PendingMatchesSection } from '@/components/metadataMatching'

import InitFetchJob from './InitFetchJob'

export default function LibraryMetadataScene() {
	return (
		<div className="flex flex-col gap-y-12">
			<PendingMatchesSection />
			<InitFetchJob />
		</div>
	)
}
