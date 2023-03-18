import { Heading, Link, Text } from '@stump/components'

export default function CreateLibraryScene() {
	return (
		<div className="flex flex-col gap-4">
			<header className="flex flex-col gap-2">
				<Heading size="lg">Create New Library</Heading>
				<Text size="sm" variant="muted">
					Libraries are used to group your books together. If you&apos;re wanting a refresh on
					libraries and how they work, check out the{' '}
					<Link href="https://stumpapp.dev/guides/libraries">relevant documentation.</Link>
				</Text>
			</header>
		</div>
	)
}
