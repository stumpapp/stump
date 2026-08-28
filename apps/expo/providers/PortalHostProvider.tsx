import { PortalHost } from '@rn-primitives/portal'
import { createContext, useContext, useRef, useState } from 'react'
import { View } from 'react-native'

type PortalHostContextValue = {
	name: string
	sideOffset?: number
}

/**
 * context to provide a shared portal host id for special scenarios where using the
 * root-level portal host causes issues (e.g., TrueSheet on Android).
 */
export const PortalHostContext = createContext<PortalHostContextValue | undefined>(undefined)

type PortalHostProviderProps = {
	name?: string
	children: React.ReactNode
}

/**
 * a provider that, when provided a name, will render a portal host and inject the name and measured sideOffset
 * into the context. this is primarily used on android to get positioning of things like dropdowns correct when
 * inside a sheet
 */
export function PortalHostProvider({ name, children }: PortalHostProviderProps) {
	const portalRef = useRef<View>(null)

	const [sideOffset, setSideOffset] = useState(0)
	const onPortalLayout = () => {
		portalRef.current?.measure((_x, _y, _w, _h, _px, pageY) => setSideOffset(-pageY))
	}
	// https://github.com/roninoss/rn-primitives/blob/128a788/packages/portal/src/portal.tsx#L82
	// ^ yoinked bc deprecated but the "solution" is to use FullWindowOverlay which is strictly
	// an ios component and fragments for android. fragments do not have layout events, thus
	// no measuring, thus no ability to get offset needed. gotta say this was a v unfun one
	// to sort out

	if (!name) return children

	return (
		<PortalHostContext.Provider value={{ name, sideOffset }}>
			{children}

			<View ref={portalRef} onLayout={onPortalLayout} style={{ flex: 1 }}>
				<PortalHost name={name} />
			</View>
		</PortalHostContext.Provider>
	)
}

export function usePortalHost() {
	return useContext(PortalHostContext)
}
