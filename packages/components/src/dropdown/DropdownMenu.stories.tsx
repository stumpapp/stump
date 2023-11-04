import { Meta, StoryObj } from '@storybook/react'
import { CreditCard, Settings, User } from 'lucide-react'
import { ComponentProps } from 'react'

import { DropdownMenu } from './DropdownMenu'

const StoryMeta: Meta<typeof DropdownMenu> = {
	component: DropdownMenu,
	title: 'dropdown/DropdownMenu',
}
type Story = StoryObj<typeof DropdownMenu>

const defaultArgs: ComponentProps<typeof DropdownMenu> = {
	groups: [
		{
			items: [
				{
					label: 'Profile',
					leftIcon: <User className="mr-2 h-4 w-4" />,
					shortCut: '⇧⌘P',
				},
				{
					label: 'Billing',
					leftIcon: <CreditCard className="mr-2 h-4 w-4" />,
					shortCut: '⌘B',
				},
				{
					label: 'Settings',
					leftIcon: <Settings className="mr-2 h-4 w-4" />,
					shortCut: '⌘S',
				},
			],
			title: 'My Account',
		},
		{
			items: [
				{
					label: 'Nested Menu',
					subItems: [
						{
							label: 'Doubly Nested',
							subItems: [
								{
									label: 'Bingo Bango Bongo',
								},
							],
						},
					],
				},
				{
					label: 'Something something',
				},
				{
					label: 'Vicky',
				},
				{
					href: '#',
					label: 'Something something',
				},
			],
		},
	],
	label: 'DropdownMenu',
}

type DemoProps = Partial<ComponentProps<typeof DropdownMenu>>
const Demo = ({ align, ...args }: DemoProps) => (
	<DropdownMenu
		label={args.label || defaultArgs.label}
		groups={args.groups || defaultArgs.groups}
		align={align}
	/>
)

export const Default: Story = {
	render: () => <Demo />,
}

export const StartAligned: Story = {
	render: () => <Demo align="start" />,
}

export const CenterAligned: Story = {
	render: () => <Demo align="center" />,
}

export default StoryMeta
