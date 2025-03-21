import { registerWebModule, NativeModule } from 'expo'

import { ChangeEventPayload } from './Readium.types'

type ReadiumModuleEvents = {
	onChange: (params: ChangeEventPayload) => void
}

class ReadiumModule extends NativeModule<ReadiumModuleEvents> {
	PI = Math.PI
	async setValueAsync(value: string): Promise<void> {
		this.emit('onChange', { value })
	}
	hello() {
		return 'Hello world! 👋'
	}
}

export default registerWebModule(ReadiumModule)
