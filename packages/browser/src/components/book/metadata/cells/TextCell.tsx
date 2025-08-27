import { Text } from '@stump/components'

type Props = {
	value?: string | null
}

export default function TextCell({ value }: Props) {
	return <Text>{value}</Text>
}
