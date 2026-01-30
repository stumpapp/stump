import { ListMinus, ListPlus } from 'lucide-react-native'

import { ActionMenu } from '../ui/action-menu/action-menu'

type Props = {
	onCollapseAll: () => void
	onExpandAll: () => void
}

export default function SmartListActionMenu({ onCollapseAll, onExpandAll }: Props) {
	return (
		<ActionMenu
			groups={[
				{
					items: [
						{
							label: 'Collapse All',
							icon: {
								ios: 'rectangle.stack.badge.minus',
								android: ListMinus,
							},
							onPress: () => onCollapseAll(),
						},
						{
							label: 'Expand All',
							icon: {
								ios: 'rectangle.stack.badge.plus',
								android: ListPlus,
							},
							onPress: () => onExpandAll(),
						},
					],
				},
			]}
		/>
	)
}
