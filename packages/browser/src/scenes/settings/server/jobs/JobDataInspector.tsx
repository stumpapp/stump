import { Preformatted, Sheet, usePrevious } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'

const fragment = graphql(`
	fragment JobDataInspector on CoreJobOutput {
		__typename
		... on LibraryScanOutput {
			totalFiles
			totalDirectories
			ignoredFiles
			skippedFiles
			ignoredDirectories
			createdMedia
			updatedMedia
			createdSeries
			updatedSeries
		}
		... on SeriesScanOutput {
			totalFiles
			ignoredFiles
			skippedFiles
			createdMedia
			updatedMedia
		}
		... on ThumbnailGenerationOutput {
			visitedFiles
			skippedFiles
			generatedThumbnails
			removedThumbnails
		}
		... on ExternalJobOutput {
			val
		}
	}
`)

export type JobDataInspectorFragment = FragmentType<typeof fragment>

type Props = {
	data?: JobDataInspectorFragment | null
	onClose: () => void
}

export default function JobDataInspector({ data, onClose }: Props) {
	const inlineData = useFragment(fragment, data)
	const fallback = usePrevious(data)
	const displayedData = inlineData || fallback

	return (
		<Sheet
			open={!!data}
			onClose={onClose}
			title="Job data"
			description="The final output of the job after it had completed"
		>
			<Preformatted title="Raw JSON" content={displayedData} />
		</Sheet>
	)
}
