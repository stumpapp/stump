import { Button, DropdownMenu } from '@stump/components'
import { MoreVertical, Trash } from 'lucide-react'

type Props = {
	onSelectForRemoval: () => void
}

export default function MemberActionMenu({ onSelectForRemoval }: Props) {
	return (
		<div className="flex flex-1 justify-end pr-2">
			<DropdownMenu
				groups={[
					{
						items: [
							{
								label: 'Remove',
								leftIcon: <Trash className="mr-2 h-4 w-4" />,
								onClick: onSelectForRemoval,
							},
						],
					},
				]}
				trigger={
					<Button size="icon" variant="ghost" className="shrink-0">
						<MoreVertical className="h-4 w-4" />
					</Button>
				}
				align="end"
			/>
		</div>
	)
}
