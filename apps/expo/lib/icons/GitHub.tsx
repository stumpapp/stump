import FontAwesome from '@expo/vector-icons/FontAwesome'

import { Any } from '../utils'
import { iconWithClassName } from './iconWithClassName'

const GitHub = (props: Omit<React.ComponentProps<typeof FontAwesome>, 'name'>) => (
	<FontAwesome name="github" {...props} />
)
iconWithClassName(GitHub as Any)
export { GitHub }
