import { ButtonOrLink, Heading, Text } from '@stump/components'
import { CircleSlash2 } from 'lucide-react'

import { useAppContext } from '../../context'
import paths from '../../paths'

export default function NoLibraries() {
	const { isServerOwner } = useAppContext()

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
			<CircleSlash2 className="h-10 w-10 pb-2 pt-1 dark:text-gray-400" />
			<Heading size="sm">
				{isServerOwner ? "You don't have" : 'There are no'} libraries configured
			</Heading>
			<Text size="sm" variant="muted">
				Once {isServerOwner ? 'you create a library' : 'a library has been created'}, this page will
				show a select list of books and series
			</Text>
			{isServerOwner && (
				<ButtonOrLink className="mt-2" href={paths.libraryCreate()} variant="secondary">
					Create a library
				</ButtonOrLink>
			)}
		</div>
	)
}
