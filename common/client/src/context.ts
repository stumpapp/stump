import { QueryClient } from '@tanstack/react-query';
import { createContext, useContext } from 'react';

export const AppPropsContext = createContext<AppProps | null>(null);

export const StumpQueryContext = createContext<QueryClient | undefined>(undefined);

export type Platform = 'browser' | 'macOS' | 'windows' | 'linux' | 'unknown';

export interface AppProps {
	platform: Platform;
	baseUrl?: string;
	demoMode?: boolean;
}

export const useAppContext = () => useContext(AppPropsContext);
export const useQueryContext = () => useContext(StumpQueryContext);
