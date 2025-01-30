import FontAwesome from '@expo/vector-icons/MaterialIcons'

import { iconWithClassName } from './iconWithClassName'

const Discord = (props: Omit<React.ComponentProps<typeof FontAwesome>, 'name'>) => (
	<FontAwesome name="discord" {...props} />
)
iconWithClassName(Discord as any)
export { Discord }
