import { Meta, StoryObj } from '@storybook/react'

import { CheckBox } from './CheckBox'

const StoryMeta: Meta<typeof CheckBox> = {
	component: CheckBox,
	title: 'input/CheckBox',
}

export const Default: StoryObj<typeof CheckBox> = {
	render: () => <CheckBox id="my-label" label="My Label" />,
}

export const Primary: StoryObj<typeof CheckBox> = {
	render: () => <CheckBox id="my-label" label="My Label" variant="primary" />,
}

export const Description: StoryObj<typeof CheckBox> = {
	render: () => <CheckBox description="This is a description" id="my-label" label="My Label" />,
}

export default StoryMeta
