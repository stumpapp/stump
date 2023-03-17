import { Button, Heading, Text } from '@stump/components'

import CreateLibraryModal from './CreateLibraryModal'

export default function NoLibraries() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<Heading size="md">You don&rsquo;t have any libraries configured</Heading>

			<CreateLibraryModal
				trigger={({ onClick }) => <Button onClick={onClick}>Create a library</Button>}
			/>
		</div>
	)
}
