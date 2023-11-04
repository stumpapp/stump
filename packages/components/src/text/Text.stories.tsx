import { Meta, StoryObj } from '@storybook/react'

import { Text } from './Text'

const StoryMeta: Meta<typeof Text> = {
	component: Text,
	title: 'input/Text',
}

export const Default: StoryObj<typeof Text> = {
	render: () => <Text>My Text</Text>,
}

export default StoryMeta
