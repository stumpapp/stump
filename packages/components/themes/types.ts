/**
 * This file defines the TypeScript types which make up the color tokens for the Stump UI. They are
 * inspired by Shopify's Polaris design system: https://polaris.shopify.com/tokens/color
 */

/**
 * A shorthand type for a color token which has a default variant
 */
type DefaultVariant = {
	DEFAULT: string
}

/**
 * A shorthand type for a color token which has a disabled variant
 */
type DisabledVariant = {
	disabled: string
}

/**
 * A shorthand type for a color token which has a hover variant
 */
type HoverVariant = {
	hover: string
}

/**
 * A shorthand type for a color token which has a secondary variant. All secondary variants should
 * also have a default variant
 */
type SecondaryVariant = {
	secondary: string
} & DefaultVariant

const colorVariant = ['info', 'success', 'warning', 'danger', 'brand'] as const

type Border = Record<(typeof colorVariant)[number], string> & {
	subtle: string
	strong: string
} & DefaultVariant

type Surface = SecondaryVariant & HoverVariant

/**
 * A type for enforcing the structure of a color used as primary background for either the root
 * or specific, large sections of the UI
 */
type Background = {
	/**
	 * The color of an element that is z-indexed above the base background on the 'surface' layer,
	 * such as a card or a non-overlay element
	 */
	surface: Surface
	/**
	 * The color of an overlay when hovering over an element with a background color, such as
	 * a menu or a modal
	 */
	overlay: HoverVariant & DefaultVariant
	/**
	 * The invserse color of the base background value
	 */
	inverse: string
} & DefaultVariant

/**
 * A type for enforcing the structure of a color used as primary foreground for elements like
 * text or icons
 */
type Foreground = {
	// TODO: rename, kind of confusing alongside muted
	/**
	 * The color of foreground elements on the 'surface' layer which are emphasized but not
	 * muted
	 */
	subtle: string
	/**
	 * The color of foreground elements on the 'surface' layer which are just a bit less
	 * muted than disabled elements
	 */
	muted: string
	/**
	 * The color of foreground elements on the 'surface' layer when placed on top
	 * of an inverse background color
	 */
	'on-inverse': string
} & DefaultVariant &
	DisabledVariant

/**
 * A type for enforcing the fill color of a specific element, such as a button, and loosely
 * follows the standard color variants of 'info', 'success', 'warning', 'danger', and 'brand'
 */
type Color = Record<(typeof colorVariant)[number], SecondaryVariant> & DisabledVariant

/**
 * The primary type which represents the color tokens for the Stump UI. These are translated for use as
 * tailwind classes via tw-colors
 */
export type StumpTheme = {
	background: Background
	sidebar: Background
	foreground: Foreground
	edge: Border
	fill: Color
}
