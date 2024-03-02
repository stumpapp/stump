import { RegisteredEmailDevice } from '@stump/types'
import React from 'react'

type Props = {
	isOpen: boolean
	updatingDevice: RegisteredEmailDevice | null
	onClose: () => void
}

export default function CreateOrUpdateDeviceModal({ isOpen, updatingDevice, onClose }: Props) {
	return <></>
}
