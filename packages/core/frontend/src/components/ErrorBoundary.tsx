import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

// TODO: make pretty
function ErrorFallback({ error }: FallbackProps) {
	return (
		<div>
			<h3>{error.message}</h3>

			<pre>{error.stack}</pre>
		</div>
	);
}

interface Props {
	children: React.ReactNode;
}

export default function ({ children }: Props) {
	return <ErrorBoundary FallbackComponent={ErrorFallback}>{children}</ErrorBoundary>;
}
