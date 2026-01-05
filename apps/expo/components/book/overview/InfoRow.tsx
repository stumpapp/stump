import { CardRow, Text } from '~/components/ui'

type Props = {
	label: string
	value: string
	longValue?: boolean
	numberOfLines?: number
	className?: string
}

export default function InfoRow({ label, value, longValue, numberOfLines }: Props) {
	return (
		<CardRow label={label}>
			<Text
				className="flex-1 text-right text-lg text-foreground-muted"
				numberOfLines={(numberOfLines ?? longValue) ? 4 : undefined}
			>
				{value}
			</Text>
		</CardRow>
	)
}
