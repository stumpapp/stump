import { ButtonOrLink, Heading, Text } from '@stump/components'
import { CircleSlash2 } from 'lucide-react'

export default function NoLibraries() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
			<CircleSlash2 className="h-10 w-10 pb-2 pt-1 dark:text-gray-400" />
			<Heading size="sm">You don&apos;t have libraries configured</Heading>
			<Text size="sm" variant="muted">
				Once you create a library, this page will show a select list of books and series
			</Text>
			<ButtonOrLink className="mt-2" href="/library/create">
				Create a library
			</ButtonOrLink>
		</div>
	)
}
