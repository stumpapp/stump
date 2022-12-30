import { InputGroup, InputRightElement } from '@chakra-ui/react'

import { FormControl } from '../../ui/Form'
import Input from '../../ui/Input'

export default function ServerURLInput(props: any) {
	return (
		<FormControl label="Server URL">
			<InputGroup>
				<Input {...props} />
				<InputRightElement children={<></>} />
			</InputGroup>
		</FormControl>
	)
}
