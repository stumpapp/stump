import createStore, { Provider } from './mainStore';
import createQueryStore, { QueryStoreProvider } from './queryStore';

interface Props {
	children: React.ReactNode;
}

export default function MainStoreProvider({ children }: Props) {
	return (
		<Provider createStore={createStore}>
			<QueryStoreProvider createStore={createQueryStore}>{children}</QueryStoreProvider>
		</Provider>
	);
}
