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
    "\n\tmutation DeleteLibrary($id: ID!) {\n\t\tdeleteLibrary(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.DeleteLibraryDocument,
    "\n\tquery SideBarQuery {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t\t... on SystemArrangmentConfig {\n\t\t\t\t\t\t\t\tvariant\n\t\t\t\t\t\t\t\tlinks\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t\tvisible\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SideBarQueryDocument,
    "\n\tmutation UpdateLibraryEmoji($id: ID!, $emoji: String) {\n\t\tupdateLibraryEmoji(id: $id, emoji: $emoji) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.UpdateLibraryEmojiDocument,
    "\n\tmutation ScanLibraryMutation($id: ID!) {\n\t\tscanLibrary(id: $id)\n\t}\n": typeof types.ScanLibraryMutationDocument,
    "\n\tquery LibrarySideBarSection {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\temoji\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LibrarySideBarSectionDocument,
    "\n\tquery EpubJsReader($id: ID!) {\n\t\tepubById(id: $id) {\n\t\t\tmediaId\n\t\t\trootBase\n\t\t\trootFile\n\t\t\textraCss\n\t\t\ttoc\n\t\t\tresources\n\t\t\tmetadata\n\t\t\tspine {\n\t\t\t\tid\n\t\t\t\tidref\n\t\t\t\tproperties\n\t\t\t\tlinear\n\t\t\t}\n\t\t\tbookmarks {\n\t\t\t\tid\n\t\t\t\tuserId\n\t\t\t\tepubcfi\n\t\t\t\tmediaId\n\t\t\t}\n\t\t}\n\t}\n": typeof types.EpubJsReaderDocument,
    "\n\tmutation UpdateEpubProgress($input: EpubProgressInput!) {\n\t\tupdateEpubProgress(input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.UpdateEpubProgressDocument,
    "\n\tmutation CreateOrUpdateBookmark($input: BookmarkInput!) {\n\t\tcreateOrUpdateBookmark(input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.CreateOrUpdateBookmarkDocument,
    "\n\tmutation DeleteBookmark($epubcfi: String!) {\n\t\tdeleteBookmark(epubcfi: $epubcfi) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.DeleteBookmarkDocument,
    "\n\tmutation BookCompletionToggleButtonComplete($id: ID!, $isComplete: Boolean!, $page: Int) {\n\t\tmarkMediaAsComplete(id: $id, isComplete: $isComplete, page: $page) {\n\t\t\tcompletedAt\n\t\t}\n\t}\n": typeof types.BookCompletionToggleButtonCompleteDocument,
    "\n\tmutation BookCompletionToggleButtonDeleteSession($id: ID!) {\n\t\tdeleteMediaProgress(id: $id) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.BookCompletionToggleButtonDeleteSessionDocument,
    "\n\tquery BookLibrarySeriesLinks($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tlibraryId\n\t\t}\n\t}\n": typeof types.BookLibrarySeriesLinksDocument,
    "\n\tquery BookOverviewScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\textension\n\t\t\tresolvedName\n\t\t\thash\n\t\t\tpages\n\t\t\tsize\n\t\t\tstatus\n\t\t\trelativeLibraryPath\n\t\t\tmetadata {\n\t\t\t\tlinks\n\t\t\t\tsummary\n\t\t\t}\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t\treadProgress {\n\t\t\t\tpercentageCompleted\n\t\t\t\tepubcfi\n\t\t\t\tpage\n\t\t\t}\n\t\t\treadHistory {\n\t\t\t\t__typename\n\t\t\t\tcompletedAt\n\t\t\t}\n\t\t}\n\t}\n": typeof types.BookOverviewSceneDocument,
    "\n\tquery BookOverviewHeader($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tseriesId\n\t\t\tmetadata {\n\t\t\t\tageRating\n\t\t\t\tcharacters\n\t\t\t\tcolorists\n\t\t\t\tcoverArtists\n\t\t\t\teditors\n\t\t\t\tgenres\n\t\t\t\tinkers\n\t\t\t\tletterers\n\t\t\t\tlinks\n\t\t\t\tpencillers\n\t\t\t\tpublisher\n\t\t\t\tteams\n\t\t\t\twriters\n\t\t\t\tyear\n\t\t\t}\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": typeof types.BookOverviewHeaderDocument,
    "\n\tquery BooksAfterCurrentQuery($id: ID!, $pagination: Pagination) {\n\t\tmediaById(id: $id) {\n\t\t\tnextInSeries(pagination: $pagination) {\n\t\t\t\tnodes {\n\t\t\t\t\tid\n\t\t\t\t\tresolvedName\n\t\t\t\t\tpages\n\t\t\t\t\tsize\n\t\t\t\t\tstatus\n\t\t\t\t\tthumbnail {\n\t\t\t\t\t\turl\n\t\t\t\t\t}\n\t\t\t\t\treadProgress {\n\t\t\t\t\t\tpercentageCompleted\n\t\t\t\t\t\tepubcfi\n\t\t\t\t\t\tpage\n\t\t\t\t\t}\n\t\t\t\t\treadHistory {\n\t\t\t\t\t\t__typename\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\tpageInfo {\n\t\t\t\t\t__typename\n\t\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\t\tcurrentCursor\n\t\t\t\t\t\tnextCursor\n\t\t\t\t\t\tlimit\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.BooksAfterCurrentQueryDocument,
    "\n\tquery EmailBookDropdownDevice {\n\t\temailDevices {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": typeof types.EmailBookDropdownDeviceDocument,
    "\n\tmutation SendEmailAttachment($id: ID!, $sendTo: [EmailerSendTo!]!) {\n\t\tsendAttachmentEmail(input: { mediaIds: [$id], sendTo: $sendTo }) {\n\t\t\tsentCount\n\t\t\terrors\n\t\t}\n\t}\n": typeof types.SendEmailAttachmentDocument,
    "\n\tquery BookReaderScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tpages\n\t\t\textension\n\t\t\treadProgress {\n\t\t\t\tpercentageCompleted\n\t\t\t\tepubcfi\n\t\t\t\tpage\n\t\t\t}\n\t\t\tlibraryConfig {\n\t\t\t\tdefaultReadingImageScaleFit\n\t\t\t\tdefaultReadingMode\n\t\t\t\tdefaultReadingDir\n\t\t\t}\n\t\t}\n\t}\n": typeof types.BookReaderSceneDocument,
    "\n\tmutation UpdateReadProgress($id: ID!, $page: Int!) {\n\t\tupdateMediaProgress(id: $id, page: $page) {\n\t\t\t__typename\n\t\t}\n\t}\n": typeof types.UpdateReadProgressDocument,
    "\n\tquery ContinueReadingMediaQuery($pagination: Pagination!) {\n\t\tkeepReading(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.ContinueReadingMediaQueryDocument,
    "\n\tquery HomeSceneQuery {\n\t\tnumberOfLibraries\n\t}\n": typeof types.HomeSceneQueryDocument,
    "\n\tquery RecentlyAddedMediaQuery($pagination: Pagination!) {\n\t\trecentlyAddedMedia(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.RecentlyAddedMediaQueryDocument,
    "\n\tquery RecentlyAddedSeriesQuery($pagination: Pagination!) {\n\t\trecentlyAddedSeries(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.RecentlyAddedSeriesQueryDocument,
    "\n\tquery LibraryLayout($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tdescription\n\t\t\tpath\n\t\t\tstats {\n\t\t\t\tbookCount\n\t\t\t\tcompletedBooks\n\t\t\t\tinProgressBooks\n\t\t\t}\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LibraryLayoutDocument,
    "\n\tmutation VisitLibrary($id: ID!) {\n\t\tvisitLibrary(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.VisitLibraryDocument,
    "\n\tquery LibrarySeries($filter: SeriesFilterInput!, $pagination: Pagination!) {\n\t\tseries(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\ttotalPages\n\t\t\t\t\tcurrentPage\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.LibrarySeriesDocument,
    "\n\tquery SeriesLayout($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tpath\n\t\t\tlibrary {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t\tresolvedName\n\t\t\tresolvedDescription\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SeriesLayoutDocument,
    "\n\tquery SeriesLibrayLink($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": typeof types.SeriesLibrayLinkDocument,
    "\n\tquery SeriesBooksScene($filter: MediaFilterInput!, $pagination: Pagination!) {\n\t\tmedia(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SeriesBooksSceneDocument,
    "\n\tquery DirectoryListing($input: DirectoryListingInput!, $pagination: Pagination!) {\n\t\tlistDirectory(input: $input, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tparent\n\t\t\t\tfiles {\n\t\t\t\t\tname\n\t\t\t\t\tpath\n\t\t\t\t\tisDirectory\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\tcurrentPage\n\t\t\t\t\ttotalPages\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.DirectoryListingDocument,
    "\n\tquery UploadConfig {\n\t\tuploadConfig {\n\t\t\tenabled\n\t\t\tmaxFileUploadSize\n\t\t}\n\t}\n": typeof types.UploadConfigDocument,
};
const documents: Documents = {
    "\n\tquery MediaAtPath($path: String!) {\n\t\tmediaByPath(path: $path) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t}\n\t}\n": types.MediaAtPathDocument,
    "\n\tmutation UploadLibraryBooks($input: UploadBooksInput!) {\n\t\tuploadBooks(input: $input)\n\t}\n": types.UploadLibraryBooksDocument,
    "\n\tmutation UploadLibrarySeries($input: UploadSeriesInput!) {\n\t\tuploadSeries(input: $input)\n\t}\n": types.UploadLibrarySeriesDocument,
    "\n\tmutation DeleteLibrary($id: ID!) {\n\t\tdeleteLibrary(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": types.DeleteLibraryDocument,
    "\n\tquery SideBarQuery {\n\t\tme {\n\t\t\tid\n\t\t\tpreferences {\n\t\t\t\tnavigationArrangement {\n\t\t\t\t\tlocked\n\t\t\t\t\tsections {\n\t\t\t\t\t\tconfig {\n\t\t\t\t\t\t\t__typename\n\t\t\t\t\t\t\t... on SystemArrangmentConfig {\n\t\t\t\t\t\t\t\tvariant\n\t\t\t\t\t\t\t\tlinks\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t\tvisible\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.SideBarQueryDocument,
    "\n\tmutation UpdateLibraryEmoji($id: ID!, $emoji: String) {\n\t\tupdateLibraryEmoji(id: $id, emoji: $emoji) {\n\t\t\tid\n\t\t}\n\t}\n": types.UpdateLibraryEmojiDocument,
    "\n\tmutation ScanLibraryMutation($id: ID!) {\n\t\tscanLibrary(id: $id)\n\t}\n": types.ScanLibraryMutationDocument,
    "\n\tquery LibrarySideBarSection {\n\t\tlibraries(pagination: { none: { unpaginated: true } }) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\temoji\n\t\t\t}\n\t\t}\n\t}\n": types.LibrarySideBarSectionDocument,
    "\n\tquery EpubJsReader($id: ID!) {\n\t\tepubById(id: $id) {\n\t\t\tmediaId\n\t\t\trootBase\n\t\t\trootFile\n\t\t\textraCss\n\t\t\ttoc\n\t\t\tresources\n\t\t\tmetadata\n\t\t\tspine {\n\t\t\t\tid\n\t\t\t\tidref\n\t\t\t\tproperties\n\t\t\t\tlinear\n\t\t\t}\n\t\t\tbookmarks {\n\t\t\t\tid\n\t\t\t\tuserId\n\t\t\t\tepubcfi\n\t\t\t\tmediaId\n\t\t\t}\n\t\t}\n\t}\n": types.EpubJsReaderDocument,
    "\n\tmutation UpdateEpubProgress($input: EpubProgressInput!) {\n\t\tupdateEpubProgress(input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.UpdateEpubProgressDocument,
    "\n\tmutation CreateOrUpdateBookmark($input: BookmarkInput!) {\n\t\tcreateOrUpdateBookmark(input: $input) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.CreateOrUpdateBookmarkDocument,
    "\n\tmutation DeleteBookmark($epubcfi: String!) {\n\t\tdeleteBookmark(epubcfi: $epubcfi) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.DeleteBookmarkDocument,
    "\n\tmutation BookCompletionToggleButtonComplete($id: ID!, $isComplete: Boolean!, $page: Int) {\n\t\tmarkMediaAsComplete(id: $id, isComplete: $isComplete, page: $page) {\n\t\t\tcompletedAt\n\t\t}\n\t}\n": types.BookCompletionToggleButtonCompleteDocument,
    "\n\tmutation BookCompletionToggleButtonDeleteSession($id: ID!) {\n\t\tdeleteMediaProgress(id: $id) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.BookCompletionToggleButtonDeleteSessionDocument,
    "\n\tquery BookLibrarySeriesLinks($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tlibraryId\n\t\t}\n\t}\n": types.BookLibrarySeriesLinksDocument,
    "\n\tquery BookOverviewScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\textension\n\t\t\tresolvedName\n\t\t\thash\n\t\t\tpages\n\t\t\tsize\n\t\t\tstatus\n\t\t\trelativeLibraryPath\n\t\t\tmetadata {\n\t\t\t\tlinks\n\t\t\t\tsummary\n\t\t\t}\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t\treadProgress {\n\t\t\t\tpercentageCompleted\n\t\t\t\tepubcfi\n\t\t\t\tpage\n\t\t\t}\n\t\t\treadHistory {\n\t\t\t\t__typename\n\t\t\t\tcompletedAt\n\t\t\t}\n\t\t}\n\t}\n": types.BookOverviewSceneDocument,
    "\n\tquery BookOverviewHeader($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tseriesId\n\t\t\tmetadata {\n\t\t\t\tageRating\n\t\t\t\tcharacters\n\t\t\t\tcolorists\n\t\t\t\tcoverArtists\n\t\t\t\teditors\n\t\t\t\tgenres\n\t\t\t\tinkers\n\t\t\t\tletterers\n\t\t\t\tlinks\n\t\t\t\tpencillers\n\t\t\t\tpublisher\n\t\t\t\tteams\n\t\t\t\twriters\n\t\t\t\tyear\n\t\t\t}\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": types.BookOverviewHeaderDocument,
    "\n\tquery BooksAfterCurrentQuery($id: ID!, $pagination: Pagination) {\n\t\tmediaById(id: $id) {\n\t\t\tnextInSeries(pagination: $pagination) {\n\t\t\t\tnodes {\n\t\t\t\t\tid\n\t\t\t\t\tresolvedName\n\t\t\t\t\tpages\n\t\t\t\t\tsize\n\t\t\t\t\tstatus\n\t\t\t\t\tthumbnail {\n\t\t\t\t\t\turl\n\t\t\t\t\t}\n\t\t\t\t\treadProgress {\n\t\t\t\t\t\tpercentageCompleted\n\t\t\t\t\t\tepubcfi\n\t\t\t\t\t\tpage\n\t\t\t\t\t}\n\t\t\t\t\treadHistory {\n\t\t\t\t\t\t__typename\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\tpageInfo {\n\t\t\t\t\t__typename\n\t\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\t\tcurrentCursor\n\t\t\t\t\t\tnextCursor\n\t\t\t\t\t\tlimit\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.BooksAfterCurrentQueryDocument,
    "\n\tquery EmailBookDropdownDevice {\n\t\temailDevices {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": types.EmailBookDropdownDeviceDocument,
    "\n\tmutation SendEmailAttachment($id: ID!, $sendTo: [EmailerSendTo!]!) {\n\t\tsendAttachmentEmail(input: { mediaIds: [$id], sendTo: $sendTo }) {\n\t\t\tsentCount\n\t\t\terrors\n\t\t}\n\t}\n": types.SendEmailAttachmentDocument,
    "\n\tquery BookReaderScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tpages\n\t\t\textension\n\t\t\treadProgress {\n\t\t\t\tpercentageCompleted\n\t\t\t\tepubcfi\n\t\t\t\tpage\n\t\t\t}\n\t\t\tlibraryConfig {\n\t\t\t\tdefaultReadingImageScaleFit\n\t\t\t\tdefaultReadingMode\n\t\t\t\tdefaultReadingDir\n\t\t\t}\n\t\t}\n\t}\n": types.BookReaderSceneDocument,
    "\n\tmutation UpdateReadProgress($id: ID!, $page: Int!) {\n\t\tupdateMediaProgress(id: $id, page: $page) {\n\t\t\t__typename\n\t\t}\n\t}\n": types.UpdateReadProgressDocument,
    "\n\tquery ContinueReadingMediaQuery($pagination: Pagination!) {\n\t\tkeepReading(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.ContinueReadingMediaQueryDocument,
    "\n\tquery HomeSceneQuery {\n\t\tnumberOfLibraries\n\t}\n": types.HomeSceneQueryDocument,
    "\n\tquery RecentlyAddedMediaQuery($pagination: Pagination!) {\n\t\trecentlyAddedMedia(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tpages\n\t\t\t\tsize\n\t\t\t\tstatus\n\t\t\t\tthumbnail {\n\t\t\t\t\turl\n\t\t\t\t}\n\t\t\t\treadProgress {\n\t\t\t\t\tpercentageCompleted\n\t\t\t\t\tepubcfi\n\t\t\t\t\tpage\n\t\t\t\t}\n\t\t\t\treadHistory {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.RecentlyAddedMediaQueryDocument,
    "\n\tquery RecentlyAddedSeriesQuery($pagination: Pagination!) {\n\t\trecentlyAddedSeries(pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\tcurrentCursor\n\t\t\t\t\tnextCursor\n\t\t\t\t\tlimit\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.RecentlyAddedSeriesQueryDocument,
    "\n\tquery LibraryLayout($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tdescription\n\t\t\tpath\n\t\t\tstats {\n\t\t\t\tbookCount\n\t\t\t\tcompletedBooks\n\t\t\t\tinProgressBooks\n\t\t\t}\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": types.LibraryLayoutDocument,
    "\n\tmutation VisitLibrary($id: ID!) {\n\t\tvisitLibrary(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": types.VisitLibraryDocument,
    "\n\tquery LibrarySeries($filter: SeriesFilterInput!, $pagination: Pagination!) {\n\t\tseries(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\ttotalPages\n\t\t\t\t\tcurrentPage\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.LibrarySeriesDocument,
    "\n\tquery SeriesLayout($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tpath\n\t\t\tlibrary {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t\tresolvedName\n\t\t\tresolvedDescription\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": types.SeriesLayoutDocument,
    "\n\tquery SeriesLibrayLink($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t}\n\t}\n": types.SeriesLibrayLinkDocument,
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
export function graphql(source: "\n\tmutation DeleteLibrary($id: ID!) {\n\t\tdeleteLibrary(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"): typeof import('./graphql').DeleteLibraryDocument;
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
export function graphql(source: "\n\tmutation BookCompletionToggleButtonComplete($id: ID!, $isComplete: Boolean!, $page: Int) {\n\t\tmarkMediaAsComplete(id: $id, isComplete: $isComplete, page: $page) {\n\t\t\tcompletedAt\n\t\t}\n\t}\n"): typeof import('./graphql').BookCompletionToggleButtonCompleteDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation BookCompletionToggleButtonDeleteSession($id: ID!) {\n\t\tdeleteMediaProgress(id: $id) {\n\t\t\t__typename\n\t\t}\n\t}\n"): typeof import('./graphql').BookCompletionToggleButtonDeleteSessionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery BookLibrarySeriesLinks($id: ID!) {\n\t\tseriesById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tlibraryId\n\t\t}\n\t}\n"): typeof import('./graphql').BookLibrarySeriesLinksDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery BookOverviewScene($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\textension\n\t\t\tresolvedName\n\t\t\thash\n\t\t\tpages\n\t\t\tsize\n\t\t\tstatus\n\t\t\trelativeLibraryPath\n\t\t\tmetadata {\n\t\t\t\tlinks\n\t\t\t\tsummary\n\t\t\t}\n\t\t\tthumbnail {\n\t\t\t\turl\n\t\t\t}\n\t\t\treadProgress {\n\t\t\t\tpercentageCompleted\n\t\t\t\tepubcfi\n\t\t\t\tpage\n\t\t\t}\n\t\t\treadHistory {\n\t\t\t\t__typename\n\t\t\t\tcompletedAt\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').BookOverviewSceneDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery BookOverviewHeader($id: ID!) {\n\t\tmediaById(id: $id) {\n\t\t\tid\n\t\t\tresolvedName\n\t\t\tseriesId\n\t\t\tmetadata {\n\t\t\t\tageRating\n\t\t\t\tcharacters\n\t\t\t\tcolorists\n\t\t\t\tcoverArtists\n\t\t\t\teditors\n\t\t\t\tgenres\n\t\t\t\tinkers\n\t\t\t\tletterers\n\t\t\t\tlinks\n\t\t\t\tpencillers\n\t\t\t\tpublisher\n\t\t\t\tteams\n\t\t\t\twriters\n\t\t\t\tyear\n\t\t\t}\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').BookOverviewHeaderDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery BooksAfterCurrentQuery($id: ID!, $pagination: Pagination) {\n\t\tmediaById(id: $id) {\n\t\t\tnextInSeries(pagination: $pagination) {\n\t\t\t\tnodes {\n\t\t\t\t\tid\n\t\t\t\t\tresolvedName\n\t\t\t\t\tpages\n\t\t\t\t\tsize\n\t\t\t\t\tstatus\n\t\t\t\t\tthumbnail {\n\t\t\t\t\t\turl\n\t\t\t\t\t}\n\t\t\t\t\treadProgress {\n\t\t\t\t\t\tpercentageCompleted\n\t\t\t\t\t\tepubcfi\n\t\t\t\t\t\tpage\n\t\t\t\t\t}\n\t\t\t\t\treadHistory {\n\t\t\t\t\t\t__typename\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\tpageInfo {\n\t\t\t\t\t__typename\n\t\t\t\t\t... on CursorPaginationInfo {\n\t\t\t\t\t\tcurrentCursor\n\t\t\t\t\t\tnextCursor\n\t\t\t\t\t\tlimit\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').BooksAfterCurrentQueryDocument;
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
export function graphql(source: "\n\tquery LibraryLayout($id: ID!) {\n\t\tlibraryById(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tdescription\n\t\t\tpath\n\t\t\tstats {\n\t\t\t\tbookCount\n\t\t\t\tcompletedBooks\n\t\t\t\tinProgressBooks\n\t\t\t}\n\t\t\ttags {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').LibraryLayoutDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation VisitLibrary($id: ID!) {\n\t\tvisitLibrary(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"): typeof import('./graphql').VisitLibraryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery LibrarySeries($filter: SeriesFilterInput!, $pagination: Pagination!) {\n\t\tseries(filter: $filter, pagination: $pagination) {\n\t\t\tnodes {\n\t\t\t\tid\n\t\t\t\tresolvedName\n\t\t\t\tmediaCount\n\t\t\t\tpercentageCompleted\n\t\t\t\tstatus\n\t\t\t}\n\t\t\tpageInfo {\n\t\t\t\t__typename\n\t\t\t\t... on OffsetPaginationInfo {\n\t\t\t\t\ttotalPages\n\t\t\t\t\tcurrentPage\n\t\t\t\t\tpageSize\n\t\t\t\t\tpageOffset\n\t\t\t\t\tzeroBased\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): typeof import('./graphql').LibrarySeriesDocument;
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
