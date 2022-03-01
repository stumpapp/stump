import { ErrorBoundary, ErrorBoundaryProps, FallbackProps } from 'react-error-boundary';

function ErrorFallback({ error }: FallbackProps) {
	return <div></div>;
}

interface Props {
	children: React.ReactNode;
}

export default function ({ children }: Props) {
	return <ErrorBoundary FallbackComponent={ErrorFallback}>{children}</ErrorBoundary>;
}
