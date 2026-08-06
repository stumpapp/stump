import { Button, cx } from '@stump/components'
import { OrderDirection } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { SortAsc } from 'lucide-react'

type Props = {
	value?: OrderDirection
	onChange: (value: OrderDirection) => void
}
export default function OrderByDirection({ value, onChange }: Props) {
	const { t } = useLocaleContext()

	return (
		<Button
			variant="ghost"
			className="justify-start"
			onClick={() =>
				onChange(value === OrderDirection.Desc ? OrderDirection.Asc : OrderDirection.Desc)
			}
		>
			<SortAsc
				className={cx('mr-1.5 h-4 w-4 text-muted-foreground transition-all', {
					'rotate-180': value === OrderDirection.Desc,
				})}
			/>
			{value === OrderDirection.Desc ? t('common.descending') : t('common.ascending')}
		</Button>
	)
}
