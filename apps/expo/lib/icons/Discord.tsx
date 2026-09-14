import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6'

import { Any } from '../utils'
import { iconWithClassName } from './iconWithClassName'

const Discord = (props: Omit<React.ComponentProps<typeof FontAwesome6>, 'name'>) => (
	<FontAwesome6 name="discord" {...props} color={'white'} iconStyle="brand" />
)
iconWithClassName(Discord as Any)
export { Discord }
