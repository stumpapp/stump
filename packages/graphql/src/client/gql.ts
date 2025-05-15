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
    "\n\tquery MediaAtPath($path: String!) {\n\t\tmediaByPath(path: $path) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n": typeof types.MediaAtPathDocument,
    "\n\tmutation UploadLibraryBooks($input: UploadBooksInput!) {\n\t\tuploadBooks(input: $input)\n\t}\n": typeof types.UploadLibraryBooksDocument,
    "\n\tmutation UploadLibrarySeries($input: UploadSeriesInput!) {\n\t\tuploadSeries(input: $input)\n\t}\n": typeof types.UploadLibrarySeriesDocument,
    "\n\tquery SideBarQuery {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SideBarQueryDocument,
    "\n\tquery BookOverviewScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\textension\n\t\t\tresolvedName\n\t\t\thash\n\t\t\tpages\n\t\t\tsize\n\t\t\tstatus\n\t\t\trelativeLibraryPath\n\t\t\tmetadata {\n\t\t\t\tlinks\n\t\t\t\tsummary\n\t\t\t}\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t\treadProgress {\n\t\t\t\tpercentageCompleted\n\t\t\t\tepubcfi\n\t\t\t\tpage\n\t\t\t}\n\t\t\treadHistory {\n\t\t\t\t__typename\n\t\t\t\tcompletedAt\n\t\t\t}\n\t\t}\n\t}\n": typeof types.BookOverviewSceneDocument,
    "\n\tfragment BookOverviewHeader on Media {\n\t\tmetadata {\n\t\t\tcharacters\n\t\t\tcolorists\n\t\t\tcoverArtists\n\t\t\teditors\n\t\t\tinkers\n\t\t\tletterers\n\t\t\tlinks\n\t\t\tpencillers\n\t\t\tteams\n\t\t}\n\t}\n": typeof types.BookOverviewHeaderFragmentDoc,
    "\n\tquery BooksAfterCurrentQuery($id: ID!, $pagination: Pagination) {\n\t\tmediaById(id: $id) {\n\t\t\tnextInSeries(pagination: $pagination) {\n\t\t\t\tnodes {\n\t\t\t\t\tid\n\t\t\t\t\tresolvedName\n\t\t\t\t\tpages\n\t\t\t\t\tsize\n\t\t\t\t\tstatus\n\t\t\t\t\tthumbnail {\n\t\t\t\t\t\turl\n\t\t\t\t\t}\n\t\t\t\t\treadProgress {\n\t\t\t\t\t\tpercentageCompleted\n\t\t\t\t\t\tepubcfi\n\t\t\t\t\t\tpage\n\t\t\t\t\t}\n\t\t\t\t\treadHistory {\n\t\t\t\t\t\t__typename\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\tpageInfo {\n\t\t\t\t\t__typename\n\t\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\t\tcurrentCursor\n\t\t\t\t\t\tnextCursor\n\t\t\t\t\t\tlimit\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.BooksAfterCurrentQueryDocument,
    "\n\tquery BookReaderScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tpages\n\t\t\textension\n\t\t\treadProgress {\n\t\t\t\tpercentageCompleted\n\t\t\t\tepubcfi\n\t\t\t\tpage\n\t\t\t}\n\t\t\tlibraryConfig {\n\t\t\t\tdefaultReadingImageScaleFit\n\t\t\t\tdefaultReadingMode\n\t\t\t\tdefaultReadingDir\n\t\t\t}\n\t\t}\n\t}\n": typeof types.BookReaderSceneDocument,
    "\n\tmutation UpdateReadProgress($id: ID!, $page: Int!) {\n\t\tupdateMediaProgress(id: $id, page: $page) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.UpdateReadProgressDocument,
    "\n\tquery ContinueReadingMediaQuery($pagination: Pagination!) {\n\t\tkeepReading(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.ContinueReadingMediaQueryDocument,
    "\n\tquery HomeSceneQuery {\n\t\tnumberOfLibraries\n\t}\n": typeof types.HomeSceneQueryDocument,
    "\n\tquery RecentlyAddedMediaQuery($pagination: Pagination!) {\n\t\trecentlyAddedMedia(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.RecentlyAddedMediaQueryDocument,
    "\n\tquery RecentlyAddedSeriesQuery($pagination: Pagination!) {\n\t\trecentlyAddedSeries(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.RecentlyAddedSeriesQueryDocument,
    "\n\tquery SeriesLayout($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tpath\n\t\t\tlibrary {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t\tresolvedName\n\t\t\tresolvedDescription\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SeriesLayoutDocument,
    "\n\tquery SeriesBooksScene($filter: MediaFilterInput!, $pagination: Pagination!) {\n\t\tmedia(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SeriesBooksSceneDocument,
    "\n\tquery DirectoryListing($input: DirectoryListingInput!, $pagination: Pagination!) {\n\t\tlistDirectory(input: $input, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tparent\n\t\t\t\tfiles {\n\t\t\t\t\tname\n\t\t\t\t\tpath\n\t\t\t\t\tisDirectory\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.DirectoryListingDocument,
    "\n\tquery UploadConfig {\n\t\tuploadConfig {\n\t\t\tenabled\n\t\t\tmaxFileUploadSize\n\t\t}\n\t}\n": typeof types.UploadConfigDocument,
};
const documents: Documents = {
    "\n\tquery MediaAtPath($path: String!) {\n\t\tmediaByPath(path: $path) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n": types.MediaAtPathDocument,
    "\n\tmutation UploadLibraryBooks($input: UploadBooksInput!) {\n\t\tuploadBooks(input: $input)\n\t}\n": types.UploadLibraryBooksDocument,
    "\n\tmutation UploadLibrarySeries($input: UploadSeriesInput!) {\n\t\tuploadSeries(input: $input)\n\t}\n": types.UploadLibrarySeriesDocument,
    "\n\tquery SideBarQuery {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.SideBarQueryDocument,
    "\n\tquery BookOverviewScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\textension\n\t\t\tresolvedName\n\t\t\thash\n\t\t\tpages\n\t\t\tsize\n\t\t\tstatus\n\t\t\trelativeLibraryPath\n\t\t\tmetadata {\n\t\t\t\tlinks\n\t\t\t\tsummary\n\t\t\t}\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t\treadProgress {\n\t\t\t\tpercentageCompleted\n\t\t\t\tepubcfi\n\t\t\t\tpage\n\t\t\t}\n\t\t\treadHistory {\n\t\t\t\t__typename\n\t\t\t\tcompletedAt\n\t\t\t}\n\t\t}\n\t}\n": types.BookOverviewSceneDocument,
    "\n\tfragment BookOverviewHeader on Media {\n\t\tmetadata {\n\t\t\tcharacters\n\t\t\tcolorists\n\t\t\tcoverArtists\n\t\t\teditors\n\t\t\tinkers\n\t\t\tletterers\n\t\t\tlinks\n\t\t\tpencillers\n\t\t\tteams\n\t\t}\n\t}\n": types.BookOverviewHeaderFragmentDoc,
    "\n\tquery BooksAfterCurrentQuery($id: ID!, $pagination: Pagination) {\n\t\tmediaById(id: $id) {\n\t\t\tnextInSeries(pagination: $pagination) {\n\t\t\t\tnodes {\n\t\t\t\t\tid\n\t\t\t\t\tresolvedName\n\t\t\t\t\tpages\n\t\t\t\t\tsize\n\t\t\t\t\tstatus\n\t\t\t\t\tthumbnail {\n\t\t\t\t\t\turl\n\t\t\t\t\t}\n\t\t\t\t\treadProgress {\n\t\t\t\t\t\tpercentageCompleted\n\t\t\t\t\t\tepubcfi\n\t\t\t\t\t\tpage\n\t\t\t\t\t}\n\t\t\t\t\treadHistory {\n\t\t\t\t\t\t__typename\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\tpageInfo {\n\t\t\t\t\t__typename\n\t\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\t\tcurrentCursor\n\t\t\t\t\t\tnextCursor\n\t\t\t\t\t\tlimit\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.BooksAfterCurrentQueryDocument,
    "\n\tquery BookReaderScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tpages\n\t\t\textension\n\t\t\treadProgress {\n\t\t\t\tpercentageCompleted\n\t\t\t\tepubcfi\n\t\t\t\tpage\n\t\t\t}\n\t\t\tlibraryConfig {\n\t\t\t\tdefaultReadingImageScaleFit\n\t\t\t\tdefaultReadingMode\n\t\t\t\tdefaultReadingDir\n\t\t\t}\n\t\t}\n\t}\n": types.BookReaderSceneDocument,
    "\n\tmutation UpdateReadProgress($id: ID!, $page: Int!) {\n\t\tupdateMediaProgress(id: $id, page: $page) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.UpdateReadProgressDocument,
    "\n\tquery ContinueReadingMediaQuery($pagination: Pagination!) {\n\t\tkeepReading(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.ContinueReadingMediaQueryDocument,
    "\n\tquery HomeSceneQuery {\n\t\tnumberOfLibraries\n\t}\n": types.HomeSceneQueryDocument,
    "\n\tquery RecentlyAddedMediaQuery($pagination: Pagination!) {\n\t\trecentlyAddedMedia(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.RecentlyAddedMediaQueryDocument,
    "\n\tquery RecentlyAddedSeriesQuery($pagination: Pagination!) {\n\t\trecentlyAddedSeries(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.RecentlyAddedSeriesQueryDocument,
    "\n\tquery SeriesLayout($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tpath\n\t\t\tlibrary {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t\tresolvedName\n\t\t\tresolvedDescription\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": types.SeriesLayoutDocument,
    "\n\tquery SeriesBooksScene($filter: MediaFilterInput!, $pagination: Pagination!) {\n\t\tmedia(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.SeriesBooksSceneDocument,
    "\n\tquery DirectoryListing($input: DirectoryListingInput!, $pagination: Pagination!) {\n\t\tlistDirectory(input: $input, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tparent\n\t\t\t\tfiles {\n\t\t\t\t\tname\n\t\t\t\t\tpath\n\t\t\t\t\tisDirectory\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.DirectoryListingDocument,
    "\n\tquery UploadConfig {\n\t\tuploadConfig {\n\t\t\tenabled\n\t\t\tmaxFileUploadSize\n\t\t}\n\t}\n": types.UploadConfigDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery MediaAtPath($path: String!) {\n\t\tmediaByPath(path: $path) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').MediaAtPathDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation UploadLibraryBooks($input: UploadBooksInput!) {\n\t\tuploadBooks(input: $input)\n\t}\n"): typeof import('./graphql').UploadLibraryBooksDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation UploadLibrarySeries($input: UploadSeriesInput!) {\n\t\tuploadSeries(input: $input)\n\t}\n"): typeof import('./graphql').UploadLibrarySeriesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SideBarQuery {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').SideBarQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery BookOverviewScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\textension\n\t\t\tresolvedName\n\t\t\thash\n\t\t\tpages\n\t\t\tsize\n\t\t\tstatus\n\t\t\trelativeLibraryPath\n\t\t\tmetadata {\n\t\t\t\tlinks\n\t\t\t\tsummary\n\t\t\t}\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t\treadProgress {\n\t\t\t\tpercentageCompleted\n\t\t\t\tepubcfi\n\t\t\t\tpage\n\t\t\t}\n\t\t\treadHistory {\n\t\t\t\t__typename\n\t\t\t\tcompletedAt\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').BookOverviewSceneDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tfragment BookOverviewHeader on Media {\n\t\tmetadata {\n\t\t\tcharacters\n\t\t\tcolorists\n\t\t\tcoverArtists\n\t\t\teditors\n\t\t\tinkers\n\t\t\tletterers\n\t\t\tlinks\n\t\t\tpencillers\n\t\t\tteams\n\t\t}\n\t}\n"): typeof import('./graphql').BookOverviewHeaderFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery BooksAfterCurrentQuery($id: ID!, $pagination: Pagination) {\n\t\tmediaById(id: $id) {\n\t\t\tnextInSeries(pagination: $pagination) {\n\t\t\t\tnodes {\n\t\t\t\t\tid\n\t\t\t\t\tresolvedName\n\t\t\t\t\tpages\n\t\t\t\t\tsize\n\t\t\t\t\tstatus\n\t\t\t\t\tthumbnail {\n\t\t\t\t\t\turl\n\t\t\t\t\t}\n\t\t\t\t\treadProgress {\n\t\t\t\t\t\tpercentageCompleted\n\t\t\t\t\t\tepubcfi\n\t\t\t\t\t\tpage\n\t\t\t\t\t}\n\t\t\t\t\treadHistory {\n\t\t\t\t\t\t__typename\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\tpageInfo {\n\t\t\t\t\t__typename\n\t\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\t\tcurrentCursor\n\t\t\t\t\t\tnextCursor\n\t\t\t\t\t\tlimit\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').BooksAfterCurrentQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery BookReaderScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tpages\n\t\t\textension\n\t\t\treadProgress {\n\t\t\t\tpercentageCompleted\n\t\t\t\tepubcfi\n\t\t\t\tpage\n\t\t\t}\n\t\t\tlibraryConfig {\n\t\t\t\tdefaultReadingImageScaleFit\n\t\t\t\tdefaultReadingMode\n\t\t\t\tdefaultReadingDir\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').BookReaderSceneDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation UpdateReadProgress($id: ID!, $page: Int!) {\n\t\tupdateMediaProgress(id: $id, page: $page) {\n\t\t\t__typename\n\t\t}\n\t}\n"): typeof import('./graphql').UpdateReadProgressDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery ContinueReadingMediaQuery($pagination: Pagination!) {\n\t\tkeepReading(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').ContinueReadingMediaQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery HomeSceneQuery {\n\t\tnumberOfLibraries\n\t}\n"): typeof import('./graphql').HomeSceneQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery RecentlyAddedMediaQuery($pagination: Pagination!) {\n\t\trecentlyAddedMedia(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').RecentlyAddedMediaQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery RecentlyAddedSeriesQuery($pagination: Pagination!) {\n\t\trecentlyAddedSeries(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').RecentlyAddedSeriesQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SeriesLayout($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tpath\n\t\t\tlibrary {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t\tresolvedName\n\t\t\tresolvedDescription\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').SeriesLayoutDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SeriesBooksScene($filter: MediaFilterInput!, $pagination: Pagination!) {\n\t\tmedia(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').SeriesBooksSceneDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery DirectoryListing($input: DirectoryListingInput!, $pagination: Pagination!) {\n\t\tlistDirectory(input: $input, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tparent\n\t\t\t\tfiles {\n\t\t\t\t\tname\n\t\t\t\t\tpath\n\t\t\t\t\tisDirectory\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').DirectoryListingDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery UploadConfig {\n\t\tuploadConfig {\n\t\t\tenabled\n\t\t\tmaxFileUploadSize\n\t\t}\n\t}\n"): typeof import('./graphql').UploadConfigDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
