import { DropdownMenu, IconButton } from '@stump/components'
import { Edit, MoreVertical, Trash2 } from 'lucide-react'
import React from 'react'

type Props = {
	onEdit: () => void
	onDelete: () => void
}
export default function DeviceActionMenu({ onEdit, onDelete }: Props) {
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
						{
							label: 'Delete',
							leftIcon: <Trash2 className={iconStyle} />,
							onClick: onDelete,
						},
					],
				},
			]}
			trigger={
				<IconButton size="xs" variant="ghost">
					<MoreVertical className="h-4 w-4" />
				</IconButton>
			}
			align="end"
			contentWrapperClassName="w-28 min-w-[unset]"
		/>
	)
}

const iconStyle = 'mr-2 h-4 w-4'
