import { OPDSProgression, OPDSPublication } from '@stump/sdk'
import { QueryObserverResult } from '@tanstack/react-query'
import { createContext, useContext } from 'react'

export type IPublicationContext = {
	url: string
	publication: OPDSPublication
	progression?: OPDSProgression
	progressionURL?: string
	refetchProgression: () => Promise<QueryObserverResult<OPDSProgression, unknown>>
}

export const PublicationContext = createContext<IPublicationContext | undefined>(undefined)

export const usePublicationContext = () => {
	const context = useContext(PublicationContext)
	if (!context) {
		throw new Error('usePublicationContext must be used within a PublicationContext')
	}
	return context
}
