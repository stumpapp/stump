import { Button, DropdownMenu } from '@stump/components'
import { Edit, MoreVertical, Trash2 } from 'lucide-react'

type Props = {
	onEdit: () => void
	onDelete?: () => void
}
export default function EmailerActionMenu({ onEdit, onDelete }: Props) {
	return (
		<DropdownMenu
			groups={[
				{
					items: [
						{
							label: 'Edit',
							leftIcon: <Edit className={iconStyle} />,
							onClick: onEdit,
						},
						...(onDelete
							? [
									{
										label: 'Delete',
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
