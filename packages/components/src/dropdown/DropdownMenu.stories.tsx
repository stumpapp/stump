import { ComponentMeta, ComponentStory } from '@storybook/react'
import { CreditCard, Settings, User } from 'lucide-react'
import { ComponentProps } from 'react'

import { DropdownMenu } from './DropdownMenu'

export default {
	component: DropdownMenu,
	title: 'dropdown/DropdownMenu',
} as ComponentMeta<typeof DropdownMenu>

type StoryProps = Partial<ComponentProps<typeof DropdownMenu>>
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
const Story = ({ align, ...args }: StoryProps) => (
	<DropdownMenu
		label={args.label || defaultArgs.label}
		groups={args.groups || defaultArgs.groups}
		align={align}
	/>
)
const Template: ComponentStory<typeof Story> = (args) => <Story {...args} />

export const Default = Template.bind({})
Default.args = {
	label: 'Dropdown',
}

export const StartAligned = Template.bind({})
StartAligned.args = {
	align: 'start',
	label: 'Dropdown',
}

export const CenterAligned = Template.bind({})
CenterAligned.args = {
	align: 'center',
	label: 'Dropdown',
}
