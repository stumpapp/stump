import { createContext } from 'react';

export const AppPropsContext = createContext<AppProps | null>(null);

export type Platform = 'browser' | 'macOS' | 'windows' | 'linux' | 'unknown';

export interface AppProps {
	platform: Platform;
	baseUrl?: string;
	demoMode?: boolean;
}
