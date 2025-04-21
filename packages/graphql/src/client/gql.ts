/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n\tfragment BookCardFragment on Media {\n\t\tid\n\t}\n": typeof types.BookCardFragmentFragmentDoc,
    "\n\tquery SideBarQuery {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SideBarQueryDocument,
    "\n\tquery ContinueReadingMediaQuery($pagination: Pagination!) {\n\t\tmedia(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.ContinueReadingMediaQueryDocument,
};
const documents: Documents = {
    "\n\tfragment BookCardFragment on Media {\n\t\tid\n\t}\n": types.BookCardFragmentFragmentDoc,
    "\n\tquery SideBarQuery {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.SideBarQueryDocument,
    "\n\tquery ContinueReadingMediaQuery($pagination: Pagination!) {\n\t\tmedia(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.ContinueReadingMediaQueryDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tfragment BookCardFragment on Media {\n\t\tid\n\t}\n"): typeof import('./graphql').BookCardFragmentFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SideBarQuery {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').SideBarQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery ContinueReadingMediaQuery($pagination: Pagination!) {\n\t\tmedia(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').ContinueReadingMediaQueryDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
