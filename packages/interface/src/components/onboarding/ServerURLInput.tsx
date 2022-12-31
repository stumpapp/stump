import { InputGroup, InputRightElement } from '@chakra-ui/react'

import { FormControl } from '../../ui/Form'
import Input from '../../ui/Input'

// TODO: type this
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ServerURLInput(props: any) {
	return (
		<FormControl label="Server URL">
			<InputGroup>
				<Input {...props} />
				<InputRightElement />
			</InputGroup>
		</FormControl>
	)
}
