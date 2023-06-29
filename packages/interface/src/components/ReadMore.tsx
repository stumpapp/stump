import { Text, useBoolean } from '@stump/components'
import { ComponentProps } from 'react'

import { DEBUG_ENV } from '../index'

interface Props extends Omit<ComponentProps<typeof Text>, 'children'> {
	text?: string | null
}

// TODO: import {Collapsible} from '@stump/components' and use that instead of this.
// TODO: markdown rendering... will probably fix below FIXME, as well.
// FIXME: does not render new lines properly, this is pretty basic and needs changing.
export default function ReadMore({ text, ...props }: Props) {
	const [showingAll, { toggle }] = useBoolean(false)

	const resolvedText = text ? text : DEBUG_ENV ? DEBUG_FAKE_TEXT : ''
	const canReadMore = resolvedText.length > 250

	if (!resolvedText && !DEBUG_ENV) {
		return null
	}

	if (!canReadMore) {
		return <Text {...props}>{resolvedText}</Text>
	}

	return (
		<Text {...props}>
			{showingAll ? resolvedText : resolvedText.slice(0, 250)}
			<span onClick={toggle} className="cursor-pointer font-semibold">
				{showingAll ? ' Read less' : '... Read more'}
			</span>
		</Text>
	)
}

const DEBUG_FAKE_TEXT =
	'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed varius semper dolor, eget egestas velit porta ut. \
	Integer blandit lectus nisi, a suscipit eros malesuada eu. Praesent vel sodales ipsum, ut porttitor erat. Aliquam faucibus erat a ante \
	consectetur imperdiet. Curabitur in est ac nisi feugiat facilisis a in nisi. Ut auctor rutrum nibh a tincidunt. Proin non hendrerit risus, \
	sagittis malesuada odio. Phasellus condimentum hendrerit libero nec ultrices.\
	Praesent lacinia, magna vel sodales tempus, tellus metus ultricies odio, non porttitor lectus tortor ac ante. \
	Nullam malesuada nec massa eget facilisis. Aenean in nisi lacus. Etiam et tortor vel lacus maximus imperdiet. Fusce \
	scelerisque dapibus fermentum. Nunc non mauris rhoncus neque tincidunt convallis id et nisl. Donec lobortis at lectus quis venenatis. \
	Ut lacus urna, accumsan sed nisl eget, auctor auctor massa. Duis scelerisque aliquam scelerisque. In hac habitasse platea dictumst. Suspendisse \
	consequat nisi nec enim finibus, sit amet gravida sem ultrices. Vestibulum feugiat erat et tincidunt pellentesque. Sed interdum mi ac quam convallis lobortis.'
