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
    "\n\tquery TagSelectQuery {\n\t\ttags {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": typeof types.TagSelectQueryDocument,
    "\n\tfragment BookCard on Media {\n\t\tid\n\t\tresolvedName\n\t\textension\n\t\tpages\n\t\tsize\n\t\tstatus\n\t\tthumbnail {\n\t\t\turl\n\t\t}\n\t\treadProgress {\n\t\t\tpercentageCompleted\n\t\t\tepubcfi\n\t\t\tpage\n\t\t}\n\t\treadHistory {\n\t\t\t__typename\n\t\t\tcompletedAt\n\t\t}\n\t}\n": typeof types.BookCardFragmentDoc,
    "\n\tquery MediaAtPath($path: String!) {\n\t\tmediaByPath(path: $path) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n": typeof types.MediaAtPathDocument,
    "\n\tmutation UploadLibraryBooks($input: UploadBooksInput!) {\n\t\tuploadBooks(input: $input)\n\t}\n": typeof types.UploadLibraryBooksDocument,
    "\n\tmutation UploadLibrarySeries($input: UploadSeriesInput!) {\n\t\tuploadSeries(input: $input)\n\t}\n": typeof types.UploadLibrarySeriesDocument,
    "\n\tquery MediaFilterForm($seriesId: ID) {\n\t\tmediaMetadataOverview(seriesId: $seriesId) {\n\t\t\tgenres\n\t\t\twriters\n\t\t\tpencillers\n\t\t\tcolorists\n\t\t\tletterers\n\t\t\tinkers\n\t\t\tpublishers\n\t\t\teditors\n\t\t\tcharacters\n\t\t}\n\t}\n": typeof types.MediaFilterFormDocument,
    "\n\tmutation DeleteLibrary($id: ID!) {\n\t\tdeleteLibrary(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.DeleteLibraryDocument,
    "\n\tquery LastVisitedLibrary {\n\t\tlastVisitedLibrary {\n\t\t\tid\n\t\t\tname\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LastVisitedLibraryDocument,
    "\n\tquery SideBarQuery {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t\t... on SystemArrangmentConfig {\n\t\t\t\t\t\t\t\tvariant\n\t\t\t\t\t\t\t\tlinks\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t\tvisible\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SideBarQueryDocument,
    "\n\tmutation UpdateLibraryEmoji($id: ID!, $emoji: String) {\n\t\tupdateLibraryEmoji(id: $id, emoji: $emoji) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.UpdateLibraryEmojiDocument,
    "\n\tmutation ScanLibraryMutation($id: ID!) {\n\t\tscanLibrary(id: $id)\n\t}\n": typeof types.ScanLibraryMutationDocument,
    "\n\tquery LibrarySideBarSection {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\temoji\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LibrarySideBarSectionDocument,
    "\n\tquery TopNavigation {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t\t... on SystemArrangmentConfig {\n\t\t\t\t\t\t\t\tvariant\n\t\t\t\t\t\t\t\tlinks\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t\tvisible\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.TopNavigationDocument,
    "\n\tquery LibraryNavigationItem {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\temoji\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LibraryNavigationItemDocument,
    "\n\tquery EpubJsReader($id: ID!) {\n\t\tepubById(id: $id) {\n\t\t\tmediaId\n\t\t\trootBase\n\t\t\trootFile\n\t\t\textraCss\n\t\t\ttoc\n\t\t\tresources\n\t\t\tmetadata\n\t\t\tspine {\n\t\t\t\tid\n\t\t\t\tidref\n\t\t\t\tproperties\n\t\t\t\tlinear\n\t\t\t}\n\t\t\tbookmarks {\n\t\t\t\tid\n\t\t\t\tuserId\n\t\t\t\tepubcfi\n\t\t\t\tmediaId\n\t\t\t}\n\t\t}\n\t}\n": typeof types.EpubJsReaderDocument,
    "\n\tmutation UpdateEpubProgress($input: EpubProgressInput!) {\n\t\tupdateEpubProgress(input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.UpdateEpubProgressDocument,
    "\n\tmutation CreateOrUpdateBookmark($input: BookmarkInput!) {\n\t\tcreateOrUpdateBookmark(input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.CreateOrUpdateBookmarkDocument,
    "\n\tmutation DeleteBookmark($epubcfi: String!) {\n\t\tdeleteBookmark(epubcfi: $epubcfi) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.DeleteBookmarkDocument,
    "\n\tmutation UsePreferences($input: UpdateUserPreferencesInput!) {\n\t\tupdateViewerPreferences(input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.UsePreferencesDocument,
    "\n\tmutation BookCompletionToggleButtonComplete($id: ID!, $isComplete: Boolean!, $page: Int) {\n\t\tmarkMediaAsComplete(id: $id, isComplete: $isComplete, page: $page) {\n\t\t\tcompletedAt\n\t\t}\n\t}\n": typeof types.BookCompletionToggleButtonCompleteDocument,
    "\n\tmutation BookCompletionToggleButtonDeleteSession($id: ID!) {\n\t\tdeleteMediaProgress(id: $id) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.BookCompletionToggleButtonDeleteSessionDocument,
    "\n\tfragment BookFileInformation on Media {\n\t\tid\n\t\tsize\n\t\textension\n\t\thash\n\t\trelativeLibraryPath\n\t}\n": typeof types.BookFileInformationFragmentDoc,
    "\n\tquery BookLibrarySeriesLinks($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tlibraryId\n\t\t}\n\t}\n": typeof types.BookLibrarySeriesLinksDocument,
    "\n\tquery BookOverviewScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\t...BookCard\n\t\t\t...BookFileInformation\n\t\t\tresolvedName\n\t\t\textension\n\t\t\tmetadata {\n\t\t\t\tlinks\n\t\t\t\tsummary\n\t\t\t}\n\t\t\treadHistory {\n\t\t\t\tcompletedAt\n\t\t\t}\n\t\t}\n\t}\n": typeof types.BookOverviewSceneDocument,
    "\n\tquery BookOverviewHeader($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tseriesId\n\t\t\textension\n\t\t\tpages\n\t\t\tmetadata {\n\t\t\t\tageRating\n\t\t\t\tgenres\n\t\t\t\tpublisher\n\t\t\t\twriters\n\t\t\t\tyear\n\t\t\t}\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": typeof types.BookOverviewHeaderDocument,
    "\n\tquery BooksAfterCurrentQuery($id: ID!, $pagination: Pagination) {\n\t\tmediaById(id: $id) {\n\t\t\tnextInSeries(pagination: $pagination) {\n\t\t\t\tnodes {\n\t\t\t\t\tid\n\t\t\t\t\t...BookCard\n\t\t\t\t}\n\t\t\t\tpageInfo {\n\t\t\t\t\t__typename\n\t\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\t\tcurrentCursor\n\t\t\t\t\t\tnextCursor\n\t\t\t\t\t\tlimit\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.BooksAfterCurrentQueryDocument,
    "\n\tquery EmailBookDropdownDevice {\n\t\temailDevices {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": typeof types.EmailBookDropdownDeviceDocument,
    "\n\tmutation SendEmailAttachment($id: ID!, $sendTo: [EmailerSendTo!]!) {\n\t\tsendAttachmentEmail(input: { mediaIds: [$id], sendTo: $sendTo }) {\n\t\t\tsentCount\n\t\t\terrors\n\t\t}\n\t}\n": typeof types.SendEmailAttachmentDocument,
    "\n\tquery BookReaderScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tpages\n\t\t\textension\n\t\t\treadProgress {\n\t\t\t\tpercentageCompleted\n\t\t\t\tepubcfi\n\t\t\t\tpage\n\t\t\t}\n\t\t\tlibraryConfig {\n\t\t\t\tdefaultReadingImageScaleFit\n\t\t\t\tdefaultReadingMode\n\t\t\t\tdefaultReadingDir\n\t\t\t}\n\t\t}\n\t}\n": typeof types.BookReaderSceneDocument,
    "\n\tmutation UpdateReadProgress($id: ID!, $page: Int!) {\n\t\tupdateMediaProgress(id: $id, page: $page) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.UpdateReadProgressDocument,
    "\n\tquery BookSearchScene(\n\t\t$filter: MediaFilterInput!\n\t\t$orderBy: [MediaOrderBy!]!\n\t\t$pagination: Pagination!\n\t) {\n\t\tmedia(filter: $filter, orderBy: $orderBy, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.BookSearchSceneDocument,
    "\n\tquery CreateLibrarySceneExistingLibraries {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tpath\n\t\t\t}\n\t\t}\n\t}\n": typeof types.CreateLibrarySceneExistingLibrariesDocument,
    "\n\tmutation CreateLibrarySceneCreateLibrary($input: CreateOrUpdateLibraryInput!) {\n\t\tcreateLibrary(input: $input) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.CreateLibrarySceneCreateLibraryDocument,
    "\n\tquery CreateSmartListForm {\n\t\tsmartLists(input: { mine: true }) {\n\t\t\tname\n\t\t}\n\t}\n": typeof types.CreateSmartListFormDocument,
    "\n\tmutation CreateSmartListScene($input: SaveSmartListInput!) {\n\t\tcreateSmartList(input: $input) {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": typeof types.CreateSmartListSceneDocument,
    "\n\tquery ContinueReadingMediaQuery($pagination: Pagination!) {\n\t\tkeepReading(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.ContinueReadingMediaQueryDocument,
    "\n\tquery HomeSceneQuery {\n\t\tnumberOfLibraries\n\t}\n": typeof types.HomeSceneQueryDocument,
    "\n\tquery RecentlyAddedMediaQuery($pagination: Pagination!) {\n\t\trecentlyAddedMedia(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.RecentlyAddedMediaQueryDocument,
    "\n\tquery RecentlyAddedSeriesQuery($pagination: Pagination!) {\n\t\trecentlyAddedSeries(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.RecentlyAddedSeriesQueryDocument,
    "\n\tquery LibraryLayout($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tdescription\n\t\t\tpath\n\t\t\tstats {\n\t\t\t\tbookCount\n\t\t\t\tcompletedBooks\n\t\t\t\tinProgressBooks\n\t\t\t}\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t\t...LibrarySettingsConfig\n\t\t}\n\t}\n": typeof types.LibraryLayoutDocument,
    "\n\tmutation VisitLibrary($id: ID!) {\n\t\tvisitLibrary(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.VisitLibraryDocument,
    "\n\tquery LibraryBooksScene($filter: MediaFilterInput!, $pagination: Pagination!) {\n\t\tmedia(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LibraryBooksSceneDocument,
    "\n\tquery LibrarySeries($filter: SeriesFilterInput!, $pagination: Pagination!) {\n\t\tseries(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\ttotalPages\n\t\t\t\t\tcurrentPage\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LibrarySeriesDocument,
    "\n\tquery LibrarySeriesGrid($id: String!, $pagination: Pagination) {\n\t\tseries(filter: { libraryId: { eq: $id } }, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LibrarySeriesGridDocument,
    "\n\tfragment LibrarySettingsConfig on Library {\n\t\tconfig {\n\t\t\tid\n\t\t\tconvertRarToZip\n\t\t\thardDeleteConversions\n\t\t\tdefaultReadingDir\n\t\t\tdefaultReadingMode\n\t\t\tdefaultReadingImageScaleFit\n\t\t\tgenerateFileHashes\n\t\t\tgenerateKoreaderHashes\n\t\t\tprocessMetadata\n\t\t\twatch\n\t\t\tlibraryPattern\n\t\t\tthumbnailConfig {\n\t\t\t\t__typename\n\t\t\t\tresizeMethod {\n\t\t\t\t\t__typename\n\t\t\t\t\t... on ScaleEvenlyByFactor {\n\t\t\t\t\t\tfactor\n\t\t\t\t\t}\n\t\t\t\t\t... on ExactDimensionResize {\n\t\t\t\t\t\twidth\n\t\t\t\t\t\theight\n\t\t\t\t\t}\n\t\t\t\t\t... on ScaledDimensionResize {\n\t\t\t\t\t\tdimension\n\t\t\t\t\t\tsize\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\tformat\n\t\t\t\tquality\n\t\t\t\tpage\n\t\t\t}\n\t\t\tignoreRules\n\t\t}\n\t}\n": typeof types.LibrarySettingsConfigFragmentDoc,
    "\n\tmutation LibrarySettingsRouterEditLibraryMutation($id: ID!, $input: CreateOrUpdateLibraryInput!) {\n\t\tupdateLibrary(id: $id, input: $input) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.LibrarySettingsRouterEditLibraryMutationDocument,
    "\n\tmutation LibrarySettingsRouterScanLibraryMutation($id: ID!, $options: JSON) {\n\t\tscanLibrary(id: $id, options: $options)\n\t}\n": typeof types.LibrarySettingsRouterScanLibraryMutationDocument,
    "\n\tquery LibraryExclusionsUsersQuery {\n\t\tusers(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LibraryExclusionsUsersQueryDocument,
    "\n\tquery LibraryExclusionsQuery($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\texcludedUsers {\n\t\t\t\tid\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LibraryExclusionsQueryDocument,
    "\n\tmutation UpdateLibraryExclusions($id: ID!, $userIds: [String!]!) {\n\t\tupdateLibraryExcludedUsers(id: $id, userIds: $userIds) {\n\t\t\tid\n\t\t\texcludedUsers {\n\t\t\t\tid\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n": typeof types.UpdateLibraryExclusionsDocument,
    "\n\tmutation CleanLibrary($id: ID!) {\n\t\tcleanLibrary(id: $id) {\n\t\t\tdeletedMediaCount\n\t\t\tdeletedSeriesCount\n\t\t\tisEmpty\n\t\t}\n\t}\n": typeof types.CleanLibraryDocument,
    "\n\tmutation AnalyzeLibraryMedia($id: ID!) {\n\t\tanalyzeMedia(id: $id)\n\t}\n": typeof types.AnalyzeLibraryMediaDocument,
    "\n\tmutation ScanHistorySectionClearHistory($id: ID!) {\n\t\tclearScanHistory(id: $id)\n\t}\n": typeof types.ScanHistorySectionClearHistoryDocument,
    "\n\tquery ScanHistoryTable($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tscanHistory {\n\t\t\t\tid\n\t\t\t\tjobId\n\t\t\t\ttimestamp\n\t\t\t\toptions\n\t\t\t}\n\t\t}\n\t}\n": typeof types.ScanHistoryTableDocument,
    "\n\tquery ScanRecordInspectorJobs($id: ID!, $loadLogs: Boolean!) {\n\t\tjobById(id: $id) {\n\t\t\tid\n\t\t\toutputData {\n\t\t\t\t__typename\n\t\t\t\t... on LibraryScanOutput {\n\t\t\t\t\ttotalFiles\n\t\t\t\t\ttotalDirectories\n\t\t\t\t\tignoredFiles\n\t\t\t\t\tskippedFiles\n\t\t\t\t\tignoredDirectories\n\t\t\t\t\tcreatedMedia\n\t\t\t\t\tupdatedMedia\n\t\t\t\t\tcreatedSeries\n\t\t\t\t\tupdatedSeries\n\t\t\t\t}\n\t\t\t}\n\t\t\tlogs @include(if: $loadLogs) {\n\t\t\t\tid\n\t\t\t}\n\t\t}\n\t}\n": typeof types.ScanRecordInspectorJobsDocument,
    "\n\tmutation DeleteLibraryThumbnails($id: ID!) {\n\t\tdeleteLibraryThumbnails(id: $id)\n\t}\n": typeof types.DeleteLibraryThumbnailsDocument,
    "\n\tmutation LibraryThumbnailSelectorUpdate($id: ID!, $input: UpdateLibraryThumbnailInput!) {\n\t\tupdateLibraryThumbnail(id: $id, input: $input) {\n\t\t\tid\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LibraryThumbnailSelectorUpdateDocument,
    "\n\tmutation LibraryThumbnailSelectorUpload($id: ID!, $file: Upload!) {\n\t\tuploadLibraryThumbnail(id: $id, file: $file) {\n\t\t\tid\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LibraryThumbnailSelectorUploadDocument,
    "\n\tmutation RegenerateThumbnails($id: ID!, $forceRegenerate: Boolean!) {\n\t\tgenerateLibraryThumbnails(id: $id, forceRegenerate: $forceRegenerate)\n\t}\n": typeof types.RegenerateThumbnailsDocument,
    "\n\tquery SeriesLayout($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tpath\n\t\t\tlibrary {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t\tresolvedName\n\t\t\tresolvedDescription\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SeriesLayoutDocument,
    "\n\tquery SeriesLibrayLink($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": typeof types.SeriesLibrayLinkDocument,
    "\n\tquery SeriesBooksScene($filter: MediaFilterInput!, $pagination: Pagination!) {\n\t\tmedia(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SeriesBooksSceneDocument,
    "\n\tquery SeriesBookGrid($id: String!, $pagination: Pagination) {\n\t\tmedia(filter: { seriesId: { eq: $id } }, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\tpages\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SeriesBookGridDocument,
    "\n\tquery APIKeyTable {\n\t\tapiKeys {\n\t\t\tid\n\t\t\tname\n\t\t\tpermissions {\n\t\t\t\t__typename\n\t\t\t\t... on UserPermissionStruct {\n\t\t\t\t\tvalue\n\t\t\t\t}\n\t\t\t}\n\t\t\tlastUsedAt\n\t\t\texpiresAt\n\t\t\tcreatedAt\n\t\t}\n\t}\n": typeof types.ApiKeyTableDocument,
    "\n\tmutation CreateAPIKeyModal($input: ApikeyInput!) {\n\t\tcreateApiKey(input: $input) {\n\t\t\tapiKey {\n\t\t\t\tid\n\t\t\t}\n\t\t\tsecret\n\t\t}\n\t}\n": typeof types.CreateApiKeyModalDocument,
    "\n\tmutation DeleteAPIKeyConfirmModal($id: Int!) {\n\t\tdeleteApiKey(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.DeleteApiKeyConfirmModalDocument,
    "\n\tmutation UpdateUserLocaleSelector($input: UpdateUserPreferencesInput!) {\n\t\tupdateViewerPreferences(input: $input) {\n\t\t\tlocale\n\t\t}\n\t}\n": typeof types.UpdateUserLocaleSelectorDocument,
    "\n\tmutation UpdateUserProfileForm($input: UpdateUserInput!) {\n\t\tupdateViewer(input: $input) {\n\t\t\tid\n\t\t\tusername\n\t\t\tavatarUrl\n\t\t}\n\t}\n": typeof types.UpdateUserProfileFormDocument,
    "\n\tquery CreateEmailerSceneEmailers {\n\t\temailers {\n\t\t\tname\n\t\t}\n\t}\n": typeof types.CreateEmailerSceneEmailersDocument,
    "\n\tmutation CreateEmailerSceneCreateEmailer($input: EmailerInput!) {\n\t\tcreateEmailer(input: $input) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.CreateEmailerSceneCreateEmailerDocument,
    "\n\tquery EditEmailerScene($id: Int!) {\n\t\temailers {\n\t\t\tname\n\t\t}\n\t\temailerById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tisPrimary\n\t\t\tsmtpHost\n\t\t\tsmtpPort\n\t\t\tlastUsedAt\n\t\t\tmaxAttachmentSizeBytes\n\t\t\tsenderDisplayName\n\t\t\tsenderEmail\n\t\t\ttlsEnabled\n\t\t\tusername\n\t\t}\n\t}\n": typeof types.EditEmailerSceneDocument,
    "\n\tmutation EditEmailerSceneEditEmailer($id: Int!, $input: EmailerInput!) {\n\t\tupdateEmailer(id: $id, input: $input) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.EditEmailerSceneEditEmailerDocument,
    "\n\tmutation CreateOrUpdateDeviceModalCreateEmailDevice($input: EmailDeviceInput!) {\n\t\tcreateEmailDevice(input: $input) {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": typeof types.CreateOrUpdateDeviceModalCreateEmailDeviceDocument,
    "\n\tmutation CreateOrUpdateDeviceModalUpdateEmailDevice($id: Int!, $input: EmailDeviceInput!) {\n\t\tupdateEmailDevice(id: $id, input: $input) {\n\t\t\tid\n\t\t\tname\n\t\t\tforbidden\n\t\t}\n\t}\n": typeof types.CreateOrUpdateDeviceModalUpdateEmailDeviceDocument,
    "\n\tmutation DeleteDeviceConfirmationDeleteEmailDevice($id: Int!) {\n\t\tdeleteEmailDevice(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.DeleteDeviceConfirmationDeleteEmailDeviceDocument,
    "\n\tquery EmailDevicesTable {\n\t\temailDevices {\n\t\t\tid\n\t\t\tname\n\t\t\temail\n\t\t\tforbidden\n\t\t}\n\t}\n": typeof types.EmailDevicesTableDocument,
    "\n\tfragment EmailerListItem on Emailer {\n\t\tid\n\t\tname\n\t\tisPrimary\n\t\tsmtpHost\n\t\tsmtpPort\n\t\tlastUsedAt\n\t\tmaxAttachmentSizeBytes\n\t\tsenderDisplayName\n\t\tsenderEmail\n\t\ttlsEnabled\n\t\tusername\n\t}\n": typeof types.EmailerListItemFragmentDoc,
    "\n\tquery EmailerSendHistory($id: Int!, $fetchUser: Boolean!) {\n\t\temailerById(id: $id) {\n\t\t\tsendHistory {\n\t\t\t\tsentAt\n\t\t\t\trecipientEmail\n\t\t\t\tsentByUserId\n\t\t\t\tsentBy @include(if: $fetchUser) {\n\t\t\t\t\tid\n\t\t\t\t\tusername\n\t\t\t\t}\n\t\t\t\tattachmentMeta {\n\t\t\t\t\tfilename\n\t\t\t\t\tmediaId\n\t\t\t\t\tmedia {\n\t\t\t\t\t\tresolvedName\n\t\t\t\t\t}\n\t\t\t\t\tsize\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.EmailerSendHistoryDocument,
    "\n\tquery EmailersList {\n\t\temailers {\n\t\t\tid\n\t\t\t...EmailerListItem\n\t\t}\n\t}\n": typeof types.EmailersListDocument,
    "\n\tmutation DeleteJobHistoryConfirmation {\n\t\tdeleteJobHistory {\n\t\t\taffectedRows\n\t\t}\n\t}\n": typeof types.DeleteJobHistoryConfirmationDocument,
    "\n\tmutation JobActionMenuCancelJob($id: ID!) {\n\t\tcancelJob(id: $id)\n\t}\n": typeof types.JobActionMenuCancelJobDocument,
    "\n\tmutation JobActionMenuDeleteJob($id: ID!) {\n\t\tcancelJob(id: $id)\n\t}\n": typeof types.JobActionMenuDeleteJobDocument,
    "\n\tmutation JobActionMenuDeleteLogs($id: ID!) {\n\t\tdeleteJobLogs(id: $id) {\n\t\t\taffectedRows\n\t\t}\n\t}\n": typeof types.JobActionMenuDeleteLogsDocument,
    "\n\tfragment JobDataInspector on CoreJobOutput {\n\t\t__typename\n\t\t... on LibraryScanOutput {\n\t\t\ttotalFiles\n\t\t\ttotalDirectories\n\t\t\tignoredFiles\n\t\t\tskippedFiles\n\t\t\tignoredDirectories\n\t\t\tcreatedMedia\n\t\t\tupdatedMedia\n\t\t\tcreatedSeries\n\t\t\tupdatedSeries\n\t\t}\n\t\t... on SeriesScanOutput {\n\t\t\ttotalFiles\n\t\t\tignoredFiles\n\t\t\tskippedFiles\n\t\t\tcreatedMedia\n\t\t\tupdatedMedia\n\t\t}\n\t\t... on ThumbnailGenerationOutput {\n\t\t\tvisitedFiles\n\t\t\tskippedFiles\n\t\t\tgeneratedThumbnails\n\t\t\tremovedThumbnails\n\t\t}\n\t\t... on ExternalJobOutput {\n\t\t\tval\n\t\t}\n\t}\n": typeof types.JobDataInspectorFragmentDoc,
    "\n\tquery JobSchedulerConfig {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\temoji\n\t\t\t}\n\t\t}\n\t\tscheduledJobConfigs {\n\t\t\tid\n\t\t\tintervalSecs\n\t\t\t# Note: For now scanConfigs are actually just a library node\n\t\t\tscanConfigs {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": typeof types.JobSchedulerConfigDocument,
    "\n\tmutation JobSchedulerUpdate($id: Int!, $input: ScheduledJobConfigInput!) {\n\t\tupdateScheduledJobConfig(id: $id, input: $input) {\n\t\t\tid\n\t\t\tintervalSecs\n\t\t\tscanConfigs {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": typeof types.JobSchedulerUpdateDocument,
    "\n\tmutation JobSchedulerDelete($id: Int!) {\n\t\tdeleteScheduledJobConfig(id: $id)\n\t}\n": typeof types.JobSchedulerDeleteDocument,
    "\n\tmutation JobSchedulerCreate($input: ScheduledJobConfigInput!) {\n\t\tcreateScheduledJobConfig(input: $input) {\n\t\t\tid\n\t\t\tintervalSecs\n\t\t\tscanConfigs {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": typeof types.JobSchedulerCreateDocument,
    "\n\tquery JobTable($pagination: Pagination!) {\n\t\tjobs(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tdescription\n\t\t\t\tstatus\n\t\t\t\tcreatedAt\n\t\t\t\tcompletedAt\n\t\t\t\tmsElapsed\n\t\t\t\toutputData {\n\t\t\t\t\t...JobDataInspector\n\t\t\t\t}\n\t\t\t\tlogCount\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.JobTableDocument,
    "\n\tsubscription LiveLogsFeed {\n\t\ttailLogFile\n\t}\n": typeof types.LiveLogsFeedDocument,
    "\n\tmutation DeleteLogs {\n\t\tdeleteLogs {\n\t\t\tdeleted\n\t\t}\n\t}\n": typeof types.DeleteLogsDocument,
    "\n\tquery PersistedLogs(\n\t\t$filter: LogFilterInput!\n\t\t$pagination: Pagination!\n\t\t$orderBy: [LogModelOrderBy!]!\n\t) {\n\t\tlogs(filter: $filter, pagination: $pagination, orderBy: $orderBy) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\ttimestamp\n\t\t\t\tlevel\n\t\t\t\tmessage\n\t\t\t\tjobId\n\t\t\t\tcontext\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\ttotalPages\n\t\t\t\t\tcurrentPage\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.PersistedLogsDocument,
    "\n\tmutation CreateOrUpdateUserFormUpdateUser($id: ID!, $input: UpdateUserInput!) {\n\t\tupdateUser(id: $id, input: $input) {\n\t\t\tid\n\t\t\tusername\n\t\t\tageRestriction {\n\t\t\t\tage\n\t\t\t\trestrictOnUnset\n\t\t\t}\n\t\t\tpermissions\n\t\t\tmaxSessionsAllowed\n\t\t}\n\t}\n": typeof types.CreateOrUpdateUserFormUpdateUserDocument,
    "\n\tmutation CreateOrUpdateUserFormCreateUser($input: CreateUserInput!) {\n\t\tcreateUser(input: $input) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.CreateOrUpdateUserFormCreateUserDocument,
    "\n\tquery CreateUserScene {\n\t\tusers(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n": typeof types.CreateUserSceneDocument,
    "\n\tquery UpdateUserScene($id: ID!, $skip: Boolean!) {\n\t\tme {\n\t\t\tid\n\t\t}\n\t\tuserById(id: $id) @skip(if: $skip) {\n\t\t\tid\n\t\t\tavatarUrl\n\t\t\tusername\n\t\t\tageRestriction {\n\t\t\t\tage\n\t\t\t\trestrictOnUnset\n\t\t\t}\n\t\t\tpermissions\n\t\t\tmaxSessionsAllowed\n\t\t\tisServerOwner\n\t\t}\n\t\tusers(pagination: { none: { unpaginated: true } }) @skip(if: $skip) {\n\t\t\tnodes {\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n": typeof types.UpdateUserSceneDocument,
    "\n\tmutation ClearLoginActivityConfirmation {\n\t\tdeleteLoginActivity\n\t}\n": typeof types.ClearLoginActivityConfirmationDocument,
    "\n\tquery LoginActivityTable {\n\t\tloginActivity {\n\t\t\tid\n\t\t\tipAddress\n\t\t\tuserAgent\n\t\t\tauthenticationSuccessful\n\t\t\ttimestamp\n\t\t\tuser {\n\t\t\t\tid\n\t\t\t\tusername\n\t\t\t\tavatarUrl\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LoginActivityTableDocument,
    "\n\tmutation DeleteUser($id: ID!, $hardDelete: Boolean) {\n\t\tdeleteUser(id: $id, hardDelete: $hardDelete) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.DeleteUserDocument,
    "\n\tmutation UserActionMenuLockUser($id: ID!, $lock: Boolean!) {\n\t\tupdateUserLockStatus(id: $id, lock: $lock) {\n\t\t\tid\n\t\t\tisLocked\n\t\t}\n\t}\n": typeof types.UserActionMenuLockUserDocument,
    "\n\tmutation UserActionMenuDeleteUserSessions($id: ID!) {\n\t\tdeleteUserSessions(id: $id)\n\t}\n": typeof types.UserActionMenuDeleteUserSessionsDocument,
    "\n\tquery UserTable($pagination: Pagination!) {\n\t\tusers(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tavatarUrl\n\t\t\t\tusername\n\t\t\t\tisServerOwner\n\t\t\t\tisLocked\n\t\t\t\tcreatedAt\n\t\t\t\tlastLogin\n\t\t\t\tloginSessionsCount\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\ttotalPages\n\t\t\t\t\tcurrentPage\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.UserTableDocument,
    "\n\tmutation CreateSmartListView($input: SaveSmartListView!) {\n\t\tcreateSmartListView(input: $input) {\n\t\t\tid\n\t\t\tlistId\n\t\t\tname\n\t\t\tbookColumns {\n\t\t\t\tid\n\t\t\t\tposition\n\t\t\t}\n\t\t\tbookSorting {\n\t\t\t\tid\n\t\t\t\tdesc\n\t\t\t}\n\t\t\tgroupColumns {\n\t\t\t\tid\n\t\t\t\tposition\n\t\t\t}\n\t\t\tgroupSorting {\n\t\t\t\tid\n\t\t\t\tdesc\n\t\t\t}\n\t\t}\n\t}\n": typeof types.CreateSmartListViewDocument,
    "\n\tmutation UpdateSmartListView($originalName: String!, $input: SaveSmartListView!) {\n\t\tupdateSmartListView(originalName: $originalName, input: $input) {\n\t\t\tid\n\t\t\tlistId\n\t\t\tname\n\t\t\tbookColumns {\n\t\t\t\tid\n\t\t\t\tposition\n\t\t\t}\n\t\t\tbookSorting {\n\t\t\t\tid\n\t\t\t\tdesc\n\t\t\t}\n\t\t\tgroupColumns {\n\t\t\t\tid\n\t\t\t\tposition\n\t\t\t}\n\t\t\tgroupSorting {\n\t\t\t\tid\n\t\t\t\tdesc\n\t\t\t}\n\t\t}\n\t}\n": typeof types.UpdateSmartListViewDocument,
    "\n\tquery SmartListsWithSearch($input: SmartListsInput!) {\n\t\tsmartLists(input: $input) {\n\t\t\tid\n\t\t\tcreatorId\n\t\t\tdescription\n\t\t\tdefaultGrouping\n\t\t\tfilters\n\t\t\tjoiner\n\t\t\tname\n\t\t\tvisibility\n\t\t}\n\t}\n": typeof types.SmartListsWithSearchDocument,
    "\n\tquery SmartListBasicSettingsScene {\n\t\tsmartLists(input: { mine: true }) {\n\t\t\tname\n\t\t}\n\t}\n": typeof types.SmartListBasicSettingsSceneDocument,
    "\n\tmutation DeleteSmartList($id: ID!) {\n\t\tdeleteSmartList(id: $id) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.DeleteSmartListDocument,
    "\n\tquery SmartListById($id: ID!) {\n\t\tsmartListById(id: $id) {\n\t\t\tid\n\t\t\tcreatorId\n\t\t\tdescription\n\t\t\tdefaultGrouping\n\t\t\tfilters\n\t\t\tjoiner\n\t\t\tname\n\t\t\tvisibility\n\t\t\tviews {\n\t\t\t\tid\n\t\t\t\tlistId\n\t\t\t\tname\n\t\t\t\tbookColumns {\n\t\t\t\t\tid\n\t\t\t\t\tposition\n\t\t\t\t}\n\t\t\t\tbookSorting {\n\t\t\t\t\tid\n\t\t\t\t\tdesc\n\t\t\t\t}\n\t\t\t\tgroupColumns {\n\t\t\t\t\tid\n\t\t\t\t\tposition\n\t\t\t\t}\n\t\t\t\tgroupSorting {\n\t\t\t\t\tid\n\t\t\t\t\tdesc\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SmartListByIdDocument,
    "\n\tquery SmartListMeta($id: ID!) {\n\t\tsmartListMeta(id: $id) {\n\t\t\tmatchedBooks\n\t\t\tmatchedSeries\n\t\t\tmatchedLibraries\n\t\t}\n\t}\n": typeof types.SmartListMetaDocument,
    "\n\tmutation UpdateSmartList($id: ID!, $input: SaveSmartListInput!) {\n\t\tupdateSmartList(id: $id, input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.UpdateSmartListDocument,
    "\n\tquery SmartListItems($id: ID!) {\n\t\tsmartListItems(id: $id) {\n\t\t\t__typename\n\t\t\t... on SmartListGrouped {\n\t\t\t\titems {\n\t\t\t\t\tentity {\n\t\t\t\t\t\t__typename\n\t\t\t\t\t\t... on Series {\n\t\t\t\t\t\t\tid\n\t\t\t\t\t\t\tname\n\t\t\t\t\t\t}\n\t\t\t\t\t\t... on Library {\n\t\t\t\t\t\t\tid\n\t\t\t\t\t\t\tname\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t\tbooks {\n\t\t\t\t\t\t...BookCard\n\t\t\t\t\t\tmetadata {\n\t\t\t\t\t\t\tageRating\n\t\t\t\t\t\t\tcharacters\n\t\t\t\t\t\t\tcolorists\n\t\t\t\t\t\t\tcoverArtists\n\t\t\t\t\t\t\teditors\n\t\t\t\t\t\t\tgenres\n\t\t\t\t\t\t\tinkers\n\t\t\t\t\t\t\tletterers\n\t\t\t\t\t\t\tlinks\n\t\t\t\t\t\t\tpencillers\n\t\t\t\t\t\t\tpublisher\n\t\t\t\t\t\t\tteams\n\t\t\t\t\t\t\twriters\n\t\t\t\t\t\t\tyear\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t\t... on SmartListUngrouped {\n\t\t\t\tbooks {\n\t\t\t\t\t...BookCard\n\t\t\t\t\tmetadata {\n\t\t\t\t\t\tageRating\n\t\t\t\t\t\tcharacters\n\t\t\t\t\t\tcolorists\n\t\t\t\t\t\tcoverArtists\n\t\t\t\t\t\teditors\n\t\t\t\t\t\tgenres\n\t\t\t\t\t\tinkers\n\t\t\t\t\t\tletterers\n\t\t\t\t\t\tlinks\n\t\t\t\t\t\tpencillers\n\t\t\t\t\t\tpublisher\n\t\t\t\t\t\tteams\n\t\t\t\t\t\twriters\n\t\t\t\t\t\tyear\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SmartListItemsDocument,
    "\n\tquery DirectoryListing($input: DirectoryListingInput!, $pagination: Pagination!) {\n\t\tlistDirectory(input: $input, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tparent\n\t\t\t\tfiles {\n\t\t\t\t\tname\n\t\t\t\t\tpath\n\t\t\t\t\tisDirectory\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.DirectoryListingDocument,
    "\n\tquery UploadConfig {\n\t\tuploadConfig {\n\t\t\tenabled\n\t\t\tmaxFileUploadSize\n\t\t}\n\t}\n": typeof types.UploadConfigDocument,
};
const documents: Documents = {
    "\n\tquery TagSelectQuery {\n\t\ttags {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": types.TagSelectQueryDocument,
    "\n\tfragment BookCard on Media {\n\t\tid\n\t\tresolvedName\n\t\textension\n\t\tpages\n\t\tsize\n\t\tstatus\n\t\tthumbnail {\n\t\t\turl\n\t\t}\n\t\treadProgress {\n\t\t\tpercentageCompleted\n\t\t\tepubcfi\n\t\t\tpage\n\t\t}\n\t\treadHistory {\n\t\t\t__typename\n\t\t\tcompletedAt\n\t\t}\n\t}\n": types.BookCardFragmentDoc,
    "\n\tquery MediaAtPath($path: String!) {\n\t\tmediaByPath(path: $path) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n": types.MediaAtPathDocument,
    "\n\tmutation UploadLibraryBooks($input: UploadBooksInput!) {\n\t\tuploadBooks(input: $input)\n\t}\n": types.UploadLibraryBooksDocument,
    "\n\tmutation UploadLibrarySeries($input: UploadSeriesInput!) {\n\t\tuploadSeries(input: $input)\n\t}\n": types.UploadLibrarySeriesDocument,
    "\n\tquery MediaFilterForm($seriesId: ID) {\n\t\tmediaMetadataOverview(seriesId: $seriesId) {\n\t\t\tgenres\n\t\t\twriters\n\t\t\tpencillers\n\t\t\tcolorists\n\t\t\tletterers\n\t\t\tinkers\n\t\t\tpublishers\n\t\t\teditors\n\t\t\tcharacters\n\t\t}\n\t}\n": types.MediaFilterFormDocument,
    "\n\tmutation DeleteLibrary($id: ID!) {\n\t\tdeleteLibrary(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": types.DeleteLibraryDocument,
    "\n\tquery LastVisitedLibrary {\n\t\tlastVisitedLibrary {\n\t\t\tid\n\t\t\tname\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n": types.LastVisitedLibraryDocument,
    "\n\tquery SideBarQuery {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t\t... on SystemArrangmentConfig {\n\t\t\t\t\t\t\t\tvariant\n\t\t\t\t\t\t\t\tlinks\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t\tvisible\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.SideBarQueryDocument,
    "\n\tmutation UpdateLibraryEmoji($id: ID!, $emoji: String) {\n\t\tupdateLibraryEmoji(id: $id, emoji: $emoji) {\n\t\t\tid\n\t\t}\n\t}\n": types.UpdateLibraryEmojiDocument,
    "\n\tmutation ScanLibraryMutation($id: ID!) {\n\t\tscanLibrary(id: $id)\n\t}\n": types.ScanLibraryMutationDocument,
    "\n\tquery LibrarySideBarSection {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\temoji\n\t\t\t}\n\t\t}\n\t}\n": types.LibrarySideBarSectionDocument,
    "\n\tquery TopNavigation {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t\t... on SystemArrangmentConfig {\n\t\t\t\t\t\t\t\tvariant\n\t\t\t\t\t\t\t\tlinks\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t\tvisible\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.TopNavigationDocument,
    "\n\tquery LibraryNavigationItem {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\temoji\n\t\t\t}\n\t\t}\n\t}\n": types.LibraryNavigationItemDocument,
    "\n\tquery EpubJsReader($id: ID!) {\n\t\tepubById(id: $id) {\n\t\t\tmediaId\n\t\t\trootBase\n\t\t\trootFile\n\t\t\textraCss\n\t\t\ttoc\n\t\t\tresources\n\t\t\tmetadata\n\t\t\tspine {\n\t\t\t\tid\n\t\t\t\tidref\n\t\t\t\tproperties\n\t\t\t\tlinear\n\t\t\t}\n\t\t\tbookmarks {\n\t\t\t\tid\n\t\t\t\tuserId\n\t\t\t\tepubcfi\n\t\t\t\tmediaId\n\t\t\t}\n\t\t}\n\t}\n": types.EpubJsReaderDocument,
    "\n\tmutation UpdateEpubProgress($input: EpubProgressInput!) {\n\t\tupdateEpubProgress(input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.UpdateEpubProgressDocument,
    "\n\tmutation CreateOrUpdateBookmark($input: BookmarkInput!) {\n\t\tcreateOrUpdateBookmark(input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.CreateOrUpdateBookmarkDocument,
    "\n\tmutation DeleteBookmark($epubcfi: String!) {\n\t\tdeleteBookmark(epubcfi: $epubcfi) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.DeleteBookmarkDocument,
    "\n\tmutation UsePreferences($input: UpdateUserPreferencesInput!) {\n\t\tupdateViewerPreferences(input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.UsePreferencesDocument,
    "\n\tmutation BookCompletionToggleButtonComplete($id: ID!, $isComplete: Boolean!, $page: Int) {\n\t\tmarkMediaAsComplete(id: $id, isComplete: $isComplete, page: $page) {\n\t\t\tcompletedAt\n\t\t}\n\t}\n": types.BookCompletionToggleButtonCompleteDocument,
    "\n\tmutation BookCompletionToggleButtonDeleteSession($id: ID!) {\n\t\tdeleteMediaProgress(id: $id) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.BookCompletionToggleButtonDeleteSessionDocument,
    "\n\tfragment BookFileInformation on Media {\n\t\tid\n\t\tsize\n\t\textension\n\t\thash\n\t\trelativeLibraryPath\n\t}\n": types.BookFileInformationFragmentDoc,
    "\n\tquery BookLibrarySeriesLinks($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tlibraryId\n\t\t}\n\t}\n": types.BookLibrarySeriesLinksDocument,
    "\n\tquery BookOverviewScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\t...BookCard\n\t\t\t...BookFileInformation\n\t\t\tresolvedName\n\t\t\textension\n\t\t\tmetadata {\n\t\t\t\tlinks\n\t\t\t\tsummary\n\t\t\t}\n\t\t\treadHistory {\n\t\t\t\tcompletedAt\n\t\t\t}\n\t\t}\n\t}\n": types.BookOverviewSceneDocument,
    "\n\tquery BookOverviewHeader($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tseriesId\n\t\t\textension\n\t\t\tpages\n\t\t\tmetadata {\n\t\t\t\tageRating\n\t\t\t\tgenres\n\t\t\t\tpublisher\n\t\t\t\twriters\n\t\t\t\tyear\n\t\t\t}\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": types.BookOverviewHeaderDocument,
    "\n\tquery BooksAfterCurrentQuery($id: ID!, $pagination: Pagination) {\n\t\tmediaById(id: $id) {\n\t\t\tnextInSeries(pagination: $pagination) {\n\t\t\t\tnodes {\n\t\t\t\t\tid\n\t\t\t\t\t...BookCard\n\t\t\t\t}\n\t\t\t\tpageInfo {\n\t\t\t\t\t__typename\n\t\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\t\tcurrentCursor\n\t\t\t\t\t\tnextCursor\n\t\t\t\t\t\tlimit\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.BooksAfterCurrentQueryDocument,
    "\n\tquery EmailBookDropdownDevice {\n\t\temailDevices {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": types.EmailBookDropdownDeviceDocument,
    "\n\tmutation SendEmailAttachment($id: ID!, $sendTo: [EmailerSendTo!]!) {\n\t\tsendAttachmentEmail(input: { mediaIds: [$id], sendTo: $sendTo }) {\n\t\t\tsentCount\n\t\t\terrors\n\t\t}\n\t}\n": types.SendEmailAttachmentDocument,
    "\n\tquery BookReaderScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tpages\n\t\t\textension\n\t\t\treadProgress {\n\t\t\t\tpercentageCompleted\n\t\t\t\tepubcfi\n\t\t\t\tpage\n\t\t\t}\n\t\t\tlibraryConfig {\n\t\t\t\tdefaultReadingImageScaleFit\n\t\t\t\tdefaultReadingMode\n\t\t\t\tdefaultReadingDir\n\t\t\t}\n\t\t}\n\t}\n": types.BookReaderSceneDocument,
    "\n\tmutation UpdateReadProgress($id: ID!, $page: Int!) {\n\t\tupdateMediaProgress(id: $id, page: $page) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.UpdateReadProgressDocument,
    "\n\tquery BookSearchScene(\n\t\t$filter: MediaFilterInput!\n\t\t$orderBy: [MediaOrderBy!]!\n\t\t$pagination: Pagination!\n\t) {\n\t\tmedia(filter: $filter, orderBy: $orderBy, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.BookSearchSceneDocument,
    "\n\tquery CreateLibrarySceneExistingLibraries {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tpath\n\t\t\t}\n\t\t}\n\t}\n": types.CreateLibrarySceneExistingLibrariesDocument,
    "\n\tmutation CreateLibrarySceneCreateLibrary($input: CreateOrUpdateLibraryInput!) {\n\t\tcreateLibrary(input: $input) {\n\t\t\tid\n\t\t}\n\t}\n": types.CreateLibrarySceneCreateLibraryDocument,
    "\n\tquery CreateSmartListForm {\n\t\tsmartLists(input: { mine: true }) {\n\t\t\tname\n\t\t}\n\t}\n": types.CreateSmartListFormDocument,
    "\n\tmutation CreateSmartListScene($input: SaveSmartListInput!) {\n\t\tcreateSmartList(input: $input) {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": types.CreateSmartListSceneDocument,
    "\n\tquery ContinueReadingMediaQuery($pagination: Pagination!) {\n\t\tkeepReading(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.ContinueReadingMediaQueryDocument,
    "\n\tquery HomeSceneQuery {\n\t\tnumberOfLibraries\n\t}\n": types.HomeSceneQueryDocument,
    "\n\tquery RecentlyAddedMediaQuery($pagination: Pagination!) {\n\t\trecentlyAddedMedia(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.RecentlyAddedMediaQueryDocument,
    "\n\tquery RecentlyAddedSeriesQuery($pagination: Pagination!) {\n\t\trecentlyAddedSeries(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.RecentlyAddedSeriesQueryDocument,
    "\n\tquery LibraryLayout($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tdescription\n\t\t\tpath\n\t\t\tstats {\n\t\t\t\tbookCount\n\t\t\t\tcompletedBooks\n\t\t\t\tinProgressBooks\n\t\t\t}\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t\t...LibrarySettingsConfig\n\t\t}\n\t}\n": types.LibraryLayoutDocument,
    "\n\tmutation VisitLibrary($id: ID!) {\n\t\tvisitLibrary(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": types.VisitLibraryDocument,
    "\n\tquery LibraryBooksScene($filter: MediaFilterInput!, $pagination: Pagination!) {\n\t\tmedia(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.LibraryBooksSceneDocument,
    "\n\tquery LibrarySeries($filter: SeriesFilterInput!, $pagination: Pagination!) {\n\t\tseries(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\ttotalPages\n\t\t\t\t\tcurrentPage\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.LibrarySeriesDocument,
    "\n\tquery LibrarySeriesGrid($id: String!, $pagination: Pagination) {\n\t\tseries(filter: { libraryId: { eq: $id } }, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.LibrarySeriesGridDocument,
    "\n\tfragment LibrarySettingsConfig on Library {\n\t\tconfig {\n\t\t\tid\n\t\t\tconvertRarToZip\n\t\t\thardDeleteConversions\n\t\t\tdefaultReadingDir\n\t\t\tdefaultReadingMode\n\t\t\tdefaultReadingImageScaleFit\n\t\t\tgenerateFileHashes\n\t\t\tgenerateKoreaderHashes\n\t\t\tprocessMetadata\n\t\t\twatch\n\t\t\tlibraryPattern\n\t\t\tthumbnailConfig {\n\t\t\t\t__typename\n\t\t\t\tresizeMethod {\n\t\t\t\t\t__typename\n\t\t\t\t\t... on ScaleEvenlyByFactor {\n\t\t\t\t\t\tfactor\n\t\t\t\t\t}\n\t\t\t\t\t... on ExactDimensionResize {\n\t\t\t\t\t\twidth\n\t\t\t\t\t\theight\n\t\t\t\t\t}\n\t\t\t\t\t... on ScaledDimensionResize {\n\t\t\t\t\t\tdimension\n\t\t\t\t\t\tsize\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\tformat\n\t\t\t\tquality\n\t\t\t\tpage\n\t\t\t}\n\t\t\tignoreRules\n\t\t}\n\t}\n": types.LibrarySettingsConfigFragmentDoc,
    "\n\tmutation LibrarySettingsRouterEditLibraryMutation($id: ID!, $input: CreateOrUpdateLibraryInput!) {\n\t\tupdateLibrary(id: $id, input: $input) {\n\t\t\tid\n\t\t}\n\t}\n": types.LibrarySettingsRouterEditLibraryMutationDocument,
    "\n\tmutation LibrarySettingsRouterScanLibraryMutation($id: ID!, $options: JSON) {\n\t\tscanLibrary(id: $id, options: $options)\n\t}\n": types.LibrarySettingsRouterScanLibraryMutationDocument,
    "\n\tquery LibraryExclusionsUsersQuery {\n\t\tusers(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n": types.LibraryExclusionsUsersQueryDocument,
    "\n\tquery LibraryExclusionsQuery($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\texcludedUsers {\n\t\t\t\tid\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n": types.LibraryExclusionsQueryDocument,
    "\n\tmutation UpdateLibraryExclusions($id: ID!, $userIds: [String!]!) {\n\t\tupdateLibraryExcludedUsers(id: $id, userIds: $userIds) {\n\t\t\tid\n\t\t\texcludedUsers {\n\t\t\t\tid\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n": types.UpdateLibraryExclusionsDocument,
    "\n\tmutation CleanLibrary($id: ID!) {\n\t\tcleanLibrary(id: $id) {\n\t\t\tdeletedMediaCount\n\t\t\tdeletedSeriesCount\n\t\t\tisEmpty\n\t\t}\n\t}\n": types.CleanLibraryDocument,
    "\n\tmutation AnalyzeLibraryMedia($id: ID!) {\n\t\tanalyzeMedia(id: $id)\n\t}\n": types.AnalyzeLibraryMediaDocument,
    "\n\tmutation ScanHistorySectionClearHistory($id: ID!) {\n\t\tclearScanHistory(id: $id)\n\t}\n": types.ScanHistorySectionClearHistoryDocument,
    "\n\tquery ScanHistoryTable($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tscanHistory {\n\t\t\t\tid\n\t\t\t\tjobId\n\t\t\t\ttimestamp\n\t\t\t\toptions\n\t\t\t}\n\t\t}\n\t}\n": types.ScanHistoryTableDocument,
    "\n\tquery ScanRecordInspectorJobs($id: ID!, $loadLogs: Boolean!) {\n\t\tjobById(id: $id) {\n\t\t\tid\n\t\t\toutputData {\n\t\t\t\t__typename\n\t\t\t\t... on LibraryScanOutput {\n\t\t\t\t\ttotalFiles\n\t\t\t\t\ttotalDirectories\n\t\t\t\t\tignoredFiles\n\t\t\t\t\tskippedFiles\n\t\t\t\t\tignoredDirectories\n\t\t\t\t\tcreatedMedia\n\t\t\t\t\tupdatedMedia\n\t\t\t\t\tcreatedSeries\n\t\t\t\t\tupdatedSeries\n\t\t\t\t}\n\t\t\t}\n\t\t\tlogs @include(if: $loadLogs) {\n\t\t\t\tid\n\t\t\t}\n\t\t}\n\t}\n": types.ScanRecordInspectorJobsDocument,
    "\n\tmutation DeleteLibraryThumbnails($id: ID!) {\n\t\tdeleteLibraryThumbnails(id: $id)\n\t}\n": types.DeleteLibraryThumbnailsDocument,
    "\n\tmutation LibraryThumbnailSelectorUpdate($id: ID!, $input: UpdateLibraryThumbnailInput!) {\n\t\tupdateLibraryThumbnail(id: $id, input: $input) {\n\t\t\tid\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n": types.LibraryThumbnailSelectorUpdateDocument,
    "\n\tmutation LibraryThumbnailSelectorUpload($id: ID!, $file: Upload!) {\n\t\tuploadLibraryThumbnail(id: $id, file: $file) {\n\t\t\tid\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n": types.LibraryThumbnailSelectorUploadDocument,
    "\n\tmutation RegenerateThumbnails($id: ID!, $forceRegenerate: Boolean!) {\n\t\tgenerateLibraryThumbnails(id: $id, forceRegenerate: $forceRegenerate)\n\t}\n": types.RegenerateThumbnailsDocument,
    "\n\tquery SeriesLayout($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tpath\n\t\t\tlibrary {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t\tresolvedName\n\t\t\tresolvedDescription\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": types.SeriesLayoutDocument,
    "\n\tquery SeriesLibrayLink($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": types.SeriesLibrayLinkDocument,
    "\n\tquery SeriesBooksScene($filter: MediaFilterInput!, $pagination: Pagination!) {\n\t\tmedia(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.SeriesBooksSceneDocument,
    "\n\tquery SeriesBookGrid($id: String!, $pagination: Pagination) {\n\t\tmedia(filter: { seriesId: { eq: $id } }, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\tpages\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.SeriesBookGridDocument,
    "\n\tquery APIKeyTable {\n\t\tapiKeys {\n\t\t\tid\n\t\t\tname\n\t\t\tpermissions {\n\t\t\t\t__typename\n\t\t\t\t... on UserPermissionStruct {\n\t\t\t\t\tvalue\n\t\t\t\t}\n\t\t\t}\n\t\t\tlastUsedAt\n\t\t\texpiresAt\n\t\t\tcreatedAt\n\t\t}\n\t}\n": types.ApiKeyTableDocument,
    "\n\tmutation CreateAPIKeyModal($input: ApikeyInput!) {\n\t\tcreateApiKey(input: $input) {\n\t\t\tapiKey {\n\t\t\t\tid\n\t\t\t}\n\t\t\tsecret\n\t\t}\n\t}\n": types.CreateApiKeyModalDocument,
    "\n\tmutation DeleteAPIKeyConfirmModal($id: Int!) {\n\t\tdeleteApiKey(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": types.DeleteApiKeyConfirmModalDocument,
    "\n\tmutation UpdateUserLocaleSelector($input: UpdateUserPreferencesInput!) {\n\t\tupdateViewerPreferences(input: $input) {\n\t\t\tlocale\n\t\t}\n\t}\n": types.UpdateUserLocaleSelectorDocument,
    "\n\tmutation UpdateUserProfileForm($input: UpdateUserInput!) {\n\t\tupdateViewer(input: $input) {\n\t\t\tid\n\t\t\tusername\n\t\t\tavatarUrl\n\t\t}\n\t}\n": types.UpdateUserProfileFormDocument,
    "\n\tquery CreateEmailerSceneEmailers {\n\t\temailers {\n\t\t\tname\n\t\t}\n\t}\n": types.CreateEmailerSceneEmailersDocument,
    "\n\tmutation CreateEmailerSceneCreateEmailer($input: EmailerInput!) {\n\t\tcreateEmailer(input: $input) {\n\t\t\tid\n\t\t}\n\t}\n": types.CreateEmailerSceneCreateEmailerDocument,
    "\n\tquery EditEmailerScene($id: Int!) {\n\t\temailers {\n\t\t\tname\n\t\t}\n\t\temailerById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tisPrimary\n\t\t\tsmtpHost\n\t\t\tsmtpPort\n\t\t\tlastUsedAt\n\t\t\tmaxAttachmentSizeBytes\n\t\t\tsenderDisplayName\n\t\t\tsenderEmail\n\t\t\ttlsEnabled\n\t\t\tusername\n\t\t}\n\t}\n": types.EditEmailerSceneDocument,
    "\n\tmutation EditEmailerSceneEditEmailer($id: Int!, $input: EmailerInput!) {\n\t\tupdateEmailer(id: $id, input: $input) {\n\t\t\tid\n\t\t}\n\t}\n": types.EditEmailerSceneEditEmailerDocument,
    "\n\tmutation CreateOrUpdateDeviceModalCreateEmailDevice($input: EmailDeviceInput!) {\n\t\tcreateEmailDevice(input: $input) {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": types.CreateOrUpdateDeviceModalCreateEmailDeviceDocument,
    "\n\tmutation CreateOrUpdateDeviceModalUpdateEmailDevice($id: Int!, $input: EmailDeviceInput!) {\n\t\tupdateEmailDevice(id: $id, input: $input) {\n\t\t\tid\n\t\t\tname\n\t\t\tforbidden\n\t\t}\n\t}\n": types.CreateOrUpdateDeviceModalUpdateEmailDeviceDocument,
    "\n\tmutation DeleteDeviceConfirmationDeleteEmailDevice($id: Int!) {\n\t\tdeleteEmailDevice(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": types.DeleteDeviceConfirmationDeleteEmailDeviceDocument,
    "\n\tquery EmailDevicesTable {\n\t\temailDevices {\n\t\t\tid\n\t\t\tname\n\t\t\temail\n\t\t\tforbidden\n\t\t}\n\t}\n": types.EmailDevicesTableDocument,
    "\n\tfragment EmailerListItem on Emailer {\n\t\tid\n\t\tname\n\t\tisPrimary\n\t\tsmtpHost\n\t\tsmtpPort\n\t\tlastUsedAt\n\t\tmaxAttachmentSizeBytes\n\t\tsenderDisplayName\n\t\tsenderEmail\n\t\ttlsEnabled\n\t\tusername\n\t}\n": types.EmailerListItemFragmentDoc,
    "\n\tquery EmailerSendHistory($id: Int!, $fetchUser: Boolean!) {\n\t\temailerById(id: $id) {\n\t\t\tsendHistory {\n\t\t\t\tsentAt\n\t\t\t\trecipientEmail\n\t\t\t\tsentByUserId\n\t\t\t\tsentBy @include(if: $fetchUser) {\n\t\t\t\t\tid\n\t\t\t\t\tusername\n\t\t\t\t}\n\t\t\t\tattachmentMeta {\n\t\t\t\t\tfilename\n\t\t\t\t\tmediaId\n\t\t\t\t\tmedia {\n\t\t\t\t\t\tresolvedName\n\t\t\t\t\t}\n\t\t\t\t\tsize\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.EmailerSendHistoryDocument,
    "\n\tquery EmailersList {\n\t\temailers {\n\t\t\tid\n\t\t\t...EmailerListItem\n\t\t}\n\t}\n": types.EmailersListDocument,
    "\n\tmutation DeleteJobHistoryConfirmation {\n\t\tdeleteJobHistory {\n\t\t\taffectedRows\n\t\t}\n\t}\n": types.DeleteJobHistoryConfirmationDocument,
    "\n\tmutation JobActionMenuCancelJob($id: ID!) {\n\t\tcancelJob(id: $id)\n\t}\n": types.JobActionMenuCancelJobDocument,
    "\n\tmutation JobActionMenuDeleteJob($id: ID!) {\n\t\tcancelJob(id: $id)\n\t}\n": types.JobActionMenuDeleteJobDocument,
    "\n\tmutation JobActionMenuDeleteLogs($id: ID!) {\n\t\tdeleteJobLogs(id: $id) {\n\t\t\taffectedRows\n\t\t}\n\t}\n": types.JobActionMenuDeleteLogsDocument,
    "\n\tfragment JobDataInspector on CoreJobOutput {\n\t\t__typename\n\t\t... on LibraryScanOutput {\n\t\t\ttotalFiles\n\t\t\ttotalDirectories\n\t\t\tignoredFiles\n\t\t\tskippedFiles\n\t\t\tignoredDirectories\n\t\t\tcreatedMedia\n\t\t\tupdatedMedia\n\t\t\tcreatedSeries\n\t\t\tupdatedSeries\n\t\t}\n\t\t... on SeriesScanOutput {\n\t\t\ttotalFiles\n\t\t\tignoredFiles\n\t\t\tskippedFiles\n\t\t\tcreatedMedia\n\t\t\tupdatedMedia\n\t\t}\n\t\t... on ThumbnailGenerationOutput {\n\t\t\tvisitedFiles\n\t\t\tskippedFiles\n\t\t\tgeneratedThumbnails\n\t\t\tremovedThumbnails\n\t\t}\n\t\t... on ExternalJobOutput {\n\t\t\tval\n\t\t}\n\t}\n": types.JobDataInspectorFragmentDoc,
    "\n\tquery JobSchedulerConfig {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\temoji\n\t\t\t}\n\t\t}\n\t\tscheduledJobConfigs {\n\t\t\tid\n\t\t\tintervalSecs\n\t\t\t# Note: For now scanConfigs are actually just a library node\n\t\t\tscanConfigs {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": types.JobSchedulerConfigDocument,
    "\n\tmutation JobSchedulerUpdate($id: Int!, $input: ScheduledJobConfigInput!) {\n\t\tupdateScheduledJobConfig(id: $id, input: $input) {\n\t\t\tid\n\t\t\tintervalSecs\n\t\t\tscanConfigs {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": types.JobSchedulerUpdateDocument,
    "\n\tmutation JobSchedulerDelete($id: Int!) {\n\t\tdeleteScheduledJobConfig(id: $id)\n\t}\n": types.JobSchedulerDeleteDocument,
    "\n\tmutation JobSchedulerCreate($input: ScheduledJobConfigInput!) {\n\t\tcreateScheduledJobConfig(input: $input) {\n\t\t\tid\n\t\t\tintervalSecs\n\t\t\tscanConfigs {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": types.JobSchedulerCreateDocument,
    "\n\tquery JobTable($pagination: Pagination!) {\n\t\tjobs(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tdescription\n\t\t\t\tstatus\n\t\t\t\tcreatedAt\n\t\t\t\tcompletedAt\n\t\t\t\tmsElapsed\n\t\t\t\toutputData {\n\t\t\t\t\t...JobDataInspector\n\t\t\t\t}\n\t\t\t\tlogCount\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.JobTableDocument,
    "\n\tsubscription LiveLogsFeed {\n\t\ttailLogFile\n\t}\n": types.LiveLogsFeedDocument,
    "\n\tmutation DeleteLogs {\n\t\tdeleteLogs {\n\t\t\tdeleted\n\t\t}\n\t}\n": types.DeleteLogsDocument,
    "\n\tquery PersistedLogs(\n\t\t$filter: LogFilterInput!\n\t\t$pagination: Pagination!\n\t\t$orderBy: [LogModelOrderBy!]!\n\t) {\n\t\tlogs(filter: $filter, pagination: $pagination, orderBy: $orderBy) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\ttimestamp\n\t\t\t\tlevel\n\t\t\t\tmessage\n\t\t\t\tjobId\n\t\t\t\tcontext\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\ttotalPages\n\t\t\t\t\tcurrentPage\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.PersistedLogsDocument,
    "\n\tmutation CreateOrUpdateUserFormUpdateUser($id: ID!, $input: UpdateUserInput!) {\n\t\tupdateUser(id: $id, input: $input) {\n\t\t\tid\n\t\t\tusername\n\t\t\tageRestriction {\n\t\t\t\tage\n\t\t\t\trestrictOnUnset\n\t\t\t}\n\t\t\tpermissions\n\t\t\tmaxSessionsAllowed\n\t\t}\n\t}\n": types.CreateOrUpdateUserFormUpdateUserDocument,
    "\n\tmutation CreateOrUpdateUserFormCreateUser($input: CreateUserInput!) {\n\t\tcreateUser(input: $input) {\n\t\t\tid\n\t\t}\n\t}\n": types.CreateOrUpdateUserFormCreateUserDocument,
    "\n\tquery CreateUserScene {\n\t\tusers(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n": types.CreateUserSceneDocument,
    "\n\tquery UpdateUserScene($id: ID!, $skip: Boolean!) {\n\t\tme {\n\t\t\tid\n\t\t}\n\t\tuserById(id: $id) @skip(if: $skip) {\n\t\t\tid\n\t\t\tavatarUrl\n\t\t\tusername\n\t\t\tageRestriction {\n\t\t\t\tage\n\t\t\t\trestrictOnUnset\n\t\t\t}\n\t\t\tpermissions\n\t\t\tmaxSessionsAllowed\n\t\t\tisServerOwner\n\t\t}\n\t\tusers(pagination: { none: { unpaginated: true } }) @skip(if: $skip) {\n\t\t\tnodes {\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n": types.UpdateUserSceneDocument,
    "\n\tmutation ClearLoginActivityConfirmation {\n\t\tdeleteLoginActivity\n\t}\n": types.ClearLoginActivityConfirmationDocument,
    "\n\tquery LoginActivityTable {\n\t\tloginActivity {\n\t\t\tid\n\t\t\tipAddress\n\t\t\tuserAgent\n\t\t\tauthenticationSuccessful\n\t\t\ttimestamp\n\t\t\tuser {\n\t\t\t\tid\n\t\t\t\tusername\n\t\t\t\tavatarUrl\n\t\t\t}\n\t\t}\n\t}\n": types.LoginActivityTableDocument,
    "\n\tmutation DeleteUser($id: ID!, $hardDelete: Boolean) {\n\t\tdeleteUser(id: $id, hardDelete: $hardDelete) {\n\t\t\tid\n\t\t}\n\t}\n": types.DeleteUserDocument,
    "\n\tmutation UserActionMenuLockUser($id: ID!, $lock: Boolean!) {\n\t\tupdateUserLockStatus(id: $id, lock: $lock) {\n\t\t\tid\n\t\t\tisLocked\n\t\t}\n\t}\n": types.UserActionMenuLockUserDocument,
    "\n\tmutation UserActionMenuDeleteUserSessions($id: ID!) {\n\t\tdeleteUserSessions(id: $id)\n\t}\n": types.UserActionMenuDeleteUserSessionsDocument,
    "\n\tquery UserTable($pagination: Pagination!) {\n\t\tusers(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tavatarUrl\n\t\t\t\tusername\n\t\t\t\tisServerOwner\n\t\t\t\tisLocked\n\t\t\t\tcreatedAt\n\t\t\t\tlastLogin\n\t\t\t\tloginSessionsCount\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\ttotalPages\n\t\t\t\t\tcurrentPage\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.UserTableDocument,
    "\n\tmutation CreateSmartListView($input: SaveSmartListView!) {\n\t\tcreateSmartListView(input: $input) {\n\t\t\tid\n\t\t\tlistId\n\t\t\tname\n\t\t\tbookColumns {\n\t\t\t\tid\n\t\t\t\tposition\n\t\t\t}\n\t\t\tbookSorting {\n\t\t\t\tid\n\t\t\t\tdesc\n\t\t\t}\n\t\t\tgroupColumns {\n\t\t\t\tid\n\t\t\t\tposition\n\t\t\t}\n\t\t\tgroupSorting {\n\t\t\t\tid\n\t\t\t\tdesc\n\t\t\t}\n\t\t}\n\t}\n": types.CreateSmartListViewDocument,
    "\n\tmutation UpdateSmartListView($originalName: String!, $input: SaveSmartListView!) {\n\t\tupdateSmartListView(originalName: $originalName, input: $input) {\n\t\t\tid\n\t\t\tlistId\n\t\t\tname\n\t\t\tbookColumns {\n\t\t\t\tid\n\t\t\t\tposition\n\t\t\t}\n\t\t\tbookSorting {\n\t\t\t\tid\n\t\t\t\tdesc\n\t\t\t}\n\t\t\tgroupColumns {\n\t\t\t\tid\n\t\t\t\tposition\n\t\t\t}\n\t\t\tgroupSorting {\n\t\t\t\tid\n\t\t\t\tdesc\n\t\t\t}\n\t\t}\n\t}\n": types.UpdateSmartListViewDocument,
    "\n\tquery SmartListsWithSearch($input: SmartListsInput!) {\n\t\tsmartLists(input: $input) {\n\t\t\tid\n\t\t\tcreatorId\n\t\t\tdescription\n\t\t\tdefaultGrouping\n\t\t\tfilters\n\t\t\tjoiner\n\t\t\tname\n\t\t\tvisibility\n\t\t}\n\t}\n": types.SmartListsWithSearchDocument,
    "\n\tquery SmartListBasicSettingsScene {\n\t\tsmartLists(input: { mine: true }) {\n\t\t\tname\n\t\t}\n\t}\n": types.SmartListBasicSettingsSceneDocument,
    "\n\tmutation DeleteSmartList($id: ID!) {\n\t\tdeleteSmartList(id: $id) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.DeleteSmartListDocument,
    "\n\tquery SmartListById($id: ID!) {\n\t\tsmartListById(id: $id) {\n\t\t\tid\n\t\t\tcreatorId\n\t\t\tdescription\n\t\t\tdefaultGrouping\n\t\t\tfilters\n\t\t\tjoiner\n\t\t\tname\n\t\t\tvisibility\n\t\t\tviews {\n\t\t\t\tid\n\t\t\t\tlistId\n\t\t\t\tname\n\t\t\t\tbookColumns {\n\t\t\t\t\tid\n\t\t\t\t\tposition\n\t\t\t\t}\n\t\t\t\tbookSorting {\n\t\t\t\t\tid\n\t\t\t\t\tdesc\n\t\t\t\t}\n\t\t\t\tgroupColumns {\n\t\t\t\t\tid\n\t\t\t\t\tposition\n\t\t\t\t}\n\t\t\t\tgroupSorting {\n\t\t\t\t\tid\n\t\t\t\t\tdesc\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.SmartListByIdDocument,
    "\n\tquery SmartListMeta($id: ID!) {\n\t\tsmartListMeta(id: $id) {\n\t\t\tmatchedBooks\n\t\t\tmatchedSeries\n\t\t\tmatchedLibraries\n\t\t}\n\t}\n": types.SmartListMetaDocument,
    "\n\tmutation UpdateSmartList($id: ID!, $input: SaveSmartListInput!) {\n\t\tupdateSmartList(id: $id, input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.UpdateSmartListDocument,
    "\n\tquery SmartListItems($id: ID!) {\n\t\tsmartListItems(id: $id) {\n\t\t\t__typename\n\t\t\t... on SmartListGrouped {\n\t\t\t\titems {\n\t\t\t\t\tentity {\n\t\t\t\t\t\t__typename\n\t\t\t\t\t\t... on Series {\n\t\t\t\t\t\t\tid\n\t\t\t\t\t\t\tname\n\t\t\t\t\t\t}\n\t\t\t\t\t\t... on Library {\n\t\t\t\t\t\t\tid\n\t\t\t\t\t\t\tname\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t\tbooks {\n\t\t\t\t\t\t...BookCard\n\t\t\t\t\t\tmetadata {\n\t\t\t\t\t\t\tageRating\n\t\t\t\t\t\t\tcharacters\n\t\t\t\t\t\t\tcolorists\n\t\t\t\t\t\t\tcoverArtists\n\t\t\t\t\t\t\teditors\n\t\t\t\t\t\t\tgenres\n\t\t\t\t\t\t\tinkers\n\t\t\t\t\t\t\tletterers\n\t\t\t\t\t\t\tlinks\n\t\t\t\t\t\t\tpencillers\n\t\t\t\t\t\t\tpublisher\n\t\t\t\t\t\t\tteams\n\t\t\t\t\t\t\twriters\n\t\t\t\t\t\t\tyear\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t\t... on SmartListUngrouped {\n\t\t\t\tbooks {\n\t\t\t\t\t...BookCard\n\t\t\t\t\tmetadata {\n\t\t\t\t\t\tageRating\n\t\t\t\t\t\tcharacters\n\t\t\t\t\t\tcolorists\n\t\t\t\t\t\tcoverArtists\n\t\t\t\t\t\teditors\n\t\t\t\t\t\tgenres\n\t\t\t\t\t\tinkers\n\t\t\t\t\t\tletterers\n\t\t\t\t\t\tlinks\n\t\t\t\t\t\tpencillers\n\t\t\t\t\t\tpublisher\n\t\t\t\t\t\tteams\n\t\t\t\t\t\twriters\n\t\t\t\t\t\tyear\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.SmartListItemsDocument,
    "\n\tquery DirectoryListing($input: DirectoryListingInput!, $pagination: Pagination!) {\n\t\tlistDirectory(input: $input, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tparent\n\t\t\t\tfiles {\n\t\t\t\t\tname\n\t\t\t\t\tpath\n\t\t\t\t\tisDirectory\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.DirectoryListingDocument,
    "\n\tquery UploadConfig {\n\t\tuploadConfig {\n\t\t\tenabled\n\t\t\tmaxFileUploadSize\n\t\t}\n\t}\n": types.UploadConfigDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery TagSelectQuery {\n\t\ttags {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n"): typeof import('./graphql').TagSelectQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tfragment BookCard on Media {\n\t\tid\n\t\tresolvedName\n\t\textension\n\t\tpages\n\t\tsize\n\t\tstatus\n\t\tthumbnail {\n\t\t\turl\n\t\t}\n\t\treadProgress {\n\t\t\tpercentageCompleted\n\t\t\tepubcfi\n\t\t\tpage\n\t\t}\n\t\treadHistory {\n\t\t\t__typename\n\t\t\tcompletedAt\n\t\t}\n\t}\n"): typeof import('./graphql').BookCardFragmentDoc;
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
export function graphql(source: "\n\tquery MediaFilterForm($seriesId: ID) {\n\t\tmediaMetadataOverview(seriesId: $seriesId) {\n\t\t\tgenres\n\t\t\twriters\n\t\t\tpencillers\n\t\t\tcolorists\n\t\t\tletterers\n\t\t\tinkers\n\t\t\tpublishers\n\t\t\teditors\n\t\t\tcharacters\n\t\t}\n\t}\n"): typeof import('./graphql').MediaFilterFormDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation DeleteLibrary($id: ID!) {\n\t\tdeleteLibrary(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"): typeof import('./graphql').DeleteLibraryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery LastVisitedLibrary {\n\t\tlastVisitedLibrary {\n\t\t\tid\n\t\t\tname\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').LastVisitedLibraryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SideBarQuery {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t\t... on SystemArrangmentConfig {\n\t\t\t\t\t\t\t\tvariant\n\t\t\t\t\t\t\t\tlinks\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t\tvisible\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').SideBarQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation UpdateLibraryEmoji($id: ID!, $emoji: String) {\n\t\tupdateLibraryEmoji(id: $id, emoji: $emoji) {\n\t\t\tid\n\t\t}\n\t}\n"): typeof import('./graphql').UpdateLibraryEmojiDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation ScanLibraryMutation($id: ID!) {\n\t\tscanLibrary(id: $id)\n\t}\n"): typeof import('./graphql').ScanLibraryMutationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery LibrarySideBarSection {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\temoji\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').LibrarySideBarSectionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery TopNavigation {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t\t... on SystemArrangmentConfig {\n\t\t\t\t\t\t\t\tvariant\n\t\t\t\t\t\t\t\tlinks\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t\tvisible\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').TopNavigationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery LibraryNavigationItem {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\temoji\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').LibraryNavigationItemDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery EpubJsReader($id: ID!) {\n\t\tepubById(id: $id) {\n\t\t\tmediaId\n\t\t\trootBase\n\t\t\trootFile\n\t\t\textraCss\n\t\t\ttoc\n\t\t\tresources\n\t\t\tmetadata\n\t\t\tspine {\n\t\t\t\tid\n\t\t\t\tidref\n\t\t\t\tproperties\n\t\t\t\tlinear\n\t\t\t}\n\t\t\tbookmarks {\n\t\t\t\tid\n\t\t\t\tuserId\n\t\t\t\tepubcfi\n\t\t\t\tmediaId\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').EpubJsReaderDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation UpdateEpubProgress($input: EpubProgressInput!) {\n\t\tupdateEpubProgress(input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n"): typeof import('./graphql').UpdateEpubProgressDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CreateOrUpdateBookmark($input: BookmarkInput!) {\n\t\tcreateOrUpdateBookmark(input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n"): typeof import('./graphql').CreateOrUpdateBookmarkDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation DeleteBookmark($epubcfi: String!) {\n\t\tdeleteBookmark(epubcfi: $epubcfi) {\n\t\t\t__typename\n\t\t}\n\t}\n"): typeof import('./graphql').DeleteBookmarkDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation UsePreferences($input: UpdateUserPreferencesInput!) {\n\t\tupdateViewerPreferences(input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n"): typeof import('./graphql').UsePreferencesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation BookCompletionToggleButtonComplete($id: ID!, $isComplete: Boolean!, $page: Int) {\n\t\tmarkMediaAsComplete(id: $id, isComplete: $isComplete, page: $page) {\n\t\t\tcompletedAt\n\t\t}\n\t}\n"): typeof import('./graphql').BookCompletionToggleButtonCompleteDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation BookCompletionToggleButtonDeleteSession($id: ID!) {\n\t\tdeleteMediaProgress(id: $id) {\n\t\t\t__typename\n\t\t}\n\t}\n"): typeof import('./graphql').BookCompletionToggleButtonDeleteSessionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tfragment BookFileInformation on Media {\n\t\tid\n\t\tsize\n\t\textension\n\t\thash\n\t\trelativeLibraryPath\n\t}\n"): typeof import('./graphql').BookFileInformationFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery BookLibrarySeriesLinks($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tlibraryId\n\t\t}\n\t}\n"): typeof import('./graphql').BookLibrarySeriesLinksDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery BookOverviewScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\t...BookCard\n\t\t\t...BookFileInformation\n\t\t\tresolvedName\n\t\t\textension\n\t\t\tmetadata {\n\t\t\t\tlinks\n\t\t\t\tsummary\n\t\t\t}\n\t\t\treadHistory {\n\t\t\t\tcompletedAt\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').BookOverviewSceneDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery BookOverviewHeader($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tseriesId\n\t\t\textension\n\t\t\tpages\n\t\t\tmetadata {\n\t\t\t\tageRating\n\t\t\t\tgenres\n\t\t\t\tpublisher\n\t\t\t\twriters\n\t\t\t\tyear\n\t\t\t}\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').BookOverviewHeaderDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery BooksAfterCurrentQuery($id: ID!, $pagination: Pagination) {\n\t\tmediaById(id: $id) {\n\t\t\tnextInSeries(pagination: $pagination) {\n\t\t\t\tnodes {\n\t\t\t\t\tid\n\t\t\t\t\t...BookCard\n\t\t\t\t}\n\t\t\t\tpageInfo {\n\t\t\t\t\t__typename\n\t\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\t\tcurrentCursor\n\t\t\t\t\t\tnextCursor\n\t\t\t\t\t\tlimit\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').BooksAfterCurrentQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery EmailBookDropdownDevice {\n\t\temailDevices {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n"): typeof import('./graphql').EmailBookDropdownDeviceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation SendEmailAttachment($id: ID!, $sendTo: [EmailerSendTo!]!) {\n\t\tsendAttachmentEmail(input: { mediaIds: [$id], sendTo: $sendTo }) {\n\t\t\tsentCount\n\t\t\terrors\n\t\t}\n\t}\n"): typeof import('./graphql').SendEmailAttachmentDocument;
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
export function graphql(source: "\n\tquery BookSearchScene(\n\t\t$filter: MediaFilterInput!\n\t\t$orderBy: [MediaOrderBy!]!\n\t\t$pagination: Pagination!\n\t) {\n\t\tmedia(filter: $filter, orderBy: $orderBy, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').BookSearchSceneDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery CreateLibrarySceneExistingLibraries {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tpath\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').CreateLibrarySceneExistingLibrariesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CreateLibrarySceneCreateLibrary($input: CreateOrUpdateLibraryInput!) {\n\t\tcreateLibrary(input: $input) {\n\t\t\tid\n\t\t}\n\t}\n"): typeof import('./graphql').CreateLibrarySceneCreateLibraryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery CreateSmartListForm {\n\t\tsmartLists(input: { mine: true }) {\n\t\t\tname\n\t\t}\n\t}\n"): typeof import('./graphql').CreateSmartListFormDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CreateSmartListScene($input: SaveSmartListInput!) {\n\t\tcreateSmartList(input: $input) {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n"): typeof import('./graphql').CreateSmartListSceneDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery ContinueReadingMediaQuery($pagination: Pagination!) {\n\t\tkeepReading(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').ContinueReadingMediaQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery HomeSceneQuery {\n\t\tnumberOfLibraries\n\t}\n"): typeof import('./graphql').HomeSceneQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery RecentlyAddedMediaQuery($pagination: Pagination!) {\n\t\trecentlyAddedMedia(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').RecentlyAddedMediaQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery RecentlyAddedSeriesQuery($pagination: Pagination!) {\n\t\trecentlyAddedSeries(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').RecentlyAddedSeriesQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery LibraryLayout($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tdescription\n\t\t\tpath\n\t\t\tstats {\n\t\t\t\tbookCount\n\t\t\t\tcompletedBooks\n\t\t\t\tinProgressBooks\n\t\t\t}\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t\t...LibrarySettingsConfig\n\t\t}\n\t}\n"): typeof import('./graphql').LibraryLayoutDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation VisitLibrary($id: ID!) {\n\t\tvisitLibrary(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"): typeof import('./graphql').VisitLibraryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery LibraryBooksScene($filter: MediaFilterInput!, $pagination: Pagination!) {\n\t\tmedia(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').LibraryBooksSceneDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery LibrarySeries($filter: SeriesFilterInput!, $pagination: Pagination!) {\n\t\tseries(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\ttotalPages\n\t\t\t\t\tcurrentPage\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').LibrarySeriesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery LibrarySeriesGrid($id: String!, $pagination: Pagination) {\n\t\tseries(filter: { libraryId: { eq: $id } }, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').LibrarySeriesGridDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tfragment LibrarySettingsConfig on Library {\n\t\tconfig {\n\t\t\tid\n\t\t\tconvertRarToZip\n\t\t\thardDeleteConversions\n\t\t\tdefaultReadingDir\n\t\t\tdefaultReadingMode\n\t\t\tdefaultReadingImageScaleFit\n\t\t\tgenerateFileHashes\n\t\t\tgenerateKoreaderHashes\n\t\t\tprocessMetadata\n\t\t\twatch\n\t\t\tlibraryPattern\n\t\t\tthumbnailConfig {\n\t\t\t\t__typename\n\t\t\t\tresizeMethod {\n\t\t\t\t\t__typename\n\t\t\t\t\t... on ScaleEvenlyByFactor {\n\t\t\t\t\t\tfactor\n\t\t\t\t\t}\n\t\t\t\t\t... on ExactDimensionResize {\n\t\t\t\t\t\twidth\n\t\t\t\t\t\theight\n\t\t\t\t\t}\n\t\t\t\t\t... on ScaledDimensionResize {\n\t\t\t\t\t\tdimension\n\t\t\t\t\t\tsize\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\tformat\n\t\t\t\tquality\n\t\t\t\tpage\n\t\t\t}\n\t\t\tignoreRules\n\t\t}\n\t}\n"): typeof import('./graphql').LibrarySettingsConfigFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation LibrarySettingsRouterEditLibraryMutation($id: ID!, $input: CreateOrUpdateLibraryInput!) {\n\t\tupdateLibrary(id: $id, input: $input) {\n\t\t\tid\n\t\t}\n\t}\n"): typeof import('./graphql').LibrarySettingsRouterEditLibraryMutationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation LibrarySettingsRouterScanLibraryMutation($id: ID!, $options: JSON) {\n\t\tscanLibrary(id: $id, options: $options)\n\t}\n"): typeof import('./graphql').LibrarySettingsRouterScanLibraryMutationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery LibraryExclusionsUsersQuery {\n\t\tusers(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').LibraryExclusionsUsersQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery LibraryExclusionsQuery($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\texcludedUsers {\n\t\t\t\tid\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').LibraryExclusionsQueryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation UpdateLibraryExclusions($id: ID!, $userIds: [String!]!) {\n\t\tupdateLibraryExcludedUsers(id: $id, userIds: $userIds) {\n\t\t\tid\n\t\t\texcludedUsers {\n\t\t\t\tid\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').UpdateLibraryExclusionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CleanLibrary($id: ID!) {\n\t\tcleanLibrary(id: $id) {\n\t\t\tdeletedMediaCount\n\t\t\tdeletedSeriesCount\n\t\t\tisEmpty\n\t\t}\n\t}\n"): typeof import('./graphql').CleanLibraryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation AnalyzeLibraryMedia($id: ID!) {\n\t\tanalyzeMedia(id: $id)\n\t}\n"): typeof import('./graphql').AnalyzeLibraryMediaDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation ScanHistorySectionClearHistory($id: ID!) {\n\t\tclearScanHistory(id: $id)\n\t}\n"): typeof import('./graphql').ScanHistorySectionClearHistoryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery ScanHistoryTable($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tscanHistory {\n\t\t\t\tid\n\t\t\t\tjobId\n\t\t\t\ttimestamp\n\t\t\t\toptions\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').ScanHistoryTableDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery ScanRecordInspectorJobs($id: ID!, $loadLogs: Boolean!) {\n\t\tjobById(id: $id) {\n\t\t\tid\n\t\t\toutputData {\n\t\t\t\t__typename\n\t\t\t\t... on LibraryScanOutput {\n\t\t\t\t\ttotalFiles\n\t\t\t\t\ttotalDirectories\n\t\t\t\t\tignoredFiles\n\t\t\t\t\tskippedFiles\n\t\t\t\t\tignoredDirectories\n\t\t\t\t\tcreatedMedia\n\t\t\t\t\tupdatedMedia\n\t\t\t\t\tcreatedSeries\n\t\t\t\t\tupdatedSeries\n\t\t\t\t}\n\t\t\t}\n\t\t\tlogs @include(if: $loadLogs) {\n\t\t\t\tid\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').ScanRecordInspectorJobsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation DeleteLibraryThumbnails($id: ID!) {\n\t\tdeleteLibraryThumbnails(id: $id)\n\t}\n"): typeof import('./graphql').DeleteLibraryThumbnailsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation LibraryThumbnailSelectorUpdate($id: ID!, $input: UpdateLibraryThumbnailInput!) {\n\t\tupdateLibraryThumbnail(id: $id, input: $input) {\n\t\t\tid\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').LibraryThumbnailSelectorUpdateDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation LibraryThumbnailSelectorUpload($id: ID!, $file: Upload!) {\n\t\tuploadLibraryThumbnail(id: $id, file: $file) {\n\t\t\tid\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').LibraryThumbnailSelectorUploadDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation RegenerateThumbnails($id: ID!, $forceRegenerate: Boolean!) {\n\t\tgenerateLibraryThumbnails(id: $id, forceRegenerate: $forceRegenerate)\n\t}\n"): typeof import('./graphql').RegenerateThumbnailsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SeriesLayout($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tpath\n\t\t\tlibrary {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t\tresolvedName\n\t\t\tresolvedDescription\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').SeriesLayoutDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SeriesLibrayLink($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n"): typeof import('./graphql').SeriesLibrayLinkDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SeriesBooksScene($filter: MediaFilterInput!, $pagination: Pagination!) {\n\t\tmedia(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\t...BookCard\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').SeriesBooksSceneDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SeriesBookGrid($id: String!, $pagination: Pagination) {\n\t\tmedia(filter: { seriesId: { eq: $id } }, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\tpages\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').SeriesBookGridDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery APIKeyTable {\n\t\tapiKeys {\n\t\t\tid\n\t\t\tname\n\t\t\tpermissions {\n\t\t\t\t__typename\n\t\t\t\t... on UserPermissionStruct {\n\t\t\t\t\tvalue\n\t\t\t\t}\n\t\t\t}\n\t\t\tlastUsedAt\n\t\t\texpiresAt\n\t\t\tcreatedAt\n\t\t}\n\t}\n"): typeof import('./graphql').ApiKeyTableDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CreateAPIKeyModal($input: ApikeyInput!) {\n\t\tcreateApiKey(input: $input) {\n\t\t\tapiKey {\n\t\t\t\tid\n\t\t\t}\n\t\t\tsecret\n\t\t}\n\t}\n"): typeof import('./graphql').CreateApiKeyModalDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation DeleteAPIKeyConfirmModal($id: Int!) {\n\t\tdeleteApiKey(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"): typeof import('./graphql').DeleteApiKeyConfirmModalDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation UpdateUserLocaleSelector($input: UpdateUserPreferencesInput!) {\n\t\tupdateViewerPreferences(input: $input) {\n\t\t\tlocale\n\t\t}\n\t}\n"): typeof import('./graphql').UpdateUserLocaleSelectorDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation UpdateUserProfileForm($input: UpdateUserInput!) {\n\t\tupdateViewer(input: $input) {\n\t\t\tid\n\t\t\tusername\n\t\t\tavatarUrl\n\t\t}\n\t}\n"): typeof import('./graphql').UpdateUserProfileFormDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery CreateEmailerSceneEmailers {\n\t\temailers {\n\t\t\tname\n\t\t}\n\t}\n"): typeof import('./graphql').CreateEmailerSceneEmailersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CreateEmailerSceneCreateEmailer($input: EmailerInput!) {\n\t\tcreateEmailer(input: $input) {\n\t\t\tid\n\t\t}\n\t}\n"): typeof import('./graphql').CreateEmailerSceneCreateEmailerDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery EditEmailerScene($id: Int!) {\n\t\temailers {\n\t\t\tname\n\t\t}\n\t\temailerById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tisPrimary\n\t\t\tsmtpHost\n\t\t\tsmtpPort\n\t\t\tlastUsedAt\n\t\t\tmaxAttachmentSizeBytes\n\t\t\tsenderDisplayName\n\t\t\tsenderEmail\n\t\t\ttlsEnabled\n\t\t\tusername\n\t\t}\n\t}\n"): typeof import('./graphql').EditEmailerSceneDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation EditEmailerSceneEditEmailer($id: Int!, $input: EmailerInput!) {\n\t\tupdateEmailer(id: $id, input: $input) {\n\t\t\tid\n\t\t}\n\t}\n"): typeof import('./graphql').EditEmailerSceneEditEmailerDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CreateOrUpdateDeviceModalCreateEmailDevice($input: EmailDeviceInput!) {\n\t\tcreateEmailDevice(input: $input) {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n"): typeof import('./graphql').CreateOrUpdateDeviceModalCreateEmailDeviceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CreateOrUpdateDeviceModalUpdateEmailDevice($id: Int!, $input: EmailDeviceInput!) {\n\t\tupdateEmailDevice(id: $id, input: $input) {\n\t\t\tid\n\t\t\tname\n\t\t\tforbidden\n\t\t}\n\t}\n"): typeof import('./graphql').CreateOrUpdateDeviceModalUpdateEmailDeviceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation DeleteDeviceConfirmationDeleteEmailDevice($id: Int!) {\n\t\tdeleteEmailDevice(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"): typeof import('./graphql').DeleteDeviceConfirmationDeleteEmailDeviceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery EmailDevicesTable {\n\t\temailDevices {\n\t\t\tid\n\t\t\tname\n\t\t\temail\n\t\t\tforbidden\n\t\t}\n\t}\n"): typeof import('./graphql').EmailDevicesTableDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tfragment EmailerListItem on Emailer {\n\t\tid\n\t\tname\n\t\tisPrimary\n\t\tsmtpHost\n\t\tsmtpPort\n\t\tlastUsedAt\n\t\tmaxAttachmentSizeBytes\n\t\tsenderDisplayName\n\t\tsenderEmail\n\t\ttlsEnabled\n\t\tusername\n\t}\n"): typeof import('./graphql').EmailerListItemFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery EmailerSendHistory($id: Int!, $fetchUser: Boolean!) {\n\t\temailerById(id: $id) {\n\t\t\tsendHistory {\n\t\t\t\tsentAt\n\t\t\t\trecipientEmail\n\t\t\t\tsentByUserId\n\t\t\t\tsentBy @include(if: $fetchUser) {\n\t\t\t\t\tid\n\t\t\t\t\tusername\n\t\t\t\t}\n\t\t\t\tattachmentMeta {\n\t\t\t\t\tfilename\n\t\t\t\t\tmediaId\n\t\t\t\t\tmedia {\n\t\t\t\t\t\tresolvedName\n\t\t\t\t\t}\n\t\t\t\t\tsize\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').EmailerSendHistoryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery EmailersList {\n\t\temailers {\n\t\t\tid\n\t\t\t...EmailerListItem\n\t\t}\n\t}\n"): typeof import('./graphql').EmailersListDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation DeleteJobHistoryConfirmation {\n\t\tdeleteJobHistory {\n\t\t\taffectedRows\n\t\t}\n\t}\n"): typeof import('./graphql').DeleteJobHistoryConfirmationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation JobActionMenuCancelJob($id: ID!) {\n\t\tcancelJob(id: $id)\n\t}\n"): typeof import('./graphql').JobActionMenuCancelJobDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation JobActionMenuDeleteJob($id: ID!) {\n\t\tcancelJob(id: $id)\n\t}\n"): typeof import('./graphql').JobActionMenuDeleteJobDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation JobActionMenuDeleteLogs($id: ID!) {\n\t\tdeleteJobLogs(id: $id) {\n\t\t\taffectedRows\n\t\t}\n\t}\n"): typeof import('./graphql').JobActionMenuDeleteLogsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tfragment JobDataInspector on CoreJobOutput {\n\t\t__typename\n\t\t... on LibraryScanOutput {\n\t\t\ttotalFiles\n\t\t\ttotalDirectories\n\t\t\tignoredFiles\n\t\t\tskippedFiles\n\t\t\tignoredDirectories\n\t\t\tcreatedMedia\n\t\t\tupdatedMedia\n\t\t\tcreatedSeries\n\t\t\tupdatedSeries\n\t\t}\n\t\t... on SeriesScanOutput {\n\t\t\ttotalFiles\n\t\t\tignoredFiles\n\t\t\tskippedFiles\n\t\t\tcreatedMedia\n\t\t\tupdatedMedia\n\t\t}\n\t\t... on ThumbnailGenerationOutput {\n\t\t\tvisitedFiles\n\t\t\tskippedFiles\n\t\t\tgeneratedThumbnails\n\t\t\tremovedThumbnails\n\t\t}\n\t\t... on ExternalJobOutput {\n\t\t\tval\n\t\t}\n\t}\n"): typeof import('./graphql').JobDataInspectorFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery JobSchedulerConfig {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\temoji\n\t\t\t}\n\t\t}\n\t\tscheduledJobConfigs {\n\t\t\tid\n\t\t\tintervalSecs\n\t\t\t# Note: For now scanConfigs are actually just a library node\n\t\t\tscanConfigs {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').JobSchedulerConfigDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation JobSchedulerUpdate($id: Int!, $input: ScheduledJobConfigInput!) {\n\t\tupdateScheduledJobConfig(id: $id, input: $input) {\n\t\t\tid\n\t\t\tintervalSecs\n\t\t\tscanConfigs {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').JobSchedulerUpdateDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation JobSchedulerDelete($id: Int!) {\n\t\tdeleteScheduledJobConfig(id: $id)\n\t}\n"): typeof import('./graphql').JobSchedulerDeleteDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation JobSchedulerCreate($input: ScheduledJobConfigInput!) {\n\t\tcreateScheduledJobConfig(input: $input) {\n\t\t\tid\n\t\t\tintervalSecs\n\t\t\tscanConfigs {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').JobSchedulerCreateDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery JobTable($pagination: Pagination!) {\n\t\tjobs(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tdescription\n\t\t\t\tstatus\n\t\t\t\tcreatedAt\n\t\t\t\tcompletedAt\n\t\t\t\tmsElapsed\n\t\t\t\toutputData {\n\t\t\t\t\t...JobDataInspector\n\t\t\t\t}\n\t\t\t\tlogCount\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').JobTableDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tsubscription LiveLogsFeed {\n\t\ttailLogFile\n\t}\n"): typeof import('./graphql').LiveLogsFeedDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation DeleteLogs {\n\t\tdeleteLogs {\n\t\t\tdeleted\n\t\t}\n\t}\n"): typeof import('./graphql').DeleteLogsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery PersistedLogs(\n\t\t$filter: LogFilterInput!\n\t\t$pagination: Pagination!\n\t\t$orderBy: [LogModelOrderBy!]!\n\t) {\n\t\tlogs(filter: $filter, pagination: $pagination, orderBy: $orderBy) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\ttimestamp\n\t\t\t\tlevel\n\t\t\t\tmessage\n\t\t\t\tjobId\n\t\t\t\tcontext\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\ttotalPages\n\t\t\t\t\tcurrentPage\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').PersistedLogsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CreateOrUpdateUserFormUpdateUser($id: ID!, $input: UpdateUserInput!) {\n\t\tupdateUser(id: $id, input: $input) {\n\t\t\tid\n\t\t\tusername\n\t\t\tageRestriction {\n\t\t\t\tage\n\t\t\t\trestrictOnUnset\n\t\t\t}\n\t\t\tpermissions\n\t\t\tmaxSessionsAllowed\n\t\t}\n\t}\n"): typeof import('./graphql').CreateOrUpdateUserFormUpdateUserDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CreateOrUpdateUserFormCreateUser($input: CreateUserInput!) {\n\t\tcreateUser(input: $input) {\n\t\t\tid\n\t\t}\n\t}\n"): typeof import('./graphql').CreateOrUpdateUserFormCreateUserDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery CreateUserScene {\n\t\tusers(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').CreateUserSceneDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery UpdateUserScene($id: ID!, $skip: Boolean!) {\n\t\tme {\n\t\t\tid\n\t\t}\n\t\tuserById(id: $id) @skip(if: $skip) {\n\t\t\tid\n\t\t\tavatarUrl\n\t\t\tusername\n\t\t\tageRestriction {\n\t\t\t\tage\n\t\t\t\trestrictOnUnset\n\t\t\t}\n\t\t\tpermissions\n\t\t\tmaxSessionsAllowed\n\t\t\tisServerOwner\n\t\t}\n\t\tusers(pagination: { none: { unpaginated: true } }) @skip(if: $skip) {\n\t\t\tnodes {\n\t\t\t\tusername\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').UpdateUserSceneDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation ClearLoginActivityConfirmation {\n\t\tdeleteLoginActivity\n\t}\n"): typeof import('./graphql').ClearLoginActivityConfirmationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery LoginActivityTable {\n\t\tloginActivity {\n\t\t\tid\n\t\t\tipAddress\n\t\t\tuserAgent\n\t\t\tauthenticationSuccessful\n\t\t\ttimestamp\n\t\t\tuser {\n\t\t\t\tid\n\t\t\t\tusername\n\t\t\t\tavatarUrl\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').LoginActivityTableDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation DeleteUser($id: ID!, $hardDelete: Boolean) {\n\t\tdeleteUser(id: $id, hardDelete: $hardDelete) {\n\t\t\tid\n\t\t}\n\t}\n"): typeof import('./graphql').DeleteUserDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation UserActionMenuLockUser($id: ID!, $lock: Boolean!) {\n\t\tupdateUserLockStatus(id: $id, lock: $lock) {\n\t\t\tid\n\t\t\tisLocked\n\t\t}\n\t}\n"): typeof import('./graphql').UserActionMenuLockUserDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation UserActionMenuDeleteUserSessions($id: ID!) {\n\t\tdeleteUserSessions(id: $id)\n\t}\n"): typeof import('./graphql').UserActionMenuDeleteUserSessionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery UserTable($pagination: Pagination!) {\n\t\tusers(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tavatarUrl\n\t\t\t\tusername\n\t\t\t\tisServerOwner\n\t\t\t\tisLocked\n\t\t\t\tcreatedAt\n\t\t\t\tlastLogin\n\t\t\t\tloginSessionsCount\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\ttotalPages\n\t\t\t\t\tcurrentPage\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').UserTableDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CreateSmartListView($input: SaveSmartListView!) {\n\t\tcreateSmartListView(input: $input) {\n\t\t\tid\n\t\t\tlistId\n\t\t\tname\n\t\t\tbookColumns {\n\t\t\t\tid\n\t\t\t\tposition\n\t\t\t}\n\t\t\tbookSorting {\n\t\t\t\tid\n\t\t\t\tdesc\n\t\t\t}\n\t\t\tgroupColumns {\n\t\t\t\tid\n\t\t\t\tposition\n\t\t\t}\n\t\t\tgroupSorting {\n\t\t\t\tid\n\t\t\t\tdesc\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').CreateSmartListViewDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation UpdateSmartListView($originalName: String!, $input: SaveSmartListView!) {\n\t\tupdateSmartListView(originalName: $originalName, input: $input) {\n\t\t\tid\n\t\t\tlistId\n\t\t\tname\n\t\t\tbookColumns {\n\t\t\t\tid\n\t\t\t\tposition\n\t\t\t}\n\t\t\tbookSorting {\n\t\t\t\tid\n\t\t\t\tdesc\n\t\t\t}\n\t\t\tgroupColumns {\n\t\t\t\tid\n\t\t\t\tposition\n\t\t\t}\n\t\t\tgroupSorting {\n\t\t\t\tid\n\t\t\t\tdesc\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').UpdateSmartListViewDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SmartListsWithSearch($input: SmartListsInput!) {\n\t\tsmartLists(input: $input) {\n\t\t\tid\n\t\t\tcreatorId\n\t\t\tdescription\n\t\t\tdefaultGrouping\n\t\t\tfilters\n\t\t\tjoiner\n\t\t\tname\n\t\t\tvisibility\n\t\t}\n\t}\n"): typeof import('./graphql').SmartListsWithSearchDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SmartListBasicSettingsScene {\n\t\tsmartLists(input: { mine: true }) {\n\t\t\tname\n\t\t}\n\t}\n"): typeof import('./graphql').SmartListBasicSettingsSceneDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation DeleteSmartList($id: ID!) {\n\t\tdeleteSmartList(id: $id) {\n\t\t\t__typename\n\t\t}\n\t}\n"): typeof import('./graphql').DeleteSmartListDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SmartListById($id: ID!) {\n\t\tsmartListById(id: $id) {\n\t\t\tid\n\t\t\tcreatorId\n\t\t\tdescription\n\t\t\tdefaultGrouping\n\t\t\tfilters\n\t\t\tjoiner\n\t\t\tname\n\t\t\tvisibility\n\t\t\tviews {\n\t\t\t\tid\n\t\t\t\tlistId\n\t\t\t\tname\n\t\t\t\tbookColumns {\n\t\t\t\t\tid\n\t\t\t\t\tposition\n\t\t\t\t}\n\t\t\t\tbookSorting {\n\t\t\t\t\tid\n\t\t\t\t\tdesc\n\t\t\t\t}\n\t\t\t\tgroupColumns {\n\t\t\t\t\tid\n\t\t\t\t\tposition\n\t\t\t\t}\n\t\t\t\tgroupSorting {\n\t\t\t\t\tid\n\t\t\t\t\tdesc\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').SmartListByIdDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SmartListMeta($id: ID!) {\n\t\tsmartListMeta(id: $id) {\n\t\t\tmatchedBooks\n\t\t\tmatchedSeries\n\t\t\tmatchedLibraries\n\t\t}\n\t}\n"): typeof import('./graphql').SmartListMetaDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation UpdateSmartList($id: ID!, $input: SaveSmartListInput!) {\n\t\tupdateSmartList(id: $id, input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n"): typeof import('./graphql').UpdateSmartListDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery SmartListItems($id: ID!) {\n\t\tsmartListItems(id: $id) {\n\t\t\t__typename\n\t\t\t... on SmartListGrouped {\n\t\t\t\titems {\n\t\t\t\t\tentity {\n\t\t\t\t\t\t__typename\n\t\t\t\t\t\t... on Series {\n\t\t\t\t\t\t\tid\n\t\t\t\t\t\t\tname\n\t\t\t\t\t\t}\n\t\t\t\t\t\t... on Library {\n\t\t\t\t\t\t\tid\n\t\t\t\t\t\t\tname\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t\tbooks {\n\t\t\t\t\t\t...BookCard\n\t\t\t\t\t\tmetadata {\n\t\t\t\t\t\t\tageRating\n\t\t\t\t\t\t\tcharacters\n\t\t\t\t\t\t\tcolorists\n\t\t\t\t\t\t\tcoverArtists\n\t\t\t\t\t\t\teditors\n\t\t\t\t\t\t\tgenres\n\t\t\t\t\t\t\tinkers\n\t\t\t\t\t\t\tletterers\n\t\t\t\t\t\t\tlinks\n\t\t\t\t\t\t\tpencillers\n\t\t\t\t\t\t\tpublisher\n\t\t\t\t\t\t\tteams\n\t\t\t\t\t\t\twriters\n\t\t\t\t\t\t\tyear\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t\t... on SmartListUngrouped {\n\t\t\t\tbooks {\n\t\t\t\t\t...BookCard\n\t\t\t\t\tmetadata {\n\t\t\t\t\t\tageRating\n\t\t\t\t\t\tcharacters\n\t\t\t\t\t\tcolorists\n\t\t\t\t\t\tcoverArtists\n\t\t\t\t\t\teditors\n\t\t\t\t\t\tgenres\n\t\t\t\t\t\tinkers\n\t\t\t\t\t\tletterers\n\t\t\t\t\t\tlinks\n\t\t\t\t\t\tpencillers\n\t\t\t\t\t\tpublisher\n\t\t\t\t\t\tteams\n\t\t\t\t\t\twriters\n\t\t\t\t\t\tyear\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').SmartListItemsDocument;
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
