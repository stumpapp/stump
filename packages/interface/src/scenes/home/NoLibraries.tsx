import { ButtonOrLink, Heading } from '@stump/components'

export default function NoLibraries() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<Heading size="md">You don&rsquo;t have any libraries configured</Heading>
			<ButtonOrLink href="/library/create">Create a library</ButtonOrLink>
		</div>
	)
}
