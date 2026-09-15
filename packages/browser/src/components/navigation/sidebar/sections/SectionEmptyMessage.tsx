import { NewCard, Text } from '@stump/components'

type Props = {
	message: string
}

export function SectionEmptyMessage({ message }: Props) {
	return (
		<NewCard className="opacity-50">
			<NewCard.Row className="px-2 py-4 justify-center">
				<Text className="select-none" size="sm">
					{message}
				</Text>
			</NewCard.Row>
		</NewCard>
	)
}
