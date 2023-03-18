import { Heading, Text } from '@stump/components'

export default function CreateLibraryScene() {
	return (
		<div className="flex flex-col gap-4">
			<header className="flex flex-col gap-2">
				<Heading size="lg">Create New Library</Heading>
				<Text size="sm" variant="muted">
					Libraries are used to group your books together. If you&apos;re wanting a refresh on
					libraries, check out our the relvant documentation.
				</Text>
			</header>
		</div>
	)
}
