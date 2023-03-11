import { ComponentMeta, ComponentStory } from '@storybook/react'

import { Button } from './Button'

export default {
	args: {
		children: 'Button',
	},
	component: Button,
	title: 'button/Button',
} as ComponentMeta<typeof Button>

const Template: ComponentStory<typeof Button> = (args) => <Button {...args} />

// GHOST
export const XSmallGhost = Template.bind({})
XSmallGhost.args = {
	size: 'xs',
	variant: 'ghost',
}

export const SmallGhost = Template.bind({})
SmallGhost.args = {
	size: 'sm',
	variant: 'ghost',
}

export const MediumGhost = Template.bind({})
MediumGhost.args = {
	size: 'md',
	variant: 'ghost',
}

export const LargeGhost = Template.bind({})
LargeGhost.args = {
	size: 'lg',
	variant: 'ghost',
}

// PRIMARY
export const XSmallPrimary = Template.bind({})
XSmallPrimary.args = {
	size: 'xs',
	variant: 'primary',
}

export const SmallPrimary = Template.bind({})
SmallPrimary.args = {
	size: 'sm',
	variant: 'primary',
}

export const MediumPrimary = Template.bind({})
MediumPrimary.args = {
	size: 'md',
	variant: 'primary',
}

export const LargePrimary = Template.bind({})
LargePrimary.args = {
	size: 'lg',
	variant: 'primary',
}
