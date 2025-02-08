import { OPDSProgression, OPDSPublication } from '@stump/sdk'
import { createContext, useContext } from 'react'

export type IPublicationContext = {
	url: string
	publication: OPDSPublication
	progression?: OPDSProgression
}

export const PublicationContext = createContext<IPublicationContext | undefined>(undefined)

export const usePublicationContext = () => {
	const context = useContext(PublicationContext)
	if (!context) {
		throw new Error('usePublicationContext must be used within a PublicationContext')
	}
	return context
}
