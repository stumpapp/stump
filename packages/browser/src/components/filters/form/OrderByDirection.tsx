import { Button, cx } from '@stump/components'
import { OrderDirection } from '@stump/graphql'
import { SortAsc } from 'lucide-react'

type Props = {
	value?: OrderDirection
	onChange: (value: OrderDirection) => void
}
export default function OrderByDirection({ value, onChange }: Props) {
	return (
		<Button
			variant="ghost"
			className="justify-start"
			onClick={() =>
				onChange(value === OrderDirection.Desc ? OrderDirection.Asc : OrderDirection.Desc)
			}
		>
			<SortAsc
				className={cx('mr-1.5 h-4 w-4 text-foreground-muted transition-all', {
					'rotate-180': value === OrderDirection.Desc,
				})}
			/>
			{value === OrderDirection.Desc ? 'Descending' : 'Ascending'}
		</Button>
	)
}
