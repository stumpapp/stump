import { createContext, useContext } from 'react'

import { ThumbnailPlaceholderData } from '~/components/image'
import { useColors } from '~/lib/constants'

export type ImageMetadata = ThumbnailPlaceholderData

export type IDerivedColorPalette = {
	imageMetadata?: ImageMetadata | null
}

export const DerivedColorPalette = createContext(undefined as IDerivedColorPalette | undefined)

type Props = {
	imageMetadata?: ImageMetadata | null
	children: React.ReactNode
}

export function DerivedColorPaletteProvider({ imageMetadata, children }: Props) {
	// TODO: impl logic which derives a color palette
	return (
		<DerivedColorPalette.Provider
			value={{
				imageMetadata,
			}}
		>
			{children}
		</DerivedColorPalette.Provider>
	)
}

export function useDerivedColorPalette() {
	const context = useContext(DerivedColorPalette)
	const colors = useColors()

	const isImageMetadataEmpty =
		!context?.imageMetadata ||
		(!context.imageMetadata.averageColor && !context.imageMetadata.colors?.length)

	if (!context || isImageMetadataEmpty) return { colors, imageMetadata: undefined }
	// TODO: curate colors from image meta
	return { colors, imageMetadata: context.imageMetadata }
}
