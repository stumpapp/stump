import { Button, DropdownMenu } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Edit, MoreVertical, Trash2 } from 'lucide-react'

type Props = {
	onEdit: () => void
	onDelete?: () => void
}
export default function EmailerActionMenu({ onEdit, onDelete }: Props) {
	const { t } = useLocaleContext()

	return (
		<DropdownMenu
			groups={[
				{
					items: [
						{
							label: t('common.edit'),
							leftIcon: <Edit className={iconStyle} />,
							onClick: onEdit,
						},
						...(onDelete
							? [
									{
										label: t('common.delete'),
										leftIcon: <Trash2 className={iconStyle} />,
										onClick: onDelete,
									},
								]
							: []),
					],
				},
			]}
			trigger={
				<Button size="icon" variant="ghost">
					<MoreVertical className="h-4 w-4" />
				</Button>
			}
			align="end"
			contentWrapperClassName="w-28 min-w-[unset]"
		/>
	)
}

const iconStyle = 'mr-2 h-4 w-4'
