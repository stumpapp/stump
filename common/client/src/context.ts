import { QueryClient } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { JobUpdate } from './types';

export const AppPropsContext = createContext<AppProps | null>(null);
export const StumpQueryContext = createContext<QueryClient | undefined>(undefined);

export type Platform = 'browser' | 'macOS' | 'windows' | 'linux' | 'unknown';

export interface AppProps {
	platform: Platform;
	baseUrl?: string;
	demoMode?: boolean;

	setBaseUrl?: (baseUrl: string) => void;
	setUseDiscordPresence?: (connect: boolean) => void;
	setDiscordPresence?: (status?: string, details?: string) => void;
}

export interface JobContext {
	activeJobs: Record<string, JobUpdate>;

	addJob(job: JobUpdate): void;
	updateJob(job: JobUpdate): void;
	removeJob(runnerId: string): void;
}
export const ActiveJobContext = createContext<JobContext | null>(null);

export const useAppProps = () => useContext(AppPropsContext);
export const useJobContext = () => useContext(ActiveJobContext);
export const useQueryContext = () => useContext(StumpQueryContext);
