/* eslint-disable */
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /**
   * Implement the DateTime<FixedOffset> scalar
   *
   * The input/output is a string in RFC3339 format.
   */
  DateTime: { input: any; output: any; }
  Decimal: { input: any; output: any; }
  /** A scalar that can represent any JSON value. */
  JSON: { input: any; output: any; }
  /** A scalar that can represent any JSON Object value. */
  JSONObject: { input: any; output: any; }
  Upload: { input: any; output: any; }
};

/**
 * The different roles a user may have for a role-based access control system scoped
 * to a specific entity
 */
export enum AccessRole {
  CoCreator = 'CO_CREATOR',
  Reader = 'READER',
  Writer = 'WRITER'
}

export type ActiveReadingSession = {
  __typename?: 'ActiveReadingSession';
  deviceId?: Maybe<Scalars['String']['output']>;
  elapsedSeconds?: Maybe<Scalars['Int']['output']>;
  epubcfi?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  koreaderProgress?: Maybe<Scalars['String']['output']>;
  mediaId: Scalars['String']['output'];
  page?: Maybe<Scalars['Int']['output']>;
  percentageCompleted?: Maybe<Scalars['Decimal']['output']>;
  startedAt: Scalars['DateTime']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  userId: Scalars['String']['output'];
};

export type AgeRestriction = {
  __typename?: 'AgeRestriction';
  age: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  restrictOnUnset: Scalars['Boolean']['output'];
  userId: Scalars['String']['output'];
};

export type AgeRestrictionInput = {
  age: Scalars['Int']['input'];
  restrictOnUnset: Scalars['Boolean']['input'];
};

export type Apikey = {
  __typename?: 'Apikey';
  createdAt: Scalars['DateTime']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['Int']['output'];
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  longTokenHash: Scalars['String']['output'];
  name: Scalars['String']['output'];
  permissions: ApikeyPermissionsOutput;
  shortToken: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type ApikeyInput = {
  /** The expiration date for the API key, if any */
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  /** The name of the API key */
  name: Scalars['String']['input'];
  /** The permissions that the API key should have */
  permissions: ApikeyPermissions;
};

export type ApikeyPermissions =
  { custom: Array<UserPermission>; inherit?: never; }
  |  { custom?: never; inherit: InheritPermissionValue; };

export type ApikeyPermissionsOutput = InheritPermissionStruct | UserPermissionStruct;

export type Arrangement = {
  __typename?: 'Arrangement';
  locked: Scalars['Boolean']['output'];
  sections: Array<ArrangementSection>;
};

export type ArrangementConfig = CustomArrangementConfig | InProgressBooks | RecentlyAdded | SystemArrangementConfig;

export type ArrangementConfigInput =
  { custom: FilterableArrangementEntityLinkInput; inProgressBooks?: never; recentlyAdded?: never; system?: never; }
  |  { custom?: never; inProgressBooks: InProgressBooksInput; recentlyAdded?: never; system?: never; }
  |  { custom?: never; inProgressBooks?: never; recentlyAdded: RecentlyAddedInput; system?: never; }
  |  { custom?: never; inProgressBooks?: never; recentlyAdded?: never; system: SystemArrangementConfigInput; };

export type ArrangementSection = {
  __typename?: 'ArrangementSection';
  config: ArrangementConfig;
  visible: Scalars['Boolean']['output'];
};

export type ArrangementSectionInput = {
  config: ArrangementConfigInput;
  visible?: Scalars['Boolean']['input'];
};

export type AttachmentMeta = {
  __typename?: 'AttachmentMeta';
  /** The filename of the attachment */
  filename: Scalars['String']['output'];
  media?: Maybe<Media>;
  /** The associated media ID of the attachment, if there is one */
  mediaId?: Maybe<Scalars['String']['output']>;
  /** The size of the attachment in bytes */
  size: Scalars['Int']['output'];
};

export type BookClub = {
  __typename?: 'BookClub';
  createdAt: Scalars['DateTime']['output'];
  creator: BookClubMember;
  currentBook?: Maybe<BookClubBook>;
  description?: Maybe<Scalars['String']['output']>;
  emoji?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  invitations: Array<BookClubInvitation>;
  isPrivate: Scalars['Boolean']['output'];
  members: Array<BookClubMember>;
  membersCount: Scalars['Int']['output'];
  membership?: Maybe<BookClubMember>;
  name: Scalars['String']['output'];
  roleSpec: Scalars['JSON']['output'];
  schedule?: Maybe<BookClubSchedule>;
  slug: Scalars['String']['output'];
};

export type BookClubBook = BookClubExternalBook | BookClubInternalBook;

export type BookClubBookInput =
  { external: BookClubExternalBookInput; stored?: never; }
  |  { external?: never; stored: BookClubInternalBookInput; };

export type BookClubExternalBook = {
  __typename?: 'BookClubExternalBook';
  author: Scalars['String']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

export type BookClubExternalBookInput = {
  author: Scalars['String']['input'];
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  url?: InputMaybe<Scalars['String']['input']>;
};

export type BookClubInternalBook = {
  __typename?: 'BookClubInternalBook';
  id: Scalars['String']['output'];
};

export type BookClubInternalBookInput = {
  id: Scalars['String']['input'];
};

export type BookClubInvitation = {
  __typename?: 'BookClubInvitation';
  /** The book club that the user was invited to */
  bookClub: BookClub;
  bookClubId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  role: BookClubMemberRole;
  /** The user who was invited to the book club */
  user: User;
  userId: Scalars['String']['output'];
};

export type BookClubInvitationInput = {
  role?: InputMaybe<BookClubMemberRole>;
  userId: Scalars['String']['input'];
};

export type BookClubInvitationResponseInput = {
  accept: Scalars['Boolean']['input'];
  member?: InputMaybe<BookClubMemberInput>;
};

export type BookClubMember = {
  __typename?: 'BookClubMember';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  bookClubId: Scalars['String']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  hideProgress: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  isCreator: Scalars['Boolean']['output'];
  privateMembership: Scalars['Boolean']['output'];
  role: BookClubMemberRole;
  user: User;
  userId: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

export type BookClubMemberInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  privateMembership?: InputMaybe<Scalars['Boolean']['input']>;
  userId: Scalars['String']['input'];
};

/** The visibility of a shareable entity */
export enum BookClubMemberRole {
  Admin = 'ADMIN',
  Creator = 'CREATOR',
  Member = 'MEMBER',
  Moderator = 'MODERATOR'
}

export type BookClubSchedule = {
  __typename?: 'BookClubSchedule';
  activeBooks: Array<BookClubBook>;
  bookClubId: Scalars['String']['output'];
  books: Array<BookClubBook>;
  defaultIntervalDays?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
};

export type Bookmark = {
  __typename?: 'Bookmark';
  epubcfi?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  mediaId: Scalars['String']['output'];
  page?: Maybe<Scalars['Int']['output']>;
  previewContent?: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

export type BookmarkInput = {
  epubcfi: Scalars['String']['input'];
  mediaId: Scalars['String']['input'];
  previewContent?: InputMaybe<Scalars['String']['input']>;
};

export type CleanLibraryResponse = {
  __typename?: 'CleanLibraryResponse';
  deletedMediaCount: Scalars['Int']['output'];
  deletedSeriesCount: Scalars['Int']['output'];
  isEmpty: Scalars['Boolean']['output'];
};

export type ComputedFilterReadingStatus =
  { is: ReadingStatus; isAnyOf?: never; isNoneOf?: never; isNot?: never; }
  |  { is?: never; isAnyOf: Array<ReadingStatus>; isNoneOf?: never; isNot?: never; }
  |  { is?: never; isAnyOf?: never; isNoneOf: Array<ReadingStatus>; isNot?: never; }
  |  { is?: never; isAnyOf?: never; isNoneOf?: never; isNot: ReadingStatus; };

/** An event that is emitted by the core and consumed by a client */
export type CoreEvent = CreatedManySeries | CreatedMedia | CreatedOrUpdatedManyMedia | DiscoveredMissingLibrary | JobOutput | JobStarted | JobUpdate;

export type CoreJobOutput = ExternalJobOutput | LibraryScanOutput | SeriesScanOutput | ThumbnailGenerationOutput;

export type CreateBookClubInput = {
  creatorDisplayName?: InputMaybe<Scalars['String']['input']>;
  creatorHideProgress: Scalars['Boolean']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  isPrivate?: Scalars['Boolean']['input'];
  memberRoleSpec?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type CreateBookClubMemberInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  privateMembership?: InputMaybe<Scalars['Boolean']['input']>;
  role: BookClubMemberRole;
  userId: Scalars['String']['input'];
};

export type CreateBookClubScheduleBook = {
  book: BookClubBookInput;
  discussionDurationDays?: InputMaybe<Scalars['Int']['input']>;
  endAt?: InputMaybe<Scalars['DateTime']['input']>;
  startAt?: InputMaybe<Scalars['DateTime']['input']>;
};

export type CreateBookClubScheduleInput = {
  books: Array<CreateBookClubScheduleBook>;
  defaultIntervalDays?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateOrUpdateLibraryInput = {
  config?: InputMaybe<LibraryConfigInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  emoji?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  path: Scalars['String']['input'];
  scanAfterPersist?: Scalars['Boolean']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateUserInput = {
  ageRestriction?: InputMaybe<AgeRestrictionInput>;
  maxSessionsAllowed?: InputMaybe<Scalars['Int']['input']>;
  password: Scalars['String']['input'];
  permissions: Array<UserPermission>;
  username: Scalars['String']['input'];
};

export type CreatedApiKey = {
  __typename?: 'CreatedAPIKey';
  apiKey: Apikey;
  secret: Scalars['String']['output'];
};

export type CreatedManySeries = {
  __typename?: 'CreatedManySeries';
  count: Scalars['Int']['output'];
  libraryId: Scalars['String']['output'];
};

export type CreatedMedia = {
  __typename?: 'CreatedMedia';
  id: Scalars['String']['output'];
  seriesId: Scalars['String']['output'];
};

export type CreatedOrUpdatedManyMedia = {
  __typename?: 'CreatedOrUpdatedManyMedia';
  count: Scalars['Int']['output'];
  seriesId: Scalars['String']['output'];
};

/** A simple cursor-based pagination input object */
export type CursorPagination = {
  after?: InputMaybe<Scalars['String']['input']>;
  limit?: Scalars['Int']['input'];
};

/** Information about the current cursor pagination state */
export type CursorPaginationInfo = {
  __typename?: 'CursorPaginationInfo';
  /**
   * The cursor of the current page. This should only be None if there are no results,
   * since there is no cursor present to pull from. This technically deviates from
   * popular (read: Relay) specs, but it works better for Stump
   */
  currentCursor?: Maybe<Scalars['String']['output']>;
  /** The limit used when querying the database */
  limit: Scalars['Int']['output'];
  /** The cursor the next page should use, if it exists. */
  nextCursor?: Maybe<Scalars['String']['output']>;
};

export type CustomArrangementConfig = {
  __typename?: 'CustomArrangementConfig';
  entity: FilterableArrangementEntity;
  filter?: Maybe<Scalars['JSON']['output']>;
  links: Array<FilterableArrangementEntityLink>;
  name?: Maybe<Scalars['String']['output']>;
  orderBy?: Maybe<Scalars['String']['output']>;
};

export type DeleteJobAssociatedLogs = {
  __typename?: 'DeleteJobAssociatedLogs';
  /** The number of logs deleted that were related to a job */
  affectedRows: Scalars['Int']['output'];
};

export type DeleteJobHistory = {
  __typename?: 'DeleteJobHistory';
  /** The number of logs deleted that were related to a job */
  affectedRows: Scalars['Int']['output'];
};

export enum Dimension {
  Height = 'HEIGHT',
  Width = 'WIDTH'
}

export type DirectoryListing = {
  __typename?: 'DirectoryListing';
  files: Array<DirectoryListingFile>;
  parent?: Maybe<Scalars['String']['output']>;
};

export type DirectoryListingFile = {
  __typename?: 'DirectoryListingFile';
  isDirectory: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  path: Scalars['String']['output'];
};

export type DirectoryListingInput = {
  ignoreDirectories?: Scalars['Boolean']['input'];
  ignoreFiles?: Scalars['Boolean']['input'];
  ignoreHidden?: Scalars['Boolean']['input'];
  path?: InputMaybe<Scalars['String']['input']>;
};

export type DiscordConfig = {
  __typename?: 'DiscordConfig';
  webhookUrl: Scalars['String']['output'];
};

export type DiscordConfigInput = {
  webhookUrl: Scalars['String']['input'];
};

export type DiscoveredMissingLibrary = {
  __typename?: 'DiscoveredMissingLibrary';
  id: Scalars['String']['output'];
};

/** Input object for creating or updating an email device */
export type EmailDeviceInput = {
  /** The email address of the device */
  email: Scalars['String']['input'];
  /** Whether the device is forbidden from receiving emails from the server. */
  forbidden: Scalars['Boolean']['input'];
  /** The friendly name of the email device, e.g. "Aaron's Kobo" */
  name: Scalars['String']['input'];
};

export type Emailer = {
  __typename?: 'Emailer';
  id: Scalars['Int']['output'];
  isPrimary: Scalars['Boolean']['output'];
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  maxAttachmentSizeBytes?: Maybe<Scalars['Int']['output']>;
  maxNumAttachments?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  sendHistory: Array<EmailerSendRecord>;
  senderDisplayName: Scalars['String']['output'];
  senderEmail: Scalars['String']['output'];
  smtpHost: Scalars['String']['output'];
  smtpPort: Scalars['Int']['output'];
  tlsEnabled: Scalars['Boolean']['output'];
  username: Scalars['String']['output'];
};

/** The configuration for an [EmailerClient] */
export type EmailerClientConfig = {
  /** The SMTP host to use */
  host: Scalars['String']['input'];
  /** The maximum size of an attachment in bytes */
  maxAttachmentSizeBytes?: InputMaybe<Scalars['Int']['input']>;
  /** The maximum number of attachments that can be sent in a single email */
  maxNumAttachments?: InputMaybe<Scalars['Int']['input']>;
  /**
   * The plaintext password to use for the SMTP server, which will be encrypted before being stored.
   * This field is optional to support reusing the config for emailer config updates. If the password is not
   * set, it will error when trying to send an email.
   */
  password?: InputMaybe<Scalars['String']['input']>;
  /** The SMTP port to use */
  port: Scalars['Int']['input'];
  /** The display name to use for the sender */
  senderDisplayName: Scalars['String']['input'];
  /** The email address to send from */
  senderEmail: Scalars['String']['input'];
  /** Whether to use TLS for the SMTP connection */
  tlsEnabled: Scalars['Boolean']['input'];
  /** The username to use for the SMTP server, typically the same as the sender email */
  username: Scalars['String']['input'];
};

/** Input object for creating or updating an emailer */
export type EmailerInput = {
  /** The emailer configuration */
  config: EmailerClientConfig;
  /** Whether the emailer is the primary emailer */
  isPrimary: Scalars['Boolean']['input'];
  /** The friendly name of the emailer, e.g. "Aaron's Kobo" */
  name: Scalars['String']['input'];
};

export type EmailerSendRecord = {
  __typename?: 'EmailerSendRecord';
  attachmentMeta: Array<AttachmentMeta>;
  emailerId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  recipientEmail: Scalars['String']['output'];
  sentAt: Scalars['DateTime']['output'];
  sentBy?: Maybe<User>;
  sentByUserId?: Maybe<Scalars['String']['output']>;
};

export type EmailerSendTo =
  { anonymous: SendToEmail; device?: never; }
  |  { anonymous?: never; device: SendToDevice; };

/** The visibility of a shareable entity */
export enum EntityVisibility {
  Private = 'PRIVATE',
  Public = 'PUBLIC',
  Shared = 'SHARED'
}

export type Epub = {
  __typename?: 'Epub';
  annotations: Array<MediaAnnotationsModel>;
  bookmarks: Array<Bookmark>;
  extraCss: Array<Scalars['String']['output']>;
  media: Media;
  mediaId: Scalars['String']['output'];
  metadata: Scalars['JSONObject']['output'];
  resources: Scalars['JSONObject']['output'];
  rootBase: Scalars['String']['output'];
  rootFile: Scalars['String']['output'];
  spine: Array<SpineItem>;
  toc: Array<Scalars['String']['output']>;
};

export type EpubProgressInput = {
  elapsedSeconds?: InputMaybe<Scalars['Int']['input']>;
  epubcfi: Scalars['String']['input'];
  isComplete?: InputMaybe<Scalars['Boolean']['input']>;
  percentage?: InputMaybe<Scalars['Decimal']['input']>;
};

/**
 * A resize option which will resize the image to the given dimensions, without
 * maintaining the aspect ratio.
 */
export type ExactDimensionResize = {
  __typename?: 'ExactDimensionResize';
  /** The height (in pixels) the resulting image should be resized to */
  height: Scalars['Int']['output'];
  /** The width (in pixels) the resulting image should be resized to */
  width: Scalars['Int']['output'];
};

/**
 * A resize option which will resize the image to the given dimensions, without
 * maintaining the aspect ratio.
 */
export type ExactDimensionResizeInput = {
  /** The height (in pixels) the resulting image should be resized to */
  height: Scalars['Int']['input'];
  /** The width (in pixels) the resulting image should be resized to */
  width: Scalars['Int']['input'];
};

export type ExternalJobOutput = {
  __typename?: 'ExternalJobOutput';
  val: Scalars['JSON']['output'];
};

export type FieldFilterFileStatus =
  { anyOf: Array<FileStatus>; contains?: never; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains: FileStatus; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith: FileStatus; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq: FileStatus; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes: FileStatus; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes?: never; like: FileStatus; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf: Array<FileStatus>; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf: Array<FileStatus>; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq: FileStatus; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf: Array<FileStatus>; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith: FileStatus; };

export type FieldFilterString =
  { anyOf: Array<Scalars['String']['input']>; contains?: never; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains: Scalars['String']['input']; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith: Scalars['String']['input']; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq: Scalars['String']['input']; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes: Scalars['String']['input']; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes?: never; like: Scalars['String']['input']; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf: Array<Scalars['String']['input']>; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf: Array<Scalars['String']['input']>; neq?: never; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq: Scalars['String']['input']; noneOf?: never; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf: Array<Scalars['String']['input']>; startsWith?: never; }
  |  { anyOf?: never; contains?: never; endsWith?: never; eq?: never; excludes?: never; like?: never; likeAnyOf?: never; likeNoneOf?: never; neq?: never; noneOf?: never; startsWith: Scalars['String']['input']; };

/** The different statuses a file reference can have */
export enum FileStatus {
  Error = 'ERROR',
  Missing = 'MISSING',
  Ready = 'READY',
  Unknown = 'UNKNOWN',
  Unsupported = 'UNSUPPORTED'
}

export enum FilterableArrangementEntity {
  Books = 'BOOKS',
  BookClubs = 'BOOK_CLUBS',
  Libraries = 'LIBRARIES',
  Series = 'SERIES',
  SmartLists = 'SMART_LISTS'
}

export enum FilterableArrangementEntityLink {
  Create = 'CREATE',
  ShowAll = 'SHOW_ALL'
}

export type FilterableArrangementEntityLinkInput = {
  entity: FilterableArrangementEntity;
  filter?: InputMaybe<Scalars['JSON']['input']>;
  links?: Array<FilterableArrangementEntityLink>;
  name?: InputMaybe<Scalars['String']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
};

export type FinishedReadingSession = {
  __typename?: 'FinishedReadingSession';
  completedAt: Scalars['DateTime']['output'];
  deviceId?: Maybe<Scalars['String']['output']>;
  elapsedSeconds?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  mediaId: Scalars['String']['output'];
  startedAt: Scalars['DateTime']['output'];
  userId: Scalars['String']['output'];
};

export type FinishedReadingSessionModel = {
  __typename?: 'FinishedReadingSessionModel';
  completedAt: Scalars['DateTime']['output'];
  deviceId?: Maybe<Scalars['String']['output']>;
  elapsedSeconds?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  mediaId: Scalars['String']['output'];
  startedAt: Scalars['DateTime']['output'];
  userId: Scalars['String']['output'];
};

/** Options for processing images throughout Stump. */
export type ImageProcessorOptions = {
  __typename?: 'ImageProcessorOptions';
  /** The format to use when generating an image. See [`SupportedImageFormat`] */
  format: SupportedImageFormat;
  /** The page to use when generating an image. This is not applicable to all media formats. */
  page?: Maybe<Scalars['Int']['output']>;
  /**
   * The quality to use when generating an image. This is a number between 1 and 100,
   * where 100 is the highest quality. Omitting this value will use the default quality
   * of 100.
   */
  quality?: Maybe<Scalars['Int']['output']>;
  /** The size factor to use when generating an image. See [`ImageResizeOptions`] */
  resizeMethod?: Maybe<ImageResizeMethod>;
};

/** Options for processing images throughout Stump. */
export type ImageProcessorOptionsInput = {
  /** The format to use when generating an image. See [`SupportedImageFormat`] */
  format: SupportedImageFormat;
  /** The page to use when generating an image. This is not applicable to all media formats. */
  page?: InputMaybe<Scalars['Int']['input']>;
  /**
   * The quality to use when generating an image. This is a number between 1 and 100,
   * where 100 is the highest quality. Omitting this value will use the default quality
   * of 100.
   */
  quality?: InputMaybe<Scalars['Int']['input']>;
  /** The size factor to use when generating an image. See [`ImageResizeOptions`] */
  resizeMethod?: InputMaybe<ImageResizeMethodInput>;
};

export type ImageRef = {
  __typename?: 'ImageRef';
  height?: Maybe<Scalars['Int']['output']>;
  url: Scalars['String']['output'];
  width?: Maybe<Scalars['Int']['output']>;
};

/** The resize options to use when generating an image */
export type ImageResizeMethod = ExactDimensionResize | ScaleEvenlyByFactor | ScaledDimensionResize;

/** The resize options to use when generating an image */
export type ImageResizeMethodInput =
  { exact: ExactDimensionResizeInput; scaleDimension?: never; scaleEvenlyByFactor?: never; }
  |  { exact?: never; scaleDimension: ScaledDimensionResizeInput; scaleEvenlyByFactor?: never; }
  |  { exact?: never; scaleDimension?: never; scaleEvenlyByFactor: ScaleEvenlyByFactorInput; };

export type InProgressBooks = {
  __typename?: 'InProgressBooks';
  links: Array<FilterableArrangementEntityLink>;
  name?: Maybe<Scalars['String']['output']>;
};

export type InProgressBooksInput = {
  links?: Array<FilterableArrangementEntityLink>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type InheritPermissionStruct = {
  __typename?: 'InheritPermissionStruct';
  value: InheritPermissionValue;
};

export enum InheritPermissionValue {
  Inherit = 'INHERIT'
}

/**
 * The different types of layouts a client-side interface might present to a user
 * for a collection of items
 */
export enum InterfaceLayout {
  Grid = 'GRID',
  Table = 'TABLE'
}

export type Job = {
  __typename?: 'Job';
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  logCount: Scalars['Int']['output'];
  logs: Array<Log>;
  msElapsed: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  outputData?: Maybe<CoreJobOutput>;
  saveState?: Maybe<Scalars['JSON']['output']>;
  status: JobStatus;
};

export type JobOutput = {
  __typename?: 'JobOutput';
  id: Scalars['String']['output'];
  output: CoreJobOutput;
};

export type JobStarted = {
  __typename?: 'JobStarted';
  id: Scalars['String']['output'];
};

export enum JobStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Paused = 'PAUSED',
  Queued = 'QUEUED',
  Running = 'RUNNING'
}

/** An update event that is emitted by a job */
export type JobUpdate = {
  __typename?: 'JobUpdate';
  /** The current subtask being worked on */
  completedSubtasks?: Maybe<Scalars['Int']['output']>;
  /** The current task being worked on */
  completedTasks?: Maybe<Scalars['Int']['output']>;
  id: Scalars['String']['output'];
  /** The message to display */
  message?: Maybe<Scalars['String']['output']>;
  /**
   * The number of tasks for the job. This number can change as
   * subtasks get added/converted to tasks
   */
  remainingTasks?: Maybe<Scalars['Int']['output']>;
  /** The status of the job */
  status?: Maybe<JobStatus>;
  /** The number of subtasks that exist in the current task */
  totalSubtasks?: Maybe<Scalars['Int']['output']>;
};

export type Library = {
  __typename?: 'Library';
  config: LibraryConfig;
  configId: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  emoji?: Maybe<Scalars['String']['output']>;
  excludedUsers: Array<User>;
  id: Scalars['String']['output'];
  isFavorite: Scalars['Boolean']['output'];
  /** Get the details of the last scan job for this library, if any exists. */
  lastScan?: Maybe<LibraryScanRecord>;
  lastScannedAt?: Maybe<Scalars['DateTime']['output']>;
  mediaAlphabet: Scalars['JSONObject']['output'];
  name: Scalars['String']['output'];
  path: Scalars['String']['output'];
  /** Get the full history of scan jobs for this library. */
  scanHistory: Array<LibraryScanRecord>;
  series: Array<Series>;
  seriesAlphabet: Scalars['JSONObject']['output'];
  stats: LibraryStats;
  status: FileStatus;
  tags: Array<Tag>;
  /**
   * A reference to the thumbnail image for the thumbnail. This will be a fully
   * qualified URL to the image.
   */
  thumbnail: ImageRef;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type LibraryStatsArgs = {
  allUsers?: InputMaybe<Scalars['Boolean']['input']>;
};

export type LibraryConfig = {
  __typename?: 'LibraryConfig';
  convertRarToZip: Scalars['Boolean']['output'];
  defaultReadingDir: ReadingDirection;
  defaultReadingImageScaleFit: ReadingImageScaleFit;
  defaultReadingMode: ReadingMode;
  generateFileHashes: Scalars['Boolean']['output'];
  generateKoreaderHashes: Scalars['Boolean']['output'];
  hardDeleteConversions: Scalars['Boolean']['output'];
  id: Scalars['Int']['output'];
  ignoreRules?: Maybe<Array<Scalars['String']['output']>>;
  libraryId?: Maybe<Scalars['String']['output']>;
  libraryPattern: LibraryPattern;
  processMetadata: Scalars['Boolean']['output'];
  thumbnailConfig?: Maybe<ImageProcessorOptions>;
  watch: Scalars['Boolean']['output'];
};

export type LibraryConfigInput = {
  convertRarToZip: Scalars['Boolean']['input'];
  defaultReadingDir: ReadingDirection;
  defaultReadingImageScaleFit: ReadingImageScaleFit;
  defaultReadingMode: ReadingMode;
  generateFileHashes: Scalars['Boolean']['input'];
  generateKoreaderHashes: Scalars['Boolean']['input'];
  hardDeleteConversions: Scalars['Boolean']['input'];
  ignoreRules?: InputMaybe<Array<Scalars['String']['input']>>;
  libraryPattern: LibraryPattern;
  processMetadata: Scalars['Boolean']['input'];
  thumbnailConfig?: InputMaybe<ImageProcessorOptionsInput>;
  watch: Scalars['Boolean']['input'];
};

export type LibraryFilterInput = {
  _and?: InputMaybe<Array<LibraryFilterInput>>;
  _not?: InputMaybe<Array<LibraryFilterInput>>;
  _or?: InputMaybe<Array<LibraryFilterInput>>;
  id?: InputMaybe<FieldFilterString>;
  name?: InputMaybe<FieldFilterString>;
  path?: InputMaybe<FieldFilterString>;
};

export type LibraryModelOrderBy = {
  direction: OrderDirection;
  field: LibraryModelOrdering;
};

export enum LibraryModelOrdering {
  ConfigId = 'CONFIG_ID',
  CreatedAt = 'CREATED_AT',
  Description = 'DESCRIPTION',
  Emoji = 'EMOJI',
  Id = 'ID',
  LastScannedAt = 'LAST_SCANNED_AT',
  Name = 'NAME',
  Path = 'PATH',
  Status = 'STATUS',
  UpdatedAt = 'UPDATED_AT'
}

/** The different patterns a library may be organized by */
export enum LibraryPattern {
  CollectionBased = 'COLLECTION_BASED',
  SeriesBased = 'SERIES_BASED'
}

/** The data that is collected and updated during the execution of a library scan job */
export type LibraryScanOutput = {
  __typename?: 'LibraryScanOutput';
  /** The number of media entities created */
  createdMedia: Scalars['Int']['output'];
  /** The number of series entities created */
  createdSeries: Scalars['Int']['output'];
  /** The number of ignored directories during the scan */
  ignoredDirectories: Scalars['Int']['output'];
  /** The number of files that were ignored during the scan */
  ignoredFiles: Scalars['Int']['output'];
  /**
   * The number of files that were deemed to be skipped during the scan, e.g. it
   * exists in the database but has not been modified since the last scan
   */
  skippedFiles: Scalars['Int']['output'];
  /** The number of directories visited during the scan */
  totalDirectories: Scalars['Int']['output'];
  /** The number of files visited during the scan */
  totalFiles: Scalars['Int']['output'];
  /** The number of media entities updated */
  updatedMedia: Scalars['Int']['output'];
  /** The number of series entities updated */
  updatedSeries: Scalars['Int']['output'];
};

export type LibraryScanRecord = {
  __typename?: 'LibraryScanRecord';
  id: Scalars['Int']['output'];
  jobId?: Maybe<Scalars['String']['output']>;
  libraryId: Scalars['String']['output'];
  options?: Maybe<Scalars['JSON']['output']>;
  timestamp: Scalars['DateTime']['output'];
};

export type LibraryStats = {
  __typename?: 'LibraryStats';
  bookCount: Scalars['Int']['output'];
  completedBooks: Scalars['Int']['output'];
  inProgressBooks: Scalars['Int']['output'];
  seriesCount: Scalars['Int']['output'];
  totalBytes: Scalars['Int']['output'];
};

export type Log = {
  __typename?: 'Log';
  context?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  jobId?: Maybe<Scalars['String']['output']>;
  level: LogLevel;
  message: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
};

export type LogDeleteOutput = {
  __typename?: 'LogDeleteOutput';
  deleted: Scalars['Int']['output'];
};

export type LogFileInfo = {
  __typename?: 'LogFileInfo';
  modified: Scalars['String']['output'];
  path: Scalars['String']['output'];
  size: Scalars['Int']['output'];
};

export type LogFilterInput = {
  _and?: InputMaybe<Array<LogFilterInput>>;
  _not?: InputMaybe<Array<LogFilterInput>>;
  _or?: InputMaybe<Array<LogFilterInput>>;
  jobId?: InputMaybe<FieldFilterString>;
  level?: InputMaybe<FieldFilterString>;
};

export enum LogLevel {
  Debug = 'DEBUG',
  Error = 'ERROR',
  Info = 'INFO',
  Warn = 'WARN'
}

export type LogModelOrderBy = {
  direction: OrderDirection;
  field: LogModelOrdering;
};

export enum LogModelOrdering {
  Context = 'CONTEXT',
  Id = 'ID',
  JobId = 'JOB_ID',
  Level = 'LEVEL',
  Message = 'MESSAGE',
  Timestamp = 'TIMESTAMP'
}

export type Media = {
  __typename?: 'Media';
  /** The timestamp of the creation of the media */
  createdAt: Scalars['DateTime']['output'];
  /** The timestamp of when the media was **soft** deleted. This will act like a trash bin. */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The extension of the media file, excluding the leading period */
  extension: Scalars['String']['output'];
  /**
   * A Stump-specific hash of the media file. This is used as a secondary identifier for the media, primarily
   * in aiding in the identification of duplicate media files
   */
  hash?: Maybe<Scalars['String']['output']>;
  /** The unique identifier for the media */
  id: Scalars['String']['output'];
  isFavorite: Scalars['Boolean']['output'];
  /**
   * A hash of the media file that adheres to the KoReader hash algorithm. This is used to identify
   * books from the KoReader application so progress can be synced between the two applications
   */
  koreaderHash?: Maybe<Scalars['String']['output']>;
  library: Library;
  libraryConfig: LibraryConfig;
  metadata?: Maybe<MediaMetadata>;
  /**
   * The timestamp of when the underlying file was last modified on disk. This will only be set if
   * a timestamp can be retrieved from the filesystem
   */
  modifiedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The name of the media, derived from the filename and excluding the extension */
  name: Scalars['String']['output'];
  /** The next media in the series, ordered by name */
  nextInSeries: PaginatedMediaResponse;
  /** The number of pages in the media, if applicable. Will be -1 for certain media types */
  pages: Scalars['Int']['output'];
  /** The path of the underlying media file on disk */
  path: Scalars['String']['output'];
  readHistory: Array<FinishedReadingSession>;
  readProgress?: Maybe<ActiveReadingSession>;
  /**
   * The path to the media file **relative** to the library path. This is only useful for
   * displaying a truncated path when in the context of a library, e.g. limited space
   * on a mobile device.
   */
  relativeLibraryPath: Scalars['String']['output'];
  /**
   * The resolved name of the media, which will prioritize the title pulled from
   * metatadata, if available, and fallback to the name derived from the file name
   */
  resolvedName: Scalars['String']['output'];
  series: Series;
  /**
   * The unique identifier of the series that the media belongs to. While this is nullable, it is
   * expected that all media will belong to a series
   */
  seriesId?: Maybe<Scalars['String']['output']>;
  /** The size of the media file in bytes */
  size: Scalars['Int']['output'];
  /**
   * The status of the media. This is used to determine if the media is available for reading (i.e.,
   * if it is available on disk)
   */
  status: FileStatus;
  tags: Array<Tag>;
  /**
   * A reference to the thumbnail image for the media. This will be a fully
   * qualified URL to the image.
   */
  thumbnail: ImageRef;
  /** The timestamp of the last time the media was updated. This will be set during creation, as well */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type MediaNextInSeriesArgs = {
  pagination?: Pagination;
};

export type MediaAnnotationsModel = {
  __typename?: 'MediaAnnotationsModel';
  epubcfi?: Maybe<Scalars['String']['output']>;
  highlightedText?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  mediaId: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  page?: Maybe<Scalars['Int']['output']>;
  pageCoordinatesX?: Maybe<Scalars['Decimal']['output']>;
  pageCoordinatesY?: Maybe<Scalars['Decimal']['output']>;
  userId: Scalars['String']['output'];
};

export type MediaFilterInput = {
  _and?: InputMaybe<Array<MediaFilterInput>>;
  _not?: InputMaybe<Array<MediaFilterInput>>;
  _or?: InputMaybe<Array<MediaFilterInput>>;
  createdAt?: InputMaybe<NumericFilterDateTime>;
  extension?: InputMaybe<FieldFilterString>;
  metadata?: InputMaybe<MediaMetadataFilterInput>;
  name?: InputMaybe<FieldFilterString>;
  pages?: InputMaybe<NumericFilterI32>;
  path?: InputMaybe<FieldFilterString>;
  readingStatus?: InputMaybe<ComputedFilterReadingStatus>;
  series?: InputMaybe<SeriesFilterInput>;
  seriesId?: InputMaybe<FieldFilterString>;
  size?: InputMaybe<NumericFilterI64>;
  status?: InputMaybe<FieldFilterFileStatus>;
  updatedAt?: InputMaybe<NumericFilterDateTime>;
};

export type MediaMetadata = {
  __typename?: 'MediaMetadata';
  ageRating?: Maybe<Scalars['Int']['output']>;
  characters: Array<Scalars['String']['output']>;
  colorists: Array<Scalars['String']['output']>;
  coverArtists: Array<Scalars['String']['output']>;
  day?: Maybe<Scalars['Int']['output']>;
  editors: Array<Scalars['String']['output']>;
  genres: Array<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  identifierAmazon?: Maybe<Scalars['String']['output']>;
  identifierCalibre?: Maybe<Scalars['String']['output']>;
  identifierGoogle?: Maybe<Scalars['String']['output']>;
  identifierIsbn?: Maybe<Scalars['String']['output']>;
  identifierMobiAsin?: Maybe<Scalars['String']['output']>;
  identifierUuid?: Maybe<Scalars['String']['output']>;
  inkers: Array<Scalars['String']['output']>;
  language?: Maybe<Scalars['String']['output']>;
  letterers: Array<Scalars['String']['output']>;
  links: Array<Scalars['String']['output']>;
  mediaId?: Maybe<Scalars['String']['output']>;
  month?: Maybe<Scalars['Int']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  number?: Maybe<Scalars['Decimal']['output']>;
  pageAnalysis?: Maybe<PageAnalysis>;
  pageCount?: Maybe<Scalars['Int']['output']>;
  pencillers: Array<Scalars['String']['output']>;
  publisher?: Maybe<Scalars['String']['output']>;
  series?: Maybe<Scalars['String']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
  teams: Array<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  titleSort?: Maybe<Scalars['String']['output']>;
  volume?: Maybe<Scalars['Int']['output']>;
  writers: Array<Scalars['String']['output']>;
  year?: Maybe<Scalars['Int']['output']>;
};

export type MediaMetadataFilterInput = {
  _and?: InputMaybe<Array<MediaMetadataFilterInput>>;
  _not?: InputMaybe<Array<MediaMetadataFilterInput>>;
  _or?: InputMaybe<Array<MediaMetadataFilterInput>>;
  ageRating?: InputMaybe<NumericFilterI32>;
  characters?: InputMaybe<FieldFilterString>;
  colorists?: InputMaybe<FieldFilterString>;
  coverArtists?: InputMaybe<FieldFilterString>;
  day?: InputMaybe<NumericFilterI32>;
  editors?: InputMaybe<FieldFilterString>;
  genres?: InputMaybe<FieldFilterString>;
  inkers?: InputMaybe<FieldFilterString>;
  letterers?: InputMaybe<FieldFilterString>;
  links?: InputMaybe<FieldFilterString>;
  month?: InputMaybe<NumericFilterI32>;
  pencillers?: InputMaybe<FieldFilterString>;
  publisher?: InputMaybe<FieldFilterString>;
  series?: InputMaybe<NumericFilterI32>;
  summary?: InputMaybe<FieldFilterString>;
  teams?: InputMaybe<FieldFilterString>;
  title?: InputMaybe<FieldFilterString>;
  writers?: InputMaybe<FieldFilterString>;
  year?: InputMaybe<NumericFilterI32>;
};

export type MediaMetadataInput = {
  ageRating?: InputMaybe<Scalars['Int']['input']>;
  characters?: InputMaybe<Array<Scalars['String']['input']>>;
  colorists?: InputMaybe<Array<Scalars['String']['input']>>;
  coverArtists?: InputMaybe<Array<Scalars['String']['input']>>;
  day?: InputMaybe<Scalars['Int']['input']>;
  editors?: InputMaybe<Array<Scalars['String']['input']>>;
  genres?: InputMaybe<Array<Scalars['String']['input']>>;
  identifierAmazon?: InputMaybe<Scalars['String']['input']>;
  identifierCalibre?: InputMaybe<Scalars['String']['input']>;
  identifierGoogle?: InputMaybe<Scalars['String']['input']>;
  identifierIsbn?: InputMaybe<Scalars['String']['input']>;
  identifierMobiAsin?: InputMaybe<Scalars['String']['input']>;
  identifierUuid?: InputMaybe<Scalars['String']['input']>;
  inkers?: InputMaybe<Array<Scalars['String']['input']>>;
  language?: InputMaybe<Scalars['String']['input']>;
  letterers?: InputMaybe<Array<Scalars['String']['input']>>;
  links?: InputMaybe<Array<Scalars['String']['input']>>;
  month?: InputMaybe<Scalars['Int']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  number?: InputMaybe<Scalars['Decimal']['input']>;
  pageCount?: InputMaybe<Scalars['Int']['input']>;
  pencillers?: InputMaybe<Array<Scalars['String']['input']>>;
  publisher?: InputMaybe<Scalars['String']['input']>;
  series?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  teams?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  titleSort?: InputMaybe<Scalars['String']['input']>;
  volume?: InputMaybe<Scalars['Int']['input']>;
  writers?: InputMaybe<Array<Scalars['String']['input']>>;
  year?: InputMaybe<Scalars['Int']['input']>;
};

export enum MediaMetadataModelOrdering {
  AgeRating = 'AGE_RATING',
  Characters = 'CHARACTERS',
  Colorists = 'COLORISTS',
  CoverArtists = 'COVER_ARTISTS',
  Day = 'DAY',
  Editors = 'EDITORS',
  Genres = 'GENRES',
  Id = 'ID',
  IdentifierAmazon = 'IDENTIFIER_AMAZON',
  IdentifierCalibre = 'IDENTIFIER_CALIBRE',
  IdentifierGoogle = 'IDENTIFIER_GOOGLE',
  IdentifierIsbn = 'IDENTIFIER_ISBN',
  IdentifierMobiAsin = 'IDENTIFIER_MOBI_ASIN',
  IdentifierUuid = 'IDENTIFIER_UUID',
  Inkers = 'INKERS',
  Language = 'LANGUAGE',
  Letterers = 'LETTERERS',
  Links = 'LINKS',
  MediaId = 'MEDIA_ID',
  Month = 'MONTH',
  Notes = 'NOTES',
  Number = 'NUMBER',
  PageAnalysis = 'PAGE_ANALYSIS',
  PageCount = 'PAGE_COUNT',
  Pencillers = 'PENCILLERS',
  Publisher = 'PUBLISHER',
  Series = 'SERIES',
  Summary = 'SUMMARY',
  Teams = 'TEAMS',
  Title = 'TITLE',
  TitleSort = 'TITLE_SORT',
  Volume = 'VOLUME',
  Writers = 'WRITERS',
  Year = 'YEAR'
}

export type MediaMetadataOrderByField = {
  direction: OrderDirection;
  field: MediaMetadataModelOrdering;
};

export type MediaMetadataOverview = {
  __typename?: 'MediaMetadataOverview';
  characters: Array<Scalars['String']['output']>;
  colorists: Array<Scalars['String']['output']>;
  editors: Array<Scalars['String']['output']>;
  genres: Array<Scalars['String']['output']>;
  inkers: Array<Scalars['String']['output']>;
  letterers: Array<Scalars['String']['output']>;
  pencillers: Array<Scalars['String']['output']>;
  publishers: Array<Scalars['String']['output']>;
  teams: Array<Scalars['String']['output']>;
  writers: Array<Scalars['String']['output']>;
};

export enum MediaModelOrdering {
  CreatedAt = 'CREATED_AT',
  DeletedAt = 'DELETED_AT',
  Extension = 'EXTENSION',
  Hash = 'HASH',
  Id = 'ID',
  KoreaderHash = 'KOREADER_HASH',
  ModifiedAt = 'MODIFIED_AT',
  Name = 'NAME',
  Pages = 'PAGES',
  Path = 'PATH',
  SeriesId = 'SERIES_ID',
  Size = 'SIZE',
  Status = 'STATUS',
  UpdatedAt = 'UPDATED_AT'
}

export type MediaOrderBy =
  { media: MediaOrderByField; metadata?: never; }
  |  { media?: never; metadata: MediaMetadataOrderByField; };

export type MediaOrderByField = {
  direction: OrderDirection;
  field: MediaModelOrdering;
};

export type MediaProgressInput =
  { epub: EpubProgressInput; paged?: never; }
  |  { epub?: never; paged: PagedProgressInput; };

/**
 * An enum representing the different types of metadata resets that can occur,
 * which manifest differently depending on the context
 */
export enum MetadataResetImpact {
  /**
   * A reset which affects one or more books depending on context:
   * - When mutating a library, will reset all book metadata in all
   * library's series
   * - When mutating a series, will reset all its own books
   * - When mutating a book, will reset all its own metadata
   */
  Books = 'BOOKS',
  /**
   * A reset which affects multiple different entities (series, books) depending on context:
   * - When mutating a library, will reset all metadata in all library's series and books
   * - When mutating a series, will reset all its own metadata and books
   */
  Everything = 'EVERYTHING',
  /**
   * A reset which affects one or more series depending on context:
   * - When mutating a library, will reset all series metadata
   * - When mutating a series, will reset all its own metadata
   */
  Series = 'SERIES'
}

export type Mutation = {
  __typename?: 'Mutation';
  addBooksToBookClubSchedule: BookClub;
  analyzeMedia: Scalars['Boolean']['output'];
  analyzeSeries: Scalars['Boolean']['output'];
  cancelJob: Scalars['Boolean']['output'];
  /**
   * Delete media and series from a library that match one of the following conditions:
   *
   * - A series that is missing from disk (status is not `Ready`)
   * - A media that is missing from disk (status is not `Ready`)
   * - A series that is not associated with any media (i.e., no media in the series)
   *
   * This operation will also remove any associated thumbnails of the deleted media and series.
   */
  cleanLibrary: CleanLibraryResponse;
  /** Clear the scan history for a specific library */
  clearScanHistory: Scalars['Int']['output'];
  convertMedia: Scalars['Boolean']['output'];
  createApiKey: CreatedApiKey;
  createBookClub: BookClub;
  createBookClubInvitation: BookClubInvitation;
  /** Creates a new member in the book club */
  createBookClubMember: BookClubMember;
  createBookClubSchedule: BookClub;
  createEmailDevice: RegisteredEmailDevice;
  createEmailer: Emailer;
  /**
   * Create a new library with the provided configuration. If `scan_after_persist` is `true`,
   * the library will be scanned immediately after creation.
   */
  createLibrary: Library;
  createNotifier: Notifier;
  /**
   * Create or update a bookmark for a user. If a bookmark already exists for the given media
   * and epubcfi, the preview content is updated.
   */
  createOrUpdateBookmark: Bookmark;
  /**
   * Creates a new reading list.
   *
   * # Returns
   *
   * A result containing the newly created reading list, or an error if creation failed.
   */
  createReadingList: ReadingList;
  createScheduledJobConfig: ScheduledJobConfig;
  createSmartList: SmartList;
  createSmartListView: SmartListView;
  /**
   * Returns a list containing the newly created tags, or an error if creation failed.
   *
   * If any of the tags already exist an error is returned.
   *
   * * `tags` - A non-empty list of tags to create.
   */
  createTags: Array<Tag>;
  createUser: User;
  deleteApiKey: Apikey;
  deleteBookClub: BookClub;
  /** Delete a bookmark by epubcfi. The user must be the owner of the bookmark. */
  deleteBookmark: Bookmark;
  deleteEmailDevice: RegisteredEmailDevice;
  deleteEmailer: Emailer;
  deleteJob: Scalars['Boolean']['output'];
  deleteJobHistory: DeleteJobHistory;
  deleteJobLogs: DeleteJobAssociatedLogs;
  /**
   * Delete a library, including all associated media and series via cascading deletes. This
   * operation cannot be undone.
   */
  deleteLibrary: Library;
  deleteLibraryScanHistory: Library;
  deleteLibraryThumbnails: Scalars['Boolean']['output'];
  deleteLogFile: Scalars['Boolean']['output'];
  deleteLoginActivity: Scalars['Int']['output'];
  deleteLogs: LogDeleteOutput;
  deleteMedia: Media;
  deleteMediaProgress: Media;
  /**
   * Deletes all of a user's reading history for a specific media item. This cannot be undone, so
   * use with caution.
   */
  deleteMediaReadHistory: Media;
  deleteNotifier: Notifier;
  /**
   * Deletes a reading list by ID.
   *
   * # Returns
   *
   * A result containing the deleted reading list, or an error if deletion failed.
   */
  deleteReadingList: ReadingList;
  deleteScheduledJobConfig: Scalars['Boolean']['output'];
  deleteSmartList: SmartList;
  deleteSmartListView: SmartListView;
  /**
   * Delete tags. Returns a list containing the deleted tags, or an error if deletion failed.
   *
   * * `tags` - A non-empty list of tags to create.
   */
  deleteTags: Array<Tag>;
  deleteUser: User;
  deleteUserSessions: Scalars['Int']['output'];
  favoriteMedia: Media;
  favoriteSeries: Series;
  generateLibraryThumbnails: Scalars['Boolean']['output'];
  /** Deletes the membership of the caller to the target book club */
  leaveBookClub: BookClubMember;
  markMediaAsComplete?: Maybe<FinishedReadingSessionModel>;
  markSeriesAsComplete: Series;
  patchEmailDevice: Scalars['Int']['output'];
  /** Removes a member from the book club */
  removeBookClubMember: BookClubMember;
  resetLibraryMetadata: Library;
  resetSeriesMetadata: Series;
  respondToBookClubInvitation: BookClubInvitation;
  /**
   * Enqueue a scan job for a library. This will index the filesystem from the library's root path
   * and update the database accordingly.
   */
  scanLibrary: Scalars['Boolean']['output'];
  scanSeries: Scalars['Boolean']['output'];
  sendAttachmentEmail: SendAttachmentEmailOutput;
  updateApiKey: Apikey;
  updateBookClub: BookClub;
  updateEmailDevice: RegisteredEmailDevice;
  updateEmailer: Emailer;
  /**
   * Update an existing library with the provided configuration. If `scan_after_persist` is `true`,
   * the library will be scanned immediately after updating.
   */
  updateLibrary: Library;
  /** Update the emoji for a library */
  updateLibraryEmoji: Library;
  /**
   * Exclude users from a library, preventing them from seeing the library in the UI. This operates as a
   * full replacement of the excluded users list, so any users not included in the provided list will be
   * removed from the exclusion list if they were previously excluded.
   *
   * The server owner cannot be excluded from a library, nor can the user performing the action exclude
   * themselves.
   */
  updateLibraryExcludedUsers: Library;
  /**
   * Update the thumbnail for a library. This will replace the existing thumbnail with the the one
   * associated with the provided input (book). If the book does not have a thumbnail, one
   * will be generated based on the library's thumbnail configuration.
   */
  updateLibraryThumbnail: Library;
  updateMediaMetadata: Media;
  updateMediaProgress: ReadingProgressOutput;
  /**
   * Update the thumbnail for a book. This will replace the existing thumbnail with the the one
   * associated with the provided input (book). If the book does not have a thumbnail, one
   * will be generated based on the library's thumbnail configuration.
   */
  updateMediaThumbnail: Media;
  updateNavigationArrangement: Arrangement;
  updateNavigationArrangementLock: Arrangement;
  updateNotifier: Notifier;
  /**
   * Updates an existing reading list.
   *
   * # Returns
   *
   * A result containing the updated reading list, or an error if update failed.
   */
  updateReadingList: ReadingList;
  updateScheduledJobConfig: ScheduledJobConfig;
  updateSeriesMetadata: Series;
  /**
   * Update the thumbnail for a series. This will replace the existing thumbnail with the the one
   * associated with the provided input (book). If the book does not have a thumbnail, one
   * will be generated based on the library's thumbnail configuration.
   */
  updateSeriesThumbnail: Series;
  updateSmartList: SmartList;
  updateSmartListView: SmartListView;
  updateUser: User;
  updateUserLockStatus: User;
  updateViewer: User;
  updateViewerPreferences: UserPreferences;
  uploadBooks: Scalars['Boolean']['output'];
  uploadLibraryThumbnail: Library;
  uploadMediaThumbnail: Media;
  uploadSeries: Scalars['Boolean']['output'];
  uploadSeriesThumbnail: Series;
  /**
   * "Visit" a library, which will upsert a record of the user's last visit to the library.
   * This is used to inform the UI of the last library which was visited by the user
   */
  visitLibrary: Library;
};


export type MutationAddBooksToBookClubScheduleArgs = {
  books: Array<CreateBookClubScheduleBook>;
  id: Scalars['ID']['input'];
};


export type MutationAnalyzeMediaArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAnalyzeSeriesArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCancelJobArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCleanLibraryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationClearScanHistoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationConvertMediaArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreateApiKeyArgs = {
  input: ApikeyInput;
};


export type MutationCreateBookClubArgs = {
  input: CreateBookClubInput;
};


export type MutationCreateBookClubInvitationArgs = {
  id: Scalars['ID']['input'];
  input: BookClubInvitationInput;
};


export type MutationCreateBookClubMemberArgs = {
  bookClubId: Scalars['ID']['input'];
  input: CreateBookClubMemberInput;
};


export type MutationCreateBookClubScheduleArgs = {
  id: Scalars['ID']['input'];
  input: CreateBookClubScheduleInput;
};


export type MutationCreateEmailDeviceArgs = {
  input: EmailDeviceInput;
};


export type MutationCreateEmailerArgs = {
  input: EmailerInput;
};


export type MutationCreateLibraryArgs = {
  input: CreateOrUpdateLibraryInput;
};


export type MutationCreateNotifierArgs = {
  input: NotifierInput;
};


export type MutationCreateOrUpdateBookmarkArgs = {
  input: BookmarkInput;
};


export type MutationCreateReadingListArgs = {
  input: ReadingListInput;
};


export type MutationCreateScheduledJobConfigArgs = {
  input: ScheduledJobConfigInput;
};


export type MutationCreateSmartListArgs = {
  input: SaveSmartListInput;
};


export type MutationCreateSmartListViewArgs = {
  input: SaveSmartListView;
};


export type MutationCreateTagsArgs = {
  tags: Array<Scalars['String']['input']>;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationDeleteApiKeyArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteBookClubArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteBookmarkArgs = {
  epubcfi: Scalars['String']['input'];
};


export type MutationDeleteEmailDeviceArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteEmailerArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteJobArgs = {
  force?: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};


export type MutationDeleteJobLogsArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteLibraryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteLibraryScanHistoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteLibraryThumbnailsArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteLogsArgs = {
  filter?: LogFilterInput;
};


export type MutationDeleteMediaArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMediaProgressArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMediaReadHistoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteNotifierArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteReadingListArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteScheduledJobConfigArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteSmartListArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSmartListViewArgs = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


export type MutationDeleteTagsArgs = {
  tags: Array<Scalars['String']['input']>;
};


export type MutationDeleteUserArgs = {
  hardDelete?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserSessionsArgs = {
  id: Scalars['ID']['input'];
};


export type MutationFavoriteMediaArgs = {
  id: Scalars['ID']['input'];
  isFavorite: Scalars['Boolean']['input'];
};


export type MutationFavoriteSeriesArgs = {
  id: Scalars['ID']['input'];
  isFavorite: Scalars['Boolean']['input'];
};


export type MutationGenerateLibraryThumbnailsArgs = {
  forceRegenerate?: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};


export type MutationLeaveBookClubArgs = {
  bookClubId: Scalars['ID']['input'];
};


export type MutationMarkMediaAsCompleteArgs = {
  id: Scalars['ID']['input'];
  isComplete: Scalars['Boolean']['input'];
  page?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationMarkSeriesAsCompleteArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPatchEmailDeviceArgs = {
  id: Scalars['Int']['input'];
  input: EmailDeviceInput;
};


export type MutationRemoveBookClubMemberArgs = {
  bookClubId: Scalars['ID']['input'];
  memberId: Scalars['ID']['input'];
};


export type MutationResetLibraryMetadataArgs = {
  id: Scalars['ID']['input'];
  impact: MetadataResetImpact;
};


export type MutationResetSeriesMetadataArgs = {
  id: Scalars['ID']['input'];
  impact: MetadataResetImpact;
};


export type MutationRespondToBookClubInvitationArgs = {
  id: Scalars['ID']['input'];
  input: BookClubInvitationResponseInput;
};


export type MutationScanLibraryArgs = {
  id: Scalars['ID']['input'];
  options?: InputMaybe<Scalars['JSON']['input']>;
};


export type MutationScanSeriesArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSendAttachmentEmailArgs = {
  input: SendAttachmentEmailsInput;
};


export type MutationUpdateApiKeyArgs = {
  id: Scalars['Int']['input'];
  input: ApikeyInput;
};


export type MutationUpdateBookClubArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBookClubInput;
};


export type MutationUpdateEmailDeviceArgs = {
  id: Scalars['Int']['input'];
  input: EmailDeviceInput;
};


export type MutationUpdateEmailerArgs = {
  id: Scalars['Int']['input'];
  input: EmailerInput;
};


export type MutationUpdateLibraryArgs = {
  id: Scalars['ID']['input'];
  input: CreateOrUpdateLibraryInput;
};


export type MutationUpdateLibraryEmojiArgs = {
  emoji?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationUpdateLibraryExcludedUsersArgs = {
  id: Scalars['ID']['input'];
  userIds: Array<Scalars['String']['input']>;
};


export type MutationUpdateLibraryThumbnailArgs = {
  id: Scalars['ID']['input'];
  input: UpdateThumbnailInput;
};


export type MutationUpdateMediaMetadataArgs = {
  id: Scalars['ID']['input'];
  input: MediaMetadataInput;
};


export type MutationUpdateMediaProgressArgs = {
  id: Scalars['ID']['input'];
  input: MediaProgressInput;
};


export type MutationUpdateMediaThumbnailArgs = {
  id: Scalars['ID']['input'];
  input: PageBasedThumbnailInput;
};


export type MutationUpdateNavigationArrangementArgs = {
  input: NavigationArrangementInput;
};


export type MutationUpdateNavigationArrangementLockArgs = {
  locked: Scalars['Boolean']['input'];
};


export type MutationUpdateNotifierArgs = {
  id: Scalars['Int']['input'];
  input: NotifierInput;
};


export type MutationUpdateReadingListArgs = {
  input: ReadingListInput;
};


export type MutationUpdateScheduledJobConfigArgs = {
  id: Scalars['Int']['input'];
  input: ScheduledJobConfigInput;
};


export type MutationUpdateSeriesMetadataArgs = {
  id: Scalars['ID']['input'];
  input: SeriesMetadataInput;
};


export type MutationUpdateSeriesThumbnailArgs = {
  id: Scalars['ID']['input'];
  input: UpdateThumbnailInput;
};


export type MutationUpdateSmartListArgs = {
  id: Scalars['ID']['input'];
  input: SaveSmartListInput;
};


export type MutationUpdateSmartListViewArgs = {
  input: SaveSmartListView;
  originalName: Scalars['String']['input'];
};


export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};


export type MutationUpdateUserLockStatusArgs = {
  id: Scalars['ID']['input'];
  lock: Scalars['Boolean']['input'];
};


export type MutationUpdateViewerArgs = {
  input: UpdateUserInput;
};


export type MutationUpdateViewerPreferencesArgs = {
  input: UpdateUserPreferencesInput;
};


export type MutationUploadBooksArgs = {
  input: UploadBooksInput;
};


export type MutationUploadLibraryThumbnailArgs = {
  file: Scalars['Upload']['input'];
  id: Scalars['ID']['input'];
};


export type MutationUploadMediaThumbnailArgs = {
  file: Scalars['Upload']['input'];
  id: Scalars['ID']['input'];
};


export type MutationUploadSeriesArgs = {
  input: UploadSeriesInput;
};


export type MutationUploadSeriesThumbnailArgs = {
  file: Scalars['Upload']['input'];
  id: Scalars['ID']['input'];
};


export type MutationVisitLibraryArgs = {
  id: Scalars['ID']['input'];
};

export type NavigationArrangementInput = {
  sections: Array<ArrangementSectionInput>;
};

export type Notifier = {
  __typename?: 'Notifier';
  config: NotifierConfig;
  id: Scalars['Int']['output'];
  type: Scalars['String']['output'];
};

export type NotifierConfig = DiscordConfig | TelegramConfig;

export type NotifierInput =
  { discord: DiscordConfigInput; telegram?: never; }
  |  { discord?: never; telegram: TelegramConfigInput; };

export type NumericFilterDateTime =
  { anyOf: Array<Scalars['DateTime']['input']>; eq?: never; gt?: never; gte?: never; lt?: never; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq: Scalars['DateTime']['input']; gt?: never; gte?: never; lt?: never; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt: Scalars['DateTime']['input']; gte?: never; lt?: never; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte: Scalars['DateTime']['input']; lt?: never; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt: Scalars['DateTime']['input']; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt?: never; lte: Scalars['DateTime']['input']; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt?: never; lte?: never; neq: Scalars['DateTime']['input']; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt?: never; lte?: never; neq?: never; noneOf: Array<Scalars['DateTime']['input']>; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt?: never; lte?: never; neq?: never; noneOf?: never; range: NumericRangeDateTime; };

export type NumericFilterI32 =
  { anyOf: Array<Scalars['Int']['input']>; eq?: never; gt?: never; gte?: never; lt?: never; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq: Scalars['Int']['input']; gt?: never; gte?: never; lt?: never; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt: Scalars['Int']['input']; gte?: never; lt?: never; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte: Scalars['Int']['input']; lt?: never; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt: Scalars['Int']['input']; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt?: never; lte: Scalars['Int']['input']; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt?: never; lte?: never; neq: Scalars['Int']['input']; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt?: never; lte?: never; neq?: never; noneOf: Array<Scalars['Int']['input']>; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt?: never; lte?: never; neq?: never; noneOf?: never; range: NumericRangeI32; };

export type NumericFilterI64 =
  { anyOf: Array<Scalars['Int']['input']>; eq?: never; gt?: never; gte?: never; lt?: never; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq: Scalars['Int']['input']; gt?: never; gte?: never; lt?: never; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt: Scalars['Int']['input']; gte?: never; lt?: never; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte: Scalars['Int']['input']; lt?: never; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt: Scalars['Int']['input']; lte?: never; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt?: never; lte: Scalars['Int']['input']; neq?: never; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt?: never; lte?: never; neq: Scalars['Int']['input']; noneOf?: never; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt?: never; lte?: never; neq?: never; noneOf: Array<Scalars['Int']['input']>; range?: never; }
  |  { anyOf?: never; eq?: never; gt?: never; gte?: never; lt?: never; lte?: never; neq?: never; noneOf?: never; range: NumericRangeI64; };

export type NumericRangeDateTime = {
  from: Scalars['DateTime']['input'];
  inclusive: Scalars['Boolean']['input'];
  to: Scalars['DateTime']['input'];
};

export type NumericRangeI32 = {
  from: Scalars['Int']['input'];
  inclusive: Scalars['Boolean']['input'];
  to: Scalars['Int']['input'];
};

export type NumericRangeI64 = {
  from: Scalars['Int']['input'];
  inclusive: Scalars['Boolean']['input'];
  to: Scalars['Int']['input'];
};

/** A simple offset-based pagination input object */
export type OffsetPagination = {
  /**
   * The page to start from. This is 1-based by default, but can be
   * changed to 0-based by setting the `zero_based` field to true.
   */
  page: Scalars['Int']['input'];
  /** The number of items to return per page. This is 20 by default. */
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  /** Whether or not the page is zero-based. This is false by default. */
  zeroBased?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Information about the current offset pagination state */
export type OffsetPaginationInfo = {
  __typename?: 'OffsetPaginationInfo';
  /** The current page, zero-indexed. */
  currentPage: Scalars['Int']['output'];
  /** The offset of the current page. E.g. if current page is 1, and pageSize is 10, the offset is 20. */
  pageOffset: Scalars['Int']['output'];
  /** The number of elements per page. */
  pageSize: Scalars['Int']['output'];
  /**
   * The number of pages available. This is **not** affected by the zero-based flag,
   * so a client requesting zero-based pagination will need to adjust their pagination
   * logic accordingly.
   */
  totalPages: Scalars['Int']['output'];
  /** Whether or not the page is zero-indexed. */
  zeroBased: Scalars['Boolean']['output'];
};

export enum OrderDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** A struct containing the various analyses of a book in Stump, e.g., page dimensions. */
export type PageAnalysis = {
  __typename?: 'PageAnalysis';
  dimensions: Array<PageDimension>;
};

export type PageBasedThumbnailInput = {
  /** A flag indicating whether the page is zero based (i.e. 0 is the first page) */
  isZeroBased?: InputMaybe<Scalars['Boolean']['input']>;
  /** The page to pull inside the media file for generating the thumbnail */
  page: Scalars['Int']['input'];
};

/**
 * Represents a page dimension for a page of a Stump media item. It consists of a
 * height and a width.
 */
export type PageDimension = {
  __typename?: 'PageDimension';
  height: Scalars['Int']['output'];
  width: Scalars['Int']['output'];
};

export type PagedProgressInput = {
  elapsedSeconds?: InputMaybe<Scalars['Int']['input']>;
  page: Scalars['Int']['input'];
};

export type PaginatedDirectoryListingResponse = {
  __typename?: 'PaginatedDirectoryListingResponse';
  nodes: Array<DirectoryListing>;
  pageInfo: PaginationInfo;
};

export type PaginatedJobResponse = {
  __typename?: 'PaginatedJobResponse';
  nodes: Array<Job>;
  pageInfo: PaginationInfo;
};

export type PaginatedLibraryResponse = {
  __typename?: 'PaginatedLibraryResponse';
  nodes: Array<Library>;
  pageInfo: PaginationInfo;
};

export type PaginatedLogResponse = {
  __typename?: 'PaginatedLogResponse';
  nodes: Array<Log>;
  pageInfo: PaginationInfo;
};

export type PaginatedMediaResponse = {
  __typename?: 'PaginatedMediaResponse';
  nodes: Array<Media>;
  pageInfo: PaginationInfo;
};

export type PaginatedReadingListResponse = {
  __typename?: 'PaginatedReadingListResponse';
  nodes: Array<ReadingList>;
  pageInfo: PaginationInfo;
};

export type PaginatedSeriesResponse = {
  __typename?: 'PaginatedSeriesResponse';
  nodes: Array<Series>;
  pageInfo: PaginationInfo;
};

export type PaginatedUserResponse = {
  __typename?: 'PaginatedUserResponse';
  nodes: Array<User>;
  pageInfo: PaginationInfo;
};

/**
 * A union of the supported pagination flavors which Stump supports. The resulting
 * response will be dependent on the pagination type used, e.g. a [CursorPaginatedResponse]
 * will be returned if the [CursorPagination] type is used.
 *
 * You may use a conditional fragment in your GraphQL query for type-specific fields:
 * ```graphql
 * query MyQuery {
 * media(pagination: { offset: { page: 1, pageSize: 20 } }) {
 * ... on OffsetPaginationInfo {
 * totalPages
 * currentPage
 * }
 * }
 * }
 * ```
 *
 * A special case is the `None` variant, which will return an offset-based pagination info
 * object based on the size of the result set. This will not paginate the results, so be
 * cautious when using this with large result sets.
 *
 * **Note**: Be sure to call [Pagination::resolve] before using the pagination object
 * to ensure that the pagination object is in a valid state.
 */
export type Pagination =
  { cursor: CursorPagination; none?: never; offset?: never; }
  |  { cursor?: never; none: Unpaginated; offset?: never; }
  |  { cursor?: never; none?: never; offset: OffsetPagination; };

export type PaginationInfo = CursorPaginationInfo | OffsetPaginationInfo;

export type Query = {
  __typename?: 'Query';
  apiKeyById: Apikey;
  apiKeys: Array<Apikey>;
  bookClubById: BookClub;
  bookClubBySlug?: Maybe<BookClub>;
  bookClubs: Array<BookClub>;
  /** Get all bookmarks for a single epub by its media ID */
  bookmarksByMediaId: Array<Bookmark>;
  duplicateMedia: Array<Media>;
  emailDeviceById?: Maybe<RegisteredEmailDevice>;
  emailDevices: Array<RegisteredEmailDevice>;
  emailerById?: Maybe<Emailer>;
  emailers: Array<Emailer>;
  /** Get a single epub by its media ID */
  epubById: Epub;
  getNotifierById: Notifier;
  getNotifiers: Array<Notifier>;
  jobById?: Maybe<Job>;
  jobs: PaginatedJobResponse;
  keepReading: PaginatedMediaResponse;
  lastVisitedLibrary?: Maybe<Library>;
  libraries: PaginatedLibraryResponse;
  /** Returns the available alphabet for all libraries in the server */
  librariesAlphabet: Scalars['JSONObject']['output'];
  libraryById?: Maybe<Library>;
  listDirectory: PaginatedDirectoryListingResponse;
  /**
   * Get information about the Stump log file, located at STUMP_CONFIG_DIR/Stump.log, or
   * ~/.stump/Stump.log by default. Information such as the file size, last modified date, etc.
   */
  logfileInfo: LogFileInfo;
  loginActivity: Array<UserLoginActivity>;
  loginActivityById: Array<UserLoginActivity>;
  logs: PaginatedLogResponse;
  me: User;
  media: PaginatedMediaResponse;
  /** Returns the available alphabet for all media in the server */
  mediaAlphabet: Scalars['JSONObject']['output'];
  mediaById?: Maybe<Media>;
  mediaByPath?: Maybe<Media>;
  mediaMetadataOverview: MediaMetadataOverview;
  numberOfLibraries: Scalars['Int']['output'];
  numberOfSeries: Scalars['Int']['output'];
  /**
   * Retrieves a reading list by ID for the current user.
   *
   * # Returns
   * A reading list with the given ID. If no reading list with this ID exists for the current user, an error will be returned.
   */
  readingListById: ReadingList;
  /**
   * Retrieves a paginated list of reading lists for the current user.
   *
   * # Returns
   *
   * A paginated list of reading lists.
   */
  readingLists: PaginatedReadingListResponse;
  recentlyAddedMedia: PaginatedMediaResponse;
  recentlyAddedSeries: PaginatedSeriesResponse;
  scheduledJobConfigs: Array<ScheduledJobConfig>;
  series: PaginatedSeriesResponse;
  /** Returns the available alphabet for all series in the server */
  seriesAlphabet: Scalars['JSONObject']['output'];
  seriesById?: Maybe<Series>;
  smartListById?: Maybe<SmartList>;
  smartListItems: SmartListItems;
  smartListMeta?: Maybe<SmartListMeta>;
  smartListViews: Array<SmartListView>;
  smartLists: Array<SmartList>;
  stumpConfig: StumpConfig;
  /** Returns a list of all tags. */
  tags: Array<Tag>;
  uploadConfig: UploadConfig;
  userById: User;
  users: PaginatedUserResponse;
};


export type QueryApiKeyByIdArgs = {
  id: Scalars['Int']['input'];
};


export type QueryBookClubByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBookClubBySlugArgs = {
  slug: Scalars['String']['input'];
};


export type QueryBookClubsArgs = {
  all?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryBookmarksByMediaIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEmailDeviceByIdArgs = {
  id: Scalars['Int']['input'];
};


export type QueryEmailerByIdArgs = {
  id: Scalars['Int']['input'];
};


export type QueryEpubByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetNotifierByIdArgs = {
  id: Scalars['Int']['input'];
};


export type QueryJobByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryJobsArgs = {
  pagination?: Pagination;
};


export type QueryKeepReadingArgs = {
  pagination?: Pagination;
};


export type QueryLibrariesArgs = {
  orderBy?: Array<LibraryModelOrderBy>;
  pagination?: Pagination;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryLibraryByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryListDirectoryArgs = {
  input?: InputMaybe<DirectoryListingInput>;
  pagination: Pagination;
};


export type QueryLoginActivityByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLogsArgs = {
  filter?: LogFilterInput;
  orderBy?: Array<LogModelOrderBy>;
  pagination?: Pagination;
};


export type QueryMediaArgs = {
  filter?: MediaFilterInput;
  orderBy?: Array<MediaOrderBy>;
  pagination?: Pagination;
};


export type QueryMediaByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMediaByPathArgs = {
  path: Scalars['String']['input'];
};


export type QueryMediaMetadataOverviewArgs = {
  seriesId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryReadingListByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryReadingListsArgs = {
  pagination?: Pagination;
};


export type QueryRecentlyAddedMediaArgs = {
  pagination?: Pagination;
};


export type QueryRecentlyAddedSeriesArgs = {
  pagination?: Pagination;
};


export type QuerySeriesArgs = {
  filter?: SeriesFilterInput;
  orderBy?: Array<SeriesOrderBy>;
  pagination?: Pagination;
};


export type QuerySeriesByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySmartListByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySmartListItemsArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySmartListMetaArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySmartListsArgs = {
  input?: SmartListsInput;
};


export type QueryUserByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  pagination?: Pagination;
};

/** The different reading directions supported by any Stump reader */
export enum ReadingDirection {
  Ltr = 'LTR',
  Rtl = 'RTL'
}

/** The different ways an image may be scaled to fit a reader's viewport */
export enum ReadingImageScaleFit {
  Auto = 'AUTO',
  Height = 'HEIGHT',
  None = 'NONE',
  Width = 'WIDTH'
}

export type ReadingList = {
  __typename?: 'ReadingList';
  creatingUserId: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  ordering: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  visibility: Scalars['String']['output'];
};

export type ReadingListInput = {
  id: Scalars['String']['input'];
  mediaIds: Array<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  visibility?: InputMaybe<EntityVisibility>;
};

/** The different reading modes supported by any Stump reader */
export enum ReadingMode {
  ContinuousHorizontal = 'CONTINUOUS_HORIZONTAL',
  ContinuousVertical = 'CONTINUOUS_VERTICAL',
  Paged = 'PAGED'
}

export type ReadingProgressOutput = ActiveReadingSession | FinishedReadingSession;

export enum ReadingStatus {
  Abandoned = 'ABANDONED',
  Finished = 'FINISHED',
  NotStarted = 'NOT_STARTED',
  Reading = 'READING'
}

export type RecentlyAdded = {
  __typename?: 'RecentlyAdded';
  entity: FilterableArrangementEntity;
  links: Array<FilterableArrangementEntityLink>;
  name?: Maybe<Scalars['String']['output']>;
};

export type RecentlyAddedInput = {
  entity: FilterableArrangementEntity;
  links?: Array<FilterableArrangementEntityLink>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type RegisteredEmailDevice = {
  __typename?: 'RegisteredEmailDevice';
  email: Scalars['String']['output'];
  forbidden: Scalars['Boolean']['output'];
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  sendHistory: Array<EmailerSendRecord>;
};

export type SaveSmartListInput = {
  defaultGrouping: SmartListGrouping;
  description?: InputMaybe<Scalars['String']['input']>;
  filters: Array<SmartListFilterGroupInput>;
  joiner: SmartListJoiner;
  name: Scalars['String']['input'];
  visibility: EntityVisibility;
};

export type SaveSmartListView = {
  bookColumns: Array<SmartListViewColumnInput>;
  bookSorting: Array<SmartListViewSortInput>;
  enableMultiSort?: InputMaybe<Scalars['Boolean']['input']>;
  groupColumns: Array<SmartListViewColumnInput>;
  groupSorting: Array<SmartListViewSortInput>;
  listId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ScaleEvenlyByFactor = {
  __typename?: 'ScaleEvenlyByFactor';
  /**
   * The factor to scale the image by. Note that this was made a [Decimal]
   * to correct precision issues
   */
  factor: Scalars['Decimal']['output'];
};

export type ScaleEvenlyByFactorInput = {
  /**
   * The factor to scale the image by. Note that this was made a [Decimal]
   * to correct precision issues
   */
  factor: Scalars['Decimal']['input'];
};

/**
 * A resize option which will resize the image while maintaining the aspect ratio.
 * The dimension *not* specified will be calculated based on the aspect ratio.
 */
export type ScaledDimensionResize = {
  __typename?: 'ScaledDimensionResize';
  /** The dimension to set with the given size, e.g. `Height` or `Width`. */
  dimension: Dimension;
  /** The size (in pixels) to set the specified dimension to. */
  size: Scalars['Int']['output'];
};

/**
 * A resize option which will resize the image while maintaining the aspect ratio.
 * The dimension *not* specified will be calculated based on the aspect ratio.
 */
export type ScaledDimensionResizeInput = {
  /** The dimension to set with the given size, e.g. `Height` or `Width`. */
  dimension: Dimension;
  /** The size (in pixels) to set the specified dimension to. */
  size: Scalars['Int']['input'];
};

export type ScheduledJobConfig = {
  __typename?: 'ScheduledJobConfig';
  id: Scalars['Int']['output'];
  intervalSecs: Scalars['Int']['output'];
  scanConfigs: Array<Library>;
};

export type ScheduledJobConfigInput = {
  includedLibraryIds: Array<Scalars['String']['input']>;
  intervalSecs: Scalars['Int']['input'];
};

export type SendAttachmentEmailOutput = {
  __typename?: 'SendAttachmentEmailOutput';
  errors: Array<Scalars['String']['output']>;
  sentCount: Scalars['Int']['output'];
};

export type SendAttachmentEmailsInput = {
  mediaIds: Array<Scalars['ID']['input']>;
  sendTo: Array<EmailerSendTo>;
};

export type SendToDevice = {
  id: Scalars['Int']['input'];
};

export type SendToEmail = {
  email: Scalars['String']['input'];
};

export type Series = {
  __typename?: 'Series';
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isComplete: Scalars['Boolean']['output'];
  isFavorite: Scalars['Boolean']['output'];
  library: Library;
  libraryId?: Maybe<Scalars['String']['output']>;
  media: Array<Media>;
  mediaAlphabet: Scalars['JSONObject']['output'];
  mediaCount: Scalars['Int']['output'];
  metadata?: Maybe<SeriesMetadata>;
  name: Scalars['String']['output'];
  path: Scalars['String']['output'];
  percentageCompleted: Scalars['Float']['output'];
  readCount: Scalars['Int']['output'];
  resolvedDescription?: Maybe<Scalars['String']['output']>;
  resolvedName: Scalars['String']['output'];
  status: FileStatus;
  tags: Array<Tag>;
  /**
   * A reference to the thumbnail image for the thumbnail. This will be a fully
   * qualified URL to the image.
   */
  thumbnail: ImageRef;
  unreadCount: Scalars['Int']['output'];
  upNext: Array<Media>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type SeriesUpNextArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  take?: Scalars['Int']['input'];
};

export type SeriesFilterInput = {
  _and?: InputMaybe<Array<SeriesFilterInput>>;
  _not?: InputMaybe<Array<SeriesFilterInput>>;
  _or?: InputMaybe<Array<SeriesFilterInput>>;
  library?: InputMaybe<LibraryFilterInput>;
  libraryId?: InputMaybe<FieldFilterString>;
  metadata?: InputMaybe<SeriesMetadataFilterInput>;
  name?: InputMaybe<FieldFilterString>;
  path?: InputMaybe<FieldFilterString>;
};

export type SeriesMetadata = {
  __typename?: 'SeriesMetadata';
  ageRating?: Maybe<Scalars['Int']['output']>;
  booktype?: Maybe<Scalars['String']['output']>;
  characters: Array<Scalars['String']['output']>;
  comicid?: Maybe<Scalars['Int']['output']>;
  genres: Array<Scalars['String']['output']>;
  imprint?: Maybe<Scalars['String']['output']>;
  links: Array<Scalars['String']['output']>;
  metaType?: Maybe<Scalars['String']['output']>;
  publisher?: Maybe<Scalars['String']['output']>;
  seriesId: Scalars['String']['output'];
  status?: Maybe<Scalars['String']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  volume?: Maybe<Scalars['Int']['output']>;
  writers: Array<Scalars['String']['output']>;
};

export type SeriesMetadataFilterInput = {
  _and?: InputMaybe<Array<SeriesMetadataFilterInput>>;
  _not?: InputMaybe<Array<SeriesMetadataFilterInput>>;
  _or?: InputMaybe<Array<SeriesMetadataFilterInput>>;
  ageRating?: InputMaybe<NumericFilterI32>;
  booktype?: InputMaybe<FieldFilterString>;
  comicid?: InputMaybe<NumericFilterI32>;
  imprint?: InputMaybe<FieldFilterString>;
  metaType?: InputMaybe<FieldFilterString>;
  publisher?: InputMaybe<FieldFilterString>;
  status?: InputMaybe<FieldFilterString>;
  summary?: InputMaybe<FieldFilterString>;
  title?: InputMaybe<FieldFilterString>;
  volume?: InputMaybe<NumericFilterI32>;
};

export type SeriesMetadataInput = {
  ageRating?: InputMaybe<Scalars['Int']['input']>;
  booktype?: InputMaybe<Scalars['String']['input']>;
  characters?: InputMaybe<Array<Scalars['String']['input']>>;
  comicid?: InputMaybe<Scalars['Int']['input']>;
  genres?: InputMaybe<Array<Scalars['String']['input']>>;
  imprint?: InputMaybe<Scalars['String']['input']>;
  links?: InputMaybe<Array<Scalars['String']['input']>>;
  metaType?: InputMaybe<Scalars['String']['input']>;
  publisher?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  volume?: InputMaybe<Scalars['Int']['input']>;
  writers?: InputMaybe<Array<Scalars['String']['input']>>;
};

export enum SeriesMetadataModelOrdering {
  AgeRating = 'AGE_RATING',
  Booktype = 'BOOKTYPE',
  Characters = 'CHARACTERS',
  Comicid = 'COMICID',
  Genres = 'GENRES',
  Imprint = 'IMPRINT',
  Links = 'LINKS',
  MetaType = 'META_TYPE',
  Publisher = 'PUBLISHER',
  SeriesId = 'SERIES_ID',
  Status = 'STATUS',
  Summary = 'SUMMARY',
  Title = 'TITLE',
  Volume = 'VOLUME',
  Writers = 'WRITERS'
}

export type SeriesMetadataOrderByField = {
  direction: OrderDirection;
  field: SeriesMetadataModelOrdering;
};

export enum SeriesModelOrdering {
  CreatedAt = 'CREATED_AT',
  DeletedAt = 'DELETED_AT',
  Description = 'DESCRIPTION',
  Id = 'ID',
  LibraryId = 'LIBRARY_ID',
  Name = 'NAME',
  Path = 'PATH',
  Status = 'STATUS',
  UpdatedAt = 'UPDATED_AT'
}

export type SeriesOrderBy =
  { metadata: SeriesMetadataOrderByField; series?: never; }
  |  { metadata?: never; series: SeriesOrderByField; };

export type SeriesOrderByField = {
  direction: OrderDirection;
  field: SeriesModelOrdering;
};

export type SeriesScanOutput = {
  __typename?: 'SeriesScanOutput';
  /** The number of media entities that were created */
  createdMedia: Scalars['Int']['output'];
  /** The number of files that were ignored during the scan */
  ignoredFiles: Scalars['Int']['output'];
  /**
   * The number of files that were deemed to be skipped during the scan, e.g. it
   * exists in the database but has not been modified since the last scan
   */
  skippedFiles: Scalars['Int']['output'];
  /** The number of files to scan relative to the series root */
  totalFiles: Scalars['Int']['output'];
  /** The number of media entities that were updated */
  updatedMedia: Scalars['Int']['output'];
};

export type SmartList = {
  __typename?: 'SmartList';
  creatorId: Scalars['String']['output'];
  defaultGrouping: SmartListGrouping;
  description?: Maybe<Scalars['String']['output']>;
  filters: Scalars['String']['output'];
  id: Scalars['String']['output'];
  joiner: SmartListJoiner;
  name: Scalars['String']['output'];
  thumbnail: ImageRef;
  views: Array<SmartListView>;
  visibility: EntityVisibility;
};

export type SmartListFilterGroupInput = {
  groups: Array<SmartListFilterInput>;
  joiner: SmartListGroupJoiner;
};

export type SmartListFilterInput =
  { library: LibraryFilterInput; media?: never; mediaMetadata?: never; series?: never; seriesMetadata?: never; }
  |  { library?: never; media: MediaFilterInput; mediaMetadata?: never; series?: never; seriesMetadata?: never; }
  |  { library?: never; media?: never; mediaMetadata: MediaMetadataFilterInput; series?: never; seriesMetadata?: never; }
  |  { library?: never; media?: never; mediaMetadata?: never; series: SeriesFilterInput; seriesMetadata?: never; }
  |  { library?: never; media?: never; mediaMetadata?: never; series?: never; seriesMetadata: SeriesMetadataFilterInput; };

/** The different filter joiners that can be used in smart lists */
export enum SmartListGroupJoiner {
  And = 'AND',
  Not = 'NOT',
  Or = 'OR'
}

export type SmartListGrouped = {
  __typename?: 'SmartListGrouped';
  items: Array<SmartListGroupedItem>;
};

export type SmartListGroupedItem = {
  __typename?: 'SmartListGroupedItem';
  books: Array<Media>;
  entity: SmartListItemEntity;
};

/** The different grouping options for smart lists */
export enum SmartListGrouping {
  ByBooks = 'BY_BOOKS',
  ByLibrary = 'BY_LIBRARY',
  BySeries = 'BY_SERIES'
}

export type SmartListItemEntity = Library | Series;

export type SmartListItems = SmartListGrouped | SmartListUngrouped;

/** The different filter joiners that can be used in smart lists */
export enum SmartListJoiner {
  And = 'AND',
  Or = 'OR'
}

export type SmartListMeta = {
  __typename?: 'SmartListMeta';
  matchedBooks: Scalars['Int']['output'];
  matchedLibraries: Scalars['Int']['output'];
  matchedSeries: Scalars['Int']['output'];
};

export type SmartListUngrouped = {
  __typename?: 'SmartListUngrouped';
  books: Array<Media>;
};

export type SmartListView = {
  __typename?: 'SmartListView';
  bookColumns: Array<SmartListViewColumn>;
  bookSorting: Array<SmartListViewSort>;
  enableMultiSort?: Maybe<Scalars['Boolean']['output']>;
  groupColumns: Array<SmartListViewColumn>;
  groupSorting: Array<SmartListViewSort>;
  id: Scalars['Int']['output'];
  listId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  search?: Maybe<Scalars['String']['output']>;
};

export type SmartListViewColumn = {
  __typename?: 'SmartListViewColumn';
  id: Scalars['String']['output'];
  position: Scalars['Int']['output'];
};

export type SmartListViewColumnInput = {
  id: Scalars['String']['input'];
  position: Scalars['Int']['input'];
};

export type SmartListViewSort = {
  __typename?: 'SmartListViewSort';
  desc: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
};

export type SmartListViewSortInput = {
  desc: Scalars['Boolean']['input'];
  id: Scalars['String']['input'];
};

export type SmartListsInput = {
  all?: InputMaybe<Scalars['Boolean']['input']>;
  mine?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type SpineItem = {
  __typename?: 'SpineItem';
  id?: Maybe<Scalars['String']['output']>;
  idref: Scalars['String']['output'];
  linear: Scalars['Boolean']['output'];
  properties?: Maybe<Scalars['String']['output']>;
};

/**
 * Represents the configuration of a Stump application. This struct is generated at startup
 * using a TOML file, environment variables, or both and is input when creating a `StumpCore`
 * instance.
 *
 * Example:
 * ```
 * use stump_core::{config::{self, StumpConfig}, StumpCore};
 *
 * #[tokio::main]
 * async fn main() {
 * /// Get config dir from environment variables.
 * let config_dir = config::bootstrap_config_dir();
 *
 * // Create a StumpConfig using the config file and environment variables.
 * let config = StumpConfig::new(config_dir)
 * // Load Stump.toml file (if any)
 * .with_config_file().unwrap()
 * // Overlay environment variables
 * .with_environment().unwrap();
 *
 * // Ensure that config directory exists and write Stump.toml.
 * config.write_config_dir().unwrap();
 * // Create an instance of the stump core.
 * let core = StumpCore::new(config).await;
 * }
 * ```
 */
export type StumpConfig = {
  __typename?: 'StumpConfig';
  accessTokenTtl: Scalars['Int']['output'];
  /** A list of origins for CORS. */
  allowedOrigins: Array<Scalars['String']['output']>;
  /** The client directory. */
  clientDir: Scalars['String']['output'];
  /** The configuration root for the Stump application, contains thumbnails, cache, and logs. */
  configDir: Scalars['String']['output'];
  /** An optional custom path for the templates directory. */
  customTemplatesDir?: Maybe<Scalars['String']['output']>;
  /** An optional custom path for the database. */
  dbPath?: Maybe<Scalars['String']['output']>;
  /** Indicates if the KoReader sync feature should be enabled. */
  enableKoreaderSync: Scalars['Boolean']['output'];
  /** Indicates if the Swagger UI should be disabled. */
  enableSwagger: Scalars['Boolean']['output'];
  /** Whether or not the server will allow users with the appropriate permissions to upload books and series. */
  enableUpload: Scalars['Boolean']['output'];
  /** The interval at which automatic deleted session cleanup is performed. */
  expiredSessionCleanupInterval: Scalars['Int']['output'];
  /** The maximum size, in bytes, of files that can be uploaded to be included in libraries. */
  maxFileUploadSize: Scalars['Int']['output'];
  /**
   * The maximum file size, in bytes, of images that can be uploaded, e.g., as thumbnails for users,
   * libraries, series, or media.
   */
  maxImageUploadSize: Scalars['Int']['output'];
  /**
   * The maximum number of concurrent files which may be processed by a scanner. This is used
   * to limit/increase the number of files that are processed at once. This may be useful for those
   * with high or low performance systems to configure to their needs.
   */
  maxScannerConcurrency: Scalars['Int']['output'];
  /**
   * The maximum number of concurrent files which may be processed by a thumbnail generator. This is used
   * to limit/increase the number of images that are processed at once. Image generation can be
   * resource intensive, so this may be useful for those with high or low performance systems to
   * configure to their needs.
   */
  maxThumbnailConcurrency: Scalars['Int']['output'];
  /** Password hash cost */
  passwordHashCost: Scalars['Int']['output'];
  /** Path to the PDFium binary for PDF support. */
  pdfiumPath?: Maybe<Scalars['String']['output']>;
  /** The port from which to serve the application (default: 10801). */
  port: Scalars['Int']['output'];
  /** Whether or not to pretty print logs. */
  prettyLogs: Scalars['Boolean']['output'];
  /** The "release" | "debug" profile with which the application is running. */
  profile: Scalars['String']['output'];
  refreshTokenTtl: Scalars['Int']['output'];
  /** The time in seconds that a login session will be valid for. */
  sessionTtl: Scalars['Int']['output'];
  /** The verbosity with which to log errors (default: 0). */
  verbosity: Scalars['Int']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  readEvents: CoreEvent;
  tailLogFile: Scalars['String']['output'];
};

export enum SupportedFont {
  AtkinsonHyperlegible = 'ATKINSON_HYPERLEGIBLE',
  Bitter = 'BITTER',
  Charis = 'CHARIS',
  Inter = 'INTER',
  LibreBaskerville = 'LIBRE_BASKERVILLE',
  Literata = 'LITERATA',
  Nunito = 'NUNITO',
  OpenDyslexic = 'OPEN_DYSLEXIC'
}

/** Supported image formats for processing images throughout Stump */
export enum SupportedImageFormat {
  Jpeg = 'JPEG',
  Png = 'PNG',
  Webp = 'WEBP'
}

export enum SystemArrangement {
  BookClubs = 'BOOK_CLUBS',
  Explore = 'EXPLORE',
  Home = 'HOME',
  Libraries = 'LIBRARIES',
  SmartLists = 'SMART_LISTS'
}

export type SystemArrangementConfig = {
  __typename?: 'SystemArrangementConfig';
  links: Array<FilterableArrangementEntityLink>;
  variant: SystemArrangement;
};

export type SystemArrangementConfigInput = {
  links?: Array<FilterableArrangementEntityLink>;
  variant: SystemArrangement;
};

export type Tag = {
  __typename?: 'Tag';
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export type TelegramConfig = {
  __typename?: 'TelegramConfig';
  chatId: Scalars['String']['output'];
  encryptedToken: Scalars['String']['output'];
};

export type TelegramConfigInput = {
  chatId: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type ThumbnailGenerationOutput = {
  __typename?: 'ThumbnailGenerationOutput';
  /** The number of thumbnails that were generated */
  generatedThumbnails: Scalars['Int']['output'];
  /** The number of thumbnails that were removed */
  removedThumbnails: Scalars['Int']['output'];
  /** The number of thumbnails that were skipped (already existed and not force regenerated) */
  skippedFiles: Scalars['Int']['output'];
  /** The total number of files that were visited during the thumbnail generation */
  visitedFiles: Scalars['Int']['output'];
};

/**
 * A simple pagination input object which does not paginate. An explicit struct is
 * required as a limitation of async_graphql's [OneofObject], which doesn't allow
 * for empty variants.
 */
export type Unpaginated = {
  unpaginated: Scalars['Boolean']['input'];
};

export type UpdateBookClubInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  emoji?: InputMaybe<Scalars['String']['input']>;
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  memberRoleSpec?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateThumbnailInput = {
  /** A flag indicating whether the page is zero based (i.e. 0 is the first page) */
  isZeroBased?: InputMaybe<Scalars['Boolean']['input']>;
  /** The ID of the media inside the series to fetch */
  mediaId: Scalars['String']['input'];
  /** The page to pull inside the media file for generating the thumbnail */
  page: Scalars['Int']['input'];
};

export type UpdateUserInput = {
  ageRestriction?: InputMaybe<AgeRestrictionInput>;
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  maxSessionsAllowed?: InputMaybe<Scalars['Int']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  permissions: Array<UserPermission>;
  username: Scalars['String']['input'];
};

export type UpdateUserPreferencesInput = {
  appFont: SupportedFont;
  appTheme: Scalars['String']['input'];
  enableAlphabetSelect: Scalars['Boolean']['input'];
  enableCompactDisplay: Scalars['Boolean']['input'];
  enableDiscordPresence: Scalars['Boolean']['input'];
  enableDoubleSidebar: Scalars['Boolean']['input'];
  enableGradients: Scalars['Boolean']['input'];
  enableHideScrollbar: Scalars['Boolean']['input'];
  enableJobOverlay: Scalars['Boolean']['input'];
  enableLiveRefetch: Scalars['Boolean']['input'];
  enableReplacePrimarySidebar: Scalars['Boolean']['input'];
  layoutMaxWidthPx?: InputMaybe<Scalars['Int']['input']>;
  locale: Scalars['String']['input'];
  preferAccentColor: Scalars['Boolean']['input'];
  preferredLayoutMode: InterfaceLayout;
  primaryNavigationMode: Scalars['String']['input'];
  showQueryIndicator: Scalars['Boolean']['input'];
  showThumbnailsInHeaders: Scalars['Boolean']['input'];
};

export type UploadBooksInput = {
  libraryId: Scalars['String']['input'];
  placeAt: Scalars['String']['input'];
  uploads: Array<Scalars['Upload']['input']>;
};

export type UploadConfig = {
  __typename?: 'UploadConfig';
  enabled: Scalars['Boolean']['output'];
  maxFileUploadSize: Scalars['Int']['output'];
};

export type UploadSeriesInput = {
  libraryId: Scalars['String']['input'];
  placeAt: Scalars['String']['input'];
  seriesDirName: Scalars['String']['input'];
  upload: Scalars['Upload']['input'];
};

export type User = {
  __typename?: 'User';
  ageRestriction?: Maybe<AgeRestriction>;
  avatarUrl?: Maybe<Scalars['String']['output']>;
  continueReading: PaginatedMediaResponse;
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  isLocked: Scalars['Boolean']['output'];
  isServerOwner: Scalars['Boolean']['output'];
  lastLogin?: Maybe<Scalars['DateTime']['output']>;
  loginSessionsCount: Scalars['Int']['output'];
  maxSessionsAllowed?: Maybe<Scalars['Int']['output']>;
  permissions: Array<UserPermission>;
  preferences: UserPreferences;
  username: Scalars['String']['output'];
};


export type UserContinueReadingArgs = {
  pagination?: Pagination;
};

export type UserLoginActivity = {
  __typename?: 'UserLoginActivity';
  authenticationSuccessful: Scalars['Boolean']['output'];
  id: Scalars['Int']['output'];
  ipAddress: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
  user: User;
  userAgent: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

/** The permissions a user may be granted */
export enum UserPermission {
  /** Grant access to read/create their own API keys */
  AccessApiKeys = 'ACCESS_API_KEYS',
  /**
   * TODO: Expand permissions for bookclub + smartlist
   * Grant access to the book club feature
   */
  AccessBookClub = 'ACCESS_BOOK_CLUB',
  /** Grant access to the koreader sync feature */
  AccessKoreaderSync = 'ACCESS_KOREADER_SYNC',
  /** Grant access to access the smart list feature. This includes the ability to create and edit smart lists */
  AccessSmartList = 'ACCESS_SMART_LIST',
  /** Grant access to create a book club (access book club) */
  CreateBookClub = 'CREATE_BOOK_CLUB',
  /** Grant access to create a library */
  CreateLibrary = 'CREATE_LIBRARY',
  /** Grant access to create a notifier */
  CreateNotifier = 'CREATE_NOTIFIER',
  /** Grant access to delete the library (manage library) */
  DeleteLibrary = 'DELETE_LIBRARY',
  /** Grant access to delete a notifier */
  DeleteNotifier = 'DELETE_NOTIFIER',
  /** Grant access to download files from a library */
  DownloadFile = 'DOWNLOAD_FILE',
  /** Grant access to edit basic details about the library */
  EditLibrary = 'EDIT_LIBRARY',
  /**
   * Grants access to edit any existing metadata for media/series. This will only
   * be applied to the database-level metadata.
   */
  EditMetadata = 'EDIT_METADATA',
  /** Grant access to create an emailer */
  EmailerCreate = 'EMAILER_CREATE',
  /** Grant access to manage an emailer */
  EmailerManage = 'EMAILER_MANAGE',
  /** Grant access to read any emailers in the system */
  EmailerRead = 'EMAILER_READ',
  /** Grant access to send an arbitrary email, bypassing any registered device requirements */
  EmailArbitrarySend = 'EMAIL_ARBITRARY_SEND',
  /** Grant access to send an email */
  EmailSend = 'EMAIL_SEND',
  /** Grant access to access the file explorer */
  FileExplorer = 'FILE_EXPLORER',
  /** Grant access to manage jobs, like pausing, resuming, deleting, or cancelling them */
  ManageJobs = 'MANAGE_JOBS',
  /** Grant access to manage the library (scan,edit,manage relations) */
  ManageLibrary = 'MANAGE_LIBRARY',
  /** Grant access to manage a notifier */
  ManageNotifier = 'MANAGE_NOTIFIER',
  /** Grant access to manage the server. This is effectively a step below server owner */
  ManageServer = 'MANAGE_SERVER',
  /** Grant access to manage users (create,edit,delete) */
  ManageUsers = 'MANAGE_USERS',
  /** Grant access to read jobs */
  ReadJobs = 'READ_JOBS',
  /** Grant access to read notifiers */
  ReadNotifier = 'READ_NOTIFIER',
  /** Grant access to read application-level logs, e.g. job logs */
  ReadPersistedLogs = 'READ_PERSISTED_LOGS',
  /** Grant access to read system logs */
  ReadSystemLogs = 'READ_SYSTEM_LOGS',
  /**
   * Grant access to read users.
   *
   * Note that this is explicitly for querying users via user-specific endpoints.
   * This would not affect relational queries, such as members in a common book club.
   */
  ReadUsers = 'READ_USERS',
  /** Grant access to scan the library for new files */
  ScanLibrary = 'SCAN_LIBRARY',
  /** Grant access to upload files to a library */
  UploadFile = 'UPLOAD_FILE',
  /**
   * Grants access to write back the database-level metadata for media/series.
   * This should be treated with caution, as technically it would allow for
   * overwriting existing metadata at the file-level
   */
  WriteBackMetadata = 'WRITE_BACK_METADATA'
}

export type UserPermissionStruct = {
  __typename?: 'UserPermissionStruct';
  value: Array<UserPermission>;
};

export type UserPreferences = {
  __typename?: 'UserPreferences';
  appFont: SupportedFont;
  appTheme: Scalars['String']['output'];
  enableAlphabetSelect: Scalars['Boolean']['output'];
  enableCompactDisplay: Scalars['Boolean']['output'];
  enableDiscordPresence: Scalars['Boolean']['output'];
  enableDoubleSidebar: Scalars['Boolean']['output'];
  enableGradients: Scalars['Boolean']['output'];
  enableHideScrollbar: Scalars['Boolean']['output'];
  enableJobOverlay: Scalars['Boolean']['output'];
  enableLiveRefetch: Scalars['Boolean']['output'];
  enableReplacePrimarySidebar: Scalars['Boolean']['output'];
  homeArrangement: Arrangement;
  layoutMaxWidthPx?: Maybe<Scalars['Int']['output']>;
  locale: Scalars['String']['output'];
  navigationArrangement: Arrangement;
  preferAccentColor: Scalars['Boolean']['output'];
  preferredLayoutMode: InterfaceLayout;
  primaryNavigationMode: Scalars['String']['output'];
  showQueryIndicator: Scalars['Boolean']['output'];
  showThumbnailsInHeaders: Scalars['Boolean']['output'];
  userId?: Maybe<Scalars['String']['output']>;
};

export type SearchMediaQueryVariables = Exact<{
  filter: MediaFilterInput;
}>;


export type SearchMediaQuery = { __typename?: 'Query', media: { __typename?: 'PaginatedMediaResponse', nodes: Array<(
      { __typename?: 'Media', id: string }
      & { ' $fragmentRefs'?: { 'BookSearchItemFragment': BookSearchItemFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo', nextCursor?: string | null } | { __typename: 'OffsetPaginationInfo' } } };

export type SearchSeriesQueryVariables = Exact<{
  filter: SeriesFilterInput;
}>;


export type SearchSeriesQuery = { __typename?: 'Query', series: { __typename?: 'PaginatedSeriesResponse', nodes: Array<(
      { __typename?: 'Series', id: string }
      & { ' $fragmentRefs'?: { 'SeriesSearchItemFragment': SeriesSearchItemFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo', nextCursor?: string | null } | { __typename: 'OffsetPaginationInfo' } } };

export type SearchLibraryQueryVariables = Exact<{
  search: Scalars['String']['input'];
}>;


export type SearchLibraryQuery = { __typename?: 'Query', libraries: { __typename?: 'PaginatedLibraryResponse', nodes: Array<(
      { __typename?: 'Library', id: string }
      & { ' $fragmentRefs'?: { 'LibrarySearchItemFragment': LibrarySearchItemFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo', nextCursor?: string | null } | { __typename: 'OffsetPaginationInfo' } } };

export type BookByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BookByIdQuery = { __typename?: 'Query', mediaById?: { __typename?: 'Media', id: string, extension: string, isFavorite: boolean, pages: number, resolvedName: string, size: number, metadata?: { __typename?: 'MediaMetadata', ageRating?: number | null, characters: Array<string>, colorists: Array<string>, coverArtists: Array<string>, day?: number | null, editors: Array<string>, identifierAmazon?: string | null, identifierCalibre?: string | null, identifierGoogle?: string | null, identifierIsbn?: string | null, identifierMobiAsin?: string | null, identifierUuid?: string | null, genres: Array<string>, inkers: Array<string>, language?: string | null, letterers: Array<string>, links: Array<string>, month?: number | null, notes?: string | null, number?: any | null, pageCount?: number | null, pencillers: Array<string>, publisher?: string | null, series?: string | null, summary?: string | null, teams: Array<string>, title?: string | null, titleSort?: string | null, volume?: number | null, writers: Array<string>, year?: number | null } | null, readProgress?: { __typename?: 'ActiveReadingSession', page?: number | null, percentageCompleted?: any | null, epubcfi?: string | null, startedAt: any, elapsedSeconds?: number | null } | null, readHistory: Array<{ __typename?: 'FinishedReadingSession', completedAt: any }>, series: { __typename?: 'Series', resolvedName: string }, thumbnail: { __typename?: 'ImageRef', url: string } } | null };

export type BookReadScreenQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BookReadScreenQuery = { __typename?: 'Query', mediaById?: { __typename?: 'Media', id: string, pages: number, extension: string, name: string, readProgress?: { __typename?: 'ActiveReadingSession', percentageCompleted?: any | null, epubcfi?: string | null, page?: number | null, elapsedSeconds?: number | null } | null, libraryConfig: { __typename?: 'LibraryConfig', defaultReadingImageScaleFit: ReadingImageScaleFit, defaultReadingMode: ReadingMode, defaultReadingDir: ReadingDirection }, metadata?: { __typename?: 'MediaMetadata', pageAnalysis?: { __typename?: 'PageAnalysis', dimensions: Array<{ __typename?: 'PageDimension', height: number, width: number }> } | null } | null } | null };

export type UpdateReadProgressionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: MediaProgressInput;
}>;


export type UpdateReadProgressionMutation = { __typename?: 'Mutation', updateMediaProgress: { __typename: 'ActiveReadingSession' } | { __typename: 'FinishedReadingSession' } };

export type BooksScreenQueryVariables = Exact<{
  pagination?: InputMaybe<Pagination>;
}>;


export type BooksScreenQuery = { __typename?: 'Query', media: { __typename?: 'PaginatedMediaResponse', nodes: Array<(
      { __typename?: 'Media', id: string }
      & { ' $fragmentRefs'?: { 'BookGridItemFragment': BookGridItemFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo' } } };

export type BookSearchScreenQueryVariables = Exact<{
  filter: MediaFilterInput;
  pagination: Pagination;
}>;


export type BookSearchScreenQuery = { __typename?: 'Query', media: { __typename?: 'PaginatedMediaResponse', nodes: Array<(
      { __typename?: 'Media', id: string }
      & { ' $fragmentRefs'?: { 'BookGridItemFragment': BookGridItemFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo' } } };

export type LibrarySeriesScreenSeriesNameQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type LibrarySeriesScreenSeriesNameQuery = { __typename?: 'Query', libraryById?: { __typename?: 'Library', name: string } | null };

export type LibrarySeriesScreenQueryVariables = Exact<{
  filter: SeriesFilterInput;
  pagination?: InputMaybe<Pagination>;
}>;


export type LibrarySeriesScreenQuery = { __typename?: 'Query', series: { __typename?: 'PaginatedSeriesResponse', nodes: Array<(
      { __typename?: 'Series', id: string }
      & { ' $fragmentRefs'?: { 'SeriesGridItemFragment': SeriesGridItemFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo' } } };

export type LibrariesScreenQueryVariables = Exact<{
  pagination?: InputMaybe<Pagination>;
}>;


export type LibrariesScreenQuery = { __typename?: 'Query', libraries: { __typename?: 'PaginatedLibraryResponse', nodes: Array<(
      { __typename?: 'Library', id: string }
      & { ' $fragmentRefs'?: { 'LibraryGridItemFragment': LibraryGridItemFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo' } } };

export type SeriesBooksSceneSeriesNameQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SeriesBooksSceneSeriesNameQuery = { __typename?: 'Query', seriesById?: { __typename?: 'Series', resolvedName: string } | null };

export type SeriesBooksScreenQueryVariables = Exact<{
  filter: MediaFilterInput;
  pagination?: InputMaybe<Pagination>;
}>;


export type SeriesBooksScreenQuery = { __typename?: 'Query', media: { __typename?: 'PaginatedMediaResponse', nodes: Array<(
      { __typename?: 'Media', id: string }
      & { ' $fragmentRefs'?: { 'BookGridItemFragment': BookGridItemFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo' } } };

export type SeriesScreenQueryVariables = Exact<{
  pagination?: InputMaybe<Pagination>;
}>;


export type SeriesScreenQuery = { __typename?: 'Query', series: { __typename?: 'PaginatedSeriesResponse', nodes: Array<(
      { __typename?: 'Series', id: string }
      & { ' $fragmentRefs'?: { 'SeriesGridItemFragment': SeriesGridItemFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo' } } };

export type ContinueReadingQueryVariables = Exact<{
  pagination?: InputMaybe<Pagination>;
}>;


export type ContinueReadingQuery = { __typename?: 'Query', keepReading: { __typename?: 'PaginatedMediaResponse', nodes: Array<(
      { __typename?: 'Media', id: string }
      & { ' $fragmentRefs'?: { 'BookListItemFragment': BookListItemFragment;'ReadingNowFragment': ReadingNowFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo' } | { __typename: 'OffsetPaginationInfo', totalPages: number, currentPage: number, pageSize: number, pageOffset: number, zeroBased: boolean } } };

export type ReadingNowFragment = { __typename?: 'Media', id: string, resolvedName: string, metadata?: { __typename?: 'MediaMetadata', summary?: string | null, genres: Array<string>, links: Array<string> } | null, thumbnail: { __typename?: 'ImageRef', url: string } } & { ' $fragmentName'?: 'ReadingNowFragment' };

export type RecentlyAddedBooksQueryVariables = Exact<{
  pagination?: InputMaybe<Pagination>;
}>;


export type RecentlyAddedBooksQuery = { __typename?: 'Query', recentlyAddedMedia: { __typename?: 'PaginatedMediaResponse', nodes: Array<(
      { __typename?: 'Media', id: string }
      & { ' $fragmentRefs'?: { 'BookListItemFragment': BookListItemFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo' } } };

export type BookGridItemFragment = { __typename?: 'Media', id: string, resolvedName: string, thumbnail: { __typename?: 'ImageRef', url: string } } & { ' $fragmentName'?: 'BookGridItemFragment' };

export type BookListItemFragment = { __typename?: 'Media', id: string, resolvedName: string, thumbnail: { __typename?: 'ImageRef', url: string } } & { ' $fragmentName'?: 'BookListItemFragment' };

export type BookSearchItemFragment = { __typename?: 'Media', id: string, resolvedName: string, size: number, pages: number, thumbnail: { __typename?: 'ImageRef', url: string } } & { ' $fragmentName'?: 'BookSearchItemFragment' };

export type StackedBookThumbnailsQueryVariables = Exact<{ [key: string]: never; }>;


export type StackedBookThumbnailsQuery = { __typename?: 'Query', media: { __typename?: 'PaginatedMediaResponse', nodes: Array<{ __typename?: 'Media', id: string, thumbnail: { __typename?: 'ImageRef', url: string } }> } };

export type LibraryGridItemFragment = { __typename?: 'Library', id: string, name: string, thumbnail: { __typename?: 'ImageRef', url: string } } & { ' $fragmentName'?: 'LibraryGridItemFragment' };

export type LibrarySearchItemFragment = { __typename?: 'Library', id: string, name: string, thumbnail: { __typename?: 'ImageRef', url: string } } & { ' $fragmentName'?: 'LibrarySearchItemFragment' };

export type StackedLibraryThumbnailsQueryVariables = Exact<{ [key: string]: never; }>;


export type StackedLibraryThumbnailsQuery = { __typename?: 'Query', libraries: { __typename?: 'PaginatedLibraryResponse', nodes: Array<{ __typename?: 'Library', id: string, thumbnail: { __typename?: 'ImageRef', url: string } }> } };

export type SeriesGridItemFragment = { __typename?: 'Series', id: string, resolvedName: string, thumbnail: { __typename?: 'ImageRef', url: string } } & { ' $fragmentName'?: 'SeriesGridItemFragment' };

export type SeriesSearchItemFragment = { __typename?: 'Series', id: string, resolvedName: string, readCount: number, mediaCount: number, percentageCompleted: number, thumbnail: { __typename?: 'ImageRef', url: string } } & { ' $fragmentName'?: 'SeriesSearchItemFragment' };

export type StackedSeriesThumbnailsQueryVariables = Exact<{ [key: string]: never; }>;


export type StackedSeriesThumbnailsQuery = { __typename?: 'Query', series: { __typename?: 'PaginatedSeriesResponse', nodes: Array<{ __typename?: 'Series', id: string, thumbnail: { __typename?: 'ImageRef', url: string } }> } };

export type StackedSmartListThumbnailsQueryVariables = Exact<{ [key: string]: never; }>;


export type StackedSmartListThumbnailsQuery = { __typename?: 'Query', smartLists: Array<{ __typename?: 'SmartList', id: string, thumbnail: { __typename?: 'ImageRef', url: string } }> };

export type UseFavoriteBookMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  isFavorite: Scalars['Boolean']['input'];
}>;


export type UseFavoriteBookMutation = { __typename?: 'Mutation', favoriteMedia: { __typename?: 'Media', id: string, isFavorite: boolean } };

export type TagSelectQueryQueryVariables = Exact<{ [key: string]: never; }>;


export type TagSelectQueryQuery = { __typename?: 'Query', tags: Array<{ __typename?: 'Tag', id: number, name: string }> };

export type BookCardFragment = { __typename?: 'Media', id: string, resolvedName: string, extension: string, pages: number, size: number, status: FileStatus, thumbnail: { __typename?: 'ImageRef', url: string }, readProgress?: { __typename?: 'ActiveReadingSession', percentageCompleted?: any | null, epubcfi?: string | null, page?: number | null, updatedAt?: any | null } | null, readHistory: Array<{ __typename: 'FinishedReadingSession', completedAt: any }> } & { ' $fragmentName'?: 'BookCardFragment' };

export type BookSearchOverlayQueryVariables = Exact<{
  pagination?: InputMaybe<Pagination>;
  filter: MediaFilterInput;
}>;


export type BookSearchOverlayQuery = { __typename?: 'Query', media: { __typename?: 'PaginatedMediaResponse', nodes: Array<(
      { __typename?: 'Media', id: string }
      & { ' $fragmentRefs'?: { 'BookCardFragment': BookCardFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo' } } };

export type MediaMetadataEditorFragment = { __typename?: 'MediaMetadata', ageRating?: number | null, characters: Array<string>, colorists: Array<string>, coverArtists: Array<string>, day?: number | null, editors: Array<string>, identifierAmazon?: string | null, identifierCalibre?: string | null, identifierGoogle?: string | null, identifierIsbn?: string | null, identifierMobiAsin?: string | null, identifierUuid?: string | null, genres: Array<string>, inkers: Array<string>, language?: string | null, letterers: Array<string>, links: Array<string>, month?: number | null, notes?: string | null, number?: any | null, pageCount?: number | null, pencillers: Array<string>, publisher?: string | null, series?: string | null, summary?: string | null, teams: Array<string>, title?: string | null, titleSort?: string | null, volume?: number | null, writers: Array<string>, year?: number | null } & { ' $fragmentName'?: 'MediaMetadataEditorFragment' };

export type UpdateMediaMetadataMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: MediaMetadataInput;
}>;


export type UpdateMediaMetadataMutation = { __typename?: 'Mutation', updateMediaMetadata: { __typename?: 'Media', metadata?: (
      { __typename?: 'MediaMetadata' }
      & { ' $fragmentRefs'?: { 'MediaMetadataEditorFragment': MediaMetadataEditorFragment } }
    ) | null } };

export type BookOverviewSceneQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BookOverviewSceneQuery = { __typename?: 'Query', mediaById?: (
    { __typename?: 'Media', id: string, resolvedName: string, extension: string, metadata?: (
      { __typename?: 'MediaMetadata', links: Array<string>, summary?: string | null }
      & { ' $fragmentRefs'?: { 'MediaMetadataEditorFragment': MediaMetadataEditorFragment } }
    ) | null, readHistory: Array<{ __typename?: 'FinishedReadingSession', completedAt: any }> }
    & { ' $fragmentRefs'?: { 'BookCardFragment': BookCardFragment;'BookFileInformationFragment': BookFileInformationFragment } }
  ) | null };

export type DeleteBookClubConfirmationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBookClubConfirmationMutation = { __typename?: 'Mutation', deleteBookClub: { __typename?: 'BookClub', id: string } };

export type MediaAtPathQueryVariables = Exact<{
  path: Scalars['String']['input'];
}>;


export type MediaAtPathQuery = { __typename?: 'Query', mediaByPath?: { __typename?: 'Media', id: string, resolvedName: string, thumbnail: { __typename?: 'ImageRef', url: string } } | null };

export type UploadLibraryBooksMutationVariables = Exact<{
  input: UploadBooksInput;
}>;


export type UploadLibraryBooksMutation = { __typename?: 'Mutation', uploadBooks: boolean };

export type UploadLibrarySeriesMutationVariables = Exact<{
  input: UploadSeriesInput;
}>;


export type UploadLibrarySeriesMutation = { __typename?: 'Mutation', uploadSeries: boolean };

export type MediaFilterFormQueryVariables = Exact<{
  seriesId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type MediaFilterFormQuery = { __typename?: 'Query', mediaMetadataOverview: { __typename?: 'MediaMetadataOverview', genres: Array<string>, writers: Array<string>, pencillers: Array<string>, colorists: Array<string>, letterers: Array<string>, inkers: Array<string>, publishers: Array<string>, editors: Array<string>, characters: Array<string> } };

export type DeleteLibraryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteLibraryMutation = { __typename?: 'Mutation', deleteLibrary: { __typename?: 'Library', id: string } };

export type LastVisitedLibraryQueryVariables = Exact<{ [key: string]: never; }>;


export type LastVisitedLibraryQuery = { __typename?: 'Query', lastVisitedLibrary?: { __typename?: 'Library', id: string, name: string, thumbnail: { __typename?: 'ImageRef', url: string } } | null };

export type LibraryBooksAlphabetQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type LibraryBooksAlphabetQuery = { __typename?: 'Query', libraryById?: { __typename?: 'Library', mediaAlphabet: any } | null };

export type LibrarySeriesAlphabetQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type LibrarySeriesAlphabetQuery = { __typename?: 'Query', libraryById?: { __typename?: 'Library', seriesAlphabet: any } | null };

export type SideBarQueryQueryVariables = Exact<{ [key: string]: never; }>;


export type SideBarQueryQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string, preferences: { __typename?: 'UserPreferences', navigationArrangement: { __typename?: 'Arrangement', locked: boolean, sections: Array<{ __typename?: 'ArrangementSection', visible: boolean, config: { __typename: 'CustomArrangementConfig' } | { __typename: 'InProgressBooks' } | { __typename: 'RecentlyAdded' } | { __typename: 'SystemArrangementConfig', variant: SystemArrangement, links: Array<FilterableArrangementEntityLink> } }> } } } };

export type BookClubSideBarSectionQueryVariables = Exact<{ [key: string]: never; }>;


export type BookClubSideBarSectionQuery = { __typename?: 'Query', bookClubs: Array<{ __typename?: 'BookClub', id: string, name: string, slug: string, emoji?: string | null, members: Array<{ __typename?: 'BookClubMember', id: string, userId: string, role: BookClubMemberRole }> }> };

export type UpdateLibraryEmojiMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  emoji?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateLibraryEmojiMutation = { __typename?: 'Mutation', updateLibraryEmoji: { __typename?: 'Library', id: string } };

export type ScanLibraryMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ScanLibraryMutationMutation = { __typename?: 'Mutation', scanLibrary: boolean };

export type LibrarySideBarSectionQueryVariables = Exact<{ [key: string]: never; }>;


export type LibrarySideBarSectionQuery = { __typename?: 'Query', libraries: { __typename?: 'PaginatedLibraryResponse', nodes: Array<{ __typename?: 'Library', id: string, name: string, emoji?: string | null }> } };

export type SmartListSideBarSectionQueryVariables = Exact<{ [key: string]: never; }>;


export type SmartListSideBarSectionQuery = { __typename?: 'Query', smartLists: Array<{ __typename?: 'SmartList', id: string, name: string }> };

export type TopNavigationQueryVariables = Exact<{ [key: string]: never; }>;


export type TopNavigationQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string, preferences: { __typename?: 'UserPreferences', navigationArrangement: { __typename?: 'Arrangement', locked: boolean, sections: Array<{ __typename?: 'ArrangementSection', visible: boolean, config: { __typename: 'CustomArrangementConfig' } | { __typename: 'InProgressBooks' } | { __typename: 'RecentlyAdded' } | { __typename: 'SystemArrangementConfig', variant: SystemArrangement, links: Array<FilterableArrangementEntityLink> } }> } } } };

export type LibraryNavigationItemQueryVariables = Exact<{ [key: string]: never; }>;


export type LibraryNavigationItemQuery = { __typename?: 'Query', libraries: { __typename?: 'PaginatedLibraryResponse', nodes: Array<{ __typename?: 'Library', id: string, name: string, emoji?: string | null }> } };

export type EpubJsReaderQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type EpubJsReaderQuery = { __typename?: 'Query', epubById: { __typename?: 'Epub', mediaId: string, rootBase: string, rootFile: string, extraCss: Array<string>, toc: Array<string>, resources: any, metadata: any, spine: Array<{ __typename?: 'SpineItem', id?: string | null, idref: string, properties?: string | null, linear: boolean }>, bookmarks: Array<{ __typename?: 'Bookmark', id: string, userId: string, epubcfi?: string | null, mediaId: string }>, media: { __typename?: 'Media', id: string, resolvedName: string, pages: number, extension: string, readProgress?: { __typename?: 'ActiveReadingSession', percentageCompleted?: any | null, epubcfi?: string | null, page?: number | null, elapsedSeconds?: number | null } | null, libraryConfig: { __typename?: 'LibraryConfig', defaultReadingImageScaleFit: ReadingImageScaleFit, defaultReadingMode: ReadingMode, defaultReadingDir: ReadingDirection } } } };

export type UpdateEpubProgressMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: MediaProgressInput;
}>;


export type UpdateEpubProgressMutation = { __typename?: 'Mutation', updateMediaProgress: { __typename: 'ActiveReadingSession', percentageCompleted?: any | null, epubcfi?: string | null, page?: number | null, elapsedSeconds?: number | null } | { __typename: 'FinishedReadingSession' } };

export type CreateOrUpdateBookmarkMutationVariables = Exact<{
  input: BookmarkInput;
}>;


export type CreateOrUpdateBookmarkMutation = { __typename?: 'Mutation', createOrUpdateBookmark: { __typename: 'Bookmark' } };

export type DeleteBookmarkMutationVariables = Exact<{
  epubcfi: Scalars['String']['input'];
}>;


export type DeleteBookmarkMutation = { __typename?: 'Mutation', deleteBookmark: { __typename: 'Bookmark' } };

export type SeriesBooksAlphabetQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SeriesBooksAlphabetQuery = { __typename?: 'Query', seriesById?: { __typename?: 'Series', mediaAlphabet: any } | null };

export type SeriesMetadataEditorFragment = { __typename?: 'SeriesMetadata', ageRating?: number | null, booktype?: string | null, characters: Array<string>, comicid?: number | null, genres: Array<string>, imprint?: string | null, links: Array<string>, metaType?: string | null, publisher?: string | null, status?: string | null, summary?: string | null, title?: string | null, volume?: number | null, writers: Array<string> } & { ' $fragmentName'?: 'SeriesMetadataEditorFragment' };

export type UpdateSeriesMetadataMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: SeriesMetadataInput;
}>;


export type UpdateSeriesMetadataMutation = { __typename?: 'Mutation', updateSeriesMetadata: { __typename?: 'Series', metadata?: (
      { __typename?: 'SeriesMetadata' }
      & { ' $fragmentRefs'?: { 'SeriesMetadataEditorFragment': SeriesMetadataEditorFragment } }
    ) | null } };

export type UseCoreEventSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UseCoreEventSubscription = { __typename?: 'Subscription', readEvents: { __typename: 'CreatedManySeries', count: number, libraryId: string } | { __typename: 'CreatedMedia', id: string, seriesId: string } | { __typename: 'CreatedOrUpdatedManyMedia', count: number, seriesId: string } | { __typename: 'DiscoveredMissingLibrary', id: string } | { __typename: 'JobOutput', id: string, output: { __typename: 'ExternalJobOutput' } | { __typename: 'LibraryScanOutput', createdMedia: number, createdSeries: number, updatedMedia: number, updatedSeries: number } | { __typename: 'SeriesScanOutput', createdMedia: number, updatedMedia: number } | { __typename: 'ThumbnailGenerationOutput' } } | { __typename: 'JobStarted', id: string } | { __typename: 'JobUpdate', id: string, status?: JobStatus | null, message?: string | null, completedTasks?: number | null, remainingTasks?: number | null, completedSubtasks?: number | null, totalSubtasks?: number | null } };

export type UsePreferencesMutationVariables = Exact<{
  input: UpdateUserPreferencesInput;
}>;


export type UsePreferencesMutation = { __typename?: 'Mutation', updateViewerPreferences: { __typename: 'UserPreferences' } };

export type BookActionMenuCompleteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  isComplete: Scalars['Boolean']['input'];
  page?: InputMaybe<Scalars['Int']['input']>;
}>;


export type BookActionMenuCompleteMutation = { __typename?: 'Mutation', markMediaAsComplete?: { __typename?: 'FinishedReadingSessionModel', completedAt: any } | null };

export type BookActionMenuDeleteSessionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BookActionMenuDeleteSessionMutation = { __typename?: 'Mutation', deleteMediaProgress: { __typename: 'Media' } };

export type BookActionMenuDeleteHistoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BookActionMenuDeleteHistoryMutation = { __typename?: 'Mutation', deleteMediaReadHistory: { __typename: 'Media' } };

export type BookFileInformationFragment = { __typename?: 'Media', id: string, size: number, extension: string, hash?: string | null, relativeLibraryPath: string } & { ' $fragmentName'?: 'BookFileInformationFragment' };

export type BookLibrarySeriesLinksQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BookLibrarySeriesLinksQuery = { __typename?: 'Query', seriesById?: { __typename?: 'Series', id: string, name: string, libraryId?: string | null } | null };

export type BookMetadataFragment = { __typename?: 'Media', metadata?: { __typename?: 'MediaMetadata', ageRating?: number | null, characters: Array<string>, colorists: Array<string>, coverArtists: Array<string>, editors: Array<string>, genres: Array<string>, inkers: Array<string>, letterers: Array<string>, links: Array<string>, pencillers: Array<string>, publisher?: string | null, teams: Array<string>, writers: Array<string>, year?: number | null } | null } & { ' $fragmentName'?: 'BookMetadataFragment' };

export type BookOverviewHeaderQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BookOverviewHeaderQuery = { __typename?: 'Query', mediaById?: { __typename?: 'Media', id: string, resolvedName: string, seriesId?: string | null, extension: string, pages: number, metadata?: { __typename?: 'MediaMetadata', ageRating?: number | null, genres: Array<string>, publisher?: string | null, writers: Array<string>, year?: number | null } | null, tags: Array<{ __typename?: 'Tag', id: number, name: string }> } | null };

export type BooksAfterCurrentQueryQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  pagination?: InputMaybe<Pagination>;
}>;


export type BooksAfterCurrentQueryQuery = { __typename?: 'Query', mediaById?: { __typename?: 'Media', nextInSeries: { __typename?: 'PaginatedMediaResponse', nodes: Array<(
        { __typename?: 'Media', id: string }
        & { ' $fragmentRefs'?: { 'BookCardFragment': BookCardFragment } }
      )>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo' } } } | null };

export type BooksAlphabetQueryVariables = Exact<{ [key: string]: never; }>;


export type BooksAlphabetQuery = { __typename?: 'Query', mediaAlphabet: any };

export type EmailBookDropdownDeviceQueryVariables = Exact<{ [key: string]: never; }>;


export type EmailBookDropdownDeviceQuery = { __typename?: 'Query', emailDevices: Array<{ __typename?: 'RegisteredEmailDevice', id: number, name: string }> };

export type SendEmailAttachmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  sendTo: Array<EmailerSendTo> | EmailerSendTo;
}>;


export type SendEmailAttachmentMutation = { __typename?: 'Mutation', sendAttachmentEmail: { __typename?: 'SendAttachmentEmailOutput', sentCount: number, errors: Array<string> } };

export type BookReaderSceneQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BookReaderSceneQuery = { __typename?: 'Query', mediaById?: { __typename?: 'Media', id: string, resolvedName: string, pages: number, extension: string, readProgress?: { __typename?: 'ActiveReadingSession', percentageCompleted?: any | null, epubcfi?: string | null, page?: number | null, elapsedSeconds?: number | null } | null, libraryConfig: { __typename?: 'LibraryConfig', defaultReadingImageScaleFit: ReadingImageScaleFit, defaultReadingMode: ReadingMode, defaultReadingDir: ReadingDirection }, metadata?: { __typename?: 'MediaMetadata', pageAnalysis?: { __typename?: 'PageAnalysis', dimensions: Array<{ __typename?: 'PageDimension', height: number, width: number }> } | null } | null } | null };

export type UpdateReadProgressMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: MediaProgressInput;
}>;


export type UpdateReadProgressMutation = { __typename?: 'Mutation', updateMediaProgress: { __typename: 'ActiveReadingSession' } | { __typename: 'FinishedReadingSession' } };

export type BookManagementSceneQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BookManagementSceneQuery = { __typename?: 'Query', mediaById?: (
    { __typename?: 'Media', id: string, resolvedName: string, library: { __typename?: 'Library', id: string, name: string }, series: { __typename?: 'Series', id: string, resolvedName: string } }
    & { ' $fragmentRefs'?: { 'BookThumbnailSelectorFragment': BookThumbnailSelectorFragment } }
  ) | null };

export type BookManagementSceneAnalyzeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BookManagementSceneAnalyzeMutation = { __typename?: 'Mutation', analyzeMedia: boolean };

export type BookThumbnailSelectorFragment = { __typename?: 'Media', id: string, pages: number, thumbnail: { __typename?: 'ImageRef', url: string } } & { ' $fragmentName'?: 'BookThumbnailSelectorFragment' };

export type BookThumbnailSelectorUpdateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: PageBasedThumbnailInput;
}>;


export type BookThumbnailSelectorUpdateMutation = { __typename?: 'Mutation', updateMediaThumbnail: { __typename?: 'Media', id: string, thumbnail: { __typename?: 'ImageRef', url: string } } };

export type BookThumbnailSelectorUploadMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  file: Scalars['Upload']['input'];
}>;


export type BookThumbnailSelectorUploadMutation = { __typename?: 'Mutation', uploadMediaThumbnail: { __typename?: 'Media', id: string, thumbnail: { __typename?: 'ImageRef', url: string } } };

export type BookClubLayoutQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type BookClubLayoutQuery = { __typename?: 'Query', bookClubBySlug?: { __typename?: 'BookClub', id: string, name: string, slug: string, description?: string | null, isPrivate: boolean, roleSpec: any, membersCount: number, createdAt: any, creator: { __typename?: 'BookClubMember', id: string, displayName?: string | null, avatarUrl?: string | null }, membership?: { __typename: 'BookClubMember', role: BookClubMemberRole, isCreator: boolean, avatarUrl?: string | null } | null, schedule?: { __typename?: 'BookClubSchedule', id: number, defaultIntervalDays?: number | null } | null } | null };

export type UserBookClubsSceneQueryVariables = Exact<{ [key: string]: never; }>;


export type UserBookClubsSceneQuery = { __typename?: 'Query', bookClubs: Array<{ __typename?: 'BookClub', id: string, name: string, slug: string, description?: string | null, membersCount: number, schedule?: { __typename?: 'BookClubSchedule', activeBooks: Array<{ __typename: 'BookClubExternalBook' } | { __typename: 'BookClubInternalBook' }> } | null }> };

export type CreateBookClubFormQueryVariables = Exact<{ [key: string]: never; }>;


export type CreateBookClubFormQuery = { __typename?: 'Query', bookClubs: Array<{ __typename?: 'BookClub', name: string, slug: string }> };

export type CreateBookClubSceneMutationVariables = Exact<{
  input: CreateBookClubInput;
}>;


export type CreateBookClubSceneMutation = { __typename?: 'Mutation', createBookClub: { __typename?: 'BookClub', id: string, slug: string } };

export type BookClubBasicSettingsSceneQueryVariables = Exact<{ [key: string]: never; }>;


export type BookClubBasicSettingsSceneQuery = { __typename?: 'Query', bookClubs: Array<{ __typename?: 'BookClub', id: string, name: string, slug: string }> };

export type BookClubMembersTableQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BookClubMembersTableQuery = { __typename?: 'Query', bookClubById: { __typename?: 'BookClub', id: string, members: Array<{ __typename?: 'BookClubMember', id: string, avatarUrl?: string | null, isCreator: boolean, displayName?: string | null, role: BookClubMemberRole, userId: string }> } };

export type RemoveBookClubMemberMutationVariables = Exact<{
  bookClubId: Scalars['ID']['input'];
  memberId: Scalars['ID']['input'];
}>;


export type RemoveBookClubMemberMutation = { __typename?: 'Mutation', removeBookClubMember: { __typename?: 'BookClubMember', id: string } };

export type BookSearchSceneQueryVariables = Exact<{
  filter: MediaFilterInput;
  orderBy: Array<MediaOrderBy> | MediaOrderBy;
  pagination: Pagination;
}>;


export type BookSearchSceneQuery = { __typename?: 'Query', media: { __typename?: 'PaginatedMediaResponse', nodes: Array<(
      { __typename?: 'Media', id: string }
      & { ' $fragmentRefs'?: { 'BookCardFragment': BookCardFragment;'BookMetadataFragment': BookMetadataFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo' } | { __typename: 'OffsetPaginationInfo', currentPage: number, totalPages: number, pageSize: number, pageOffset: number, zeroBased: boolean } } };

export type CreateLibrarySceneExistingLibrariesQueryVariables = Exact<{ [key: string]: never; }>;


export type CreateLibrarySceneExistingLibrariesQuery = { __typename?: 'Query', libraries: { __typename?: 'PaginatedLibraryResponse', nodes: Array<{ __typename?: 'Library', id: string, name: string, path: string }> } };

export type CreateLibrarySceneCreateLibraryMutationVariables = Exact<{
  input: CreateOrUpdateLibraryInput;
}>;


export type CreateLibrarySceneCreateLibraryMutation = { __typename?: 'Mutation', createLibrary: { __typename?: 'Library', id: string } };

export type CreateSmartListFormQueryVariables = Exact<{ [key: string]: never; }>;


export type CreateSmartListFormQuery = { __typename?: 'Query', smartLists: Array<{ __typename?: 'SmartList', name: string }> };

export type CreateSmartListSceneMutationVariables = Exact<{
  input: SaveSmartListInput;
}>;


export type CreateSmartListSceneMutation = { __typename?: 'Mutation', createSmartList: { __typename?: 'SmartList', id: string, name: string } };

export type ContinueReadingMediaQueryQueryVariables = Exact<{
  pagination: Pagination;
}>;


export type ContinueReadingMediaQueryQuery = { __typename?: 'Query', keepReading: { __typename?: 'PaginatedMediaResponse', nodes: Array<(
      { __typename?: 'Media', id: string }
      & { ' $fragmentRefs'?: { 'BookCardFragment': BookCardFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo', currentPage: number, totalPages: number, pageSize: number, pageOffset: number, zeroBased: boolean } } };

export type HomeSceneQueryQueryVariables = Exact<{ [key: string]: never; }>;


export type HomeSceneQueryQuery = { __typename?: 'Query', numberOfLibraries: number };

export type RecentlyAddedMediaQueryQueryVariables = Exact<{
  pagination: Pagination;
}>;


export type RecentlyAddedMediaQueryQuery = { __typename?: 'Query', recentlyAddedMedia: { __typename?: 'PaginatedMediaResponse', nodes: Array<(
      { __typename?: 'Media', id: string }
      & { ' $fragmentRefs'?: { 'BookCardFragment': BookCardFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo' } } };

export type RecentlyAddedSeriesQueryQueryVariables = Exact<{
  pagination: Pagination;
}>;


export type RecentlyAddedSeriesQueryQuery = { __typename?: 'Query', recentlyAddedSeries: { __typename?: 'PaginatedSeriesResponse', nodes: Array<{ __typename?: 'Series', id: string, resolvedName: string, mediaCount: number, percentageCompleted: number, status: FileStatus }>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo' } } };

export type LibraryLayoutQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type LibraryLayoutQuery = { __typename?: 'Query', libraryById?: (
    { __typename?: 'Library', id: string, name: string, description?: string | null, path: string, stats: { __typename?: 'LibraryStats', bookCount: number, completedBooks: number, inProgressBooks: number }, tags: Array<{ __typename?: 'Tag', id: number, name: string }>, thumbnail: { __typename?: 'ImageRef', url: string } }
    & { ' $fragmentRefs'?: { 'LibrarySettingsConfigFragment': LibrarySettingsConfigFragment } }
  ) | null };

export type VisitLibraryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type VisitLibraryMutation = { __typename?: 'Mutation', visitLibrary: { __typename?: 'Library', id: string } };

export type LibraryBooksSceneQueryVariables = Exact<{
  filter: MediaFilterInput;
  orderBy: Array<MediaOrderBy> | MediaOrderBy;
  pagination: Pagination;
}>;


export type LibraryBooksSceneQuery = { __typename?: 'Query', media: { __typename?: 'PaginatedMediaResponse', nodes: Array<(
      { __typename?: 'Media', id: string }
      & { ' $fragmentRefs'?: { 'BookCardFragment': BookCardFragment;'BookMetadataFragment': BookMetadataFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo' } | { __typename: 'OffsetPaginationInfo', currentPage: number, totalPages: number, pageSize: number, pageOffset: number, zeroBased: boolean } } };

export type LibrarySeriesQueryVariables = Exact<{
  filter: SeriesFilterInput;
  orderBy: Array<SeriesOrderBy> | SeriesOrderBy;
  pagination: Pagination;
}>;


export type LibrarySeriesQuery = { __typename?: 'Query', series: { __typename?: 'PaginatedSeriesResponse', nodes: Array<{ __typename?: 'Series', id: string, resolvedName: string, mediaCount: number, percentageCompleted: number, status: FileStatus }>, pageInfo: { __typename: 'CursorPaginationInfo' } | { __typename: 'OffsetPaginationInfo', totalPages: number, currentPage: number, pageSize: number, pageOffset: number, zeroBased: boolean } } };

export type LibrarySeriesGridQueryVariables = Exact<{
  id: Scalars['String']['input'];
  pagination?: InputMaybe<Pagination>;
}>;


export type LibrarySeriesGridQuery = { __typename?: 'Query', series: { __typename?: 'PaginatedSeriesResponse', nodes: Array<{ __typename?: 'Series', id: string, thumbnail: { __typename?: 'ImageRef', url: string } }>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo' } } };

export type LibrarySettingsConfigFragment = { __typename?: 'Library', config: { __typename?: 'LibraryConfig', id: number, convertRarToZip: boolean, hardDeleteConversions: boolean, defaultReadingDir: ReadingDirection, defaultReadingMode: ReadingMode, defaultReadingImageScaleFit: ReadingImageScaleFit, generateFileHashes: boolean, generateKoreaderHashes: boolean, processMetadata: boolean, watch: boolean, libraryPattern: LibraryPattern, ignoreRules?: Array<string> | null, thumbnailConfig?: { __typename: 'ImageProcessorOptions', format: SupportedImageFormat, quality?: number | null, page?: number | null, resizeMethod?: { __typename: 'ExactDimensionResize', width: number, height: number } | { __typename: 'ScaleEvenlyByFactor', factor: any } | { __typename: 'ScaledDimensionResize', dimension: Dimension, size: number } | null } | null } } & { ' $fragmentName'?: 'LibrarySettingsConfigFragment' };

export type LibrarySettingsRouterEditLibraryMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: CreateOrUpdateLibraryInput;
}>;


export type LibrarySettingsRouterEditLibraryMutationMutation = { __typename?: 'Mutation', updateLibrary: { __typename?: 'Library', id: string } };

export type LibrarySettingsRouterScanLibraryMutationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  options?: InputMaybe<Scalars['JSON']['input']>;
}>;


export type LibrarySettingsRouterScanLibraryMutationMutation = { __typename?: 'Mutation', scanLibrary: boolean };

export type LibraryExclusionsUsersQueryQueryVariables = Exact<{ [key: string]: never; }>;


export type LibraryExclusionsUsersQueryQuery = { __typename?: 'Query', users: { __typename?: 'PaginatedUserResponse', nodes: Array<{ __typename?: 'User', id: string, username: string }> } };

export type LibraryExclusionsQueryQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type LibraryExclusionsQueryQuery = { __typename?: 'Query', libraryById?: { __typename?: 'Library', excludedUsers: Array<{ __typename?: 'User', id: string, username: string }> } | null };

export type UpdateLibraryExclusionsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  userIds: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type UpdateLibraryExclusionsMutation = { __typename?: 'Mutation', updateLibraryExcludedUsers: { __typename?: 'Library', id: string, excludedUsers: Array<{ __typename?: 'User', id: string, username: string }> } };

export type CleanLibraryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CleanLibraryMutation = { __typename?: 'Mutation', cleanLibrary: { __typename?: 'CleanLibraryResponse', deletedMediaCount: number, deletedSeriesCount: number, isEmpty: boolean } };

export type AnalyzeLibraryMediaMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type AnalyzeLibraryMediaMutation = { __typename?: 'Mutation', analyzeMedia: boolean };

export type ScanHistorySectionClearHistoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ScanHistorySectionClearHistoryMutation = { __typename?: 'Mutation', clearScanHistory: number };

export type ScanHistoryTableQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ScanHistoryTableQuery = { __typename?: 'Query', libraryById?: { __typename?: 'Library', id: string, scanHistory: Array<{ __typename?: 'LibraryScanRecord', id: number, jobId?: string | null, timestamp: any, options?: any | null }> } | null };

export type ScanRecordInspectorJobsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  loadLogs: Scalars['Boolean']['input'];
}>;


export type ScanRecordInspectorJobsQuery = { __typename?: 'Query', jobById?: { __typename?: 'Job', id: string, outputData?: { __typename: 'ExternalJobOutput' } | { __typename: 'LibraryScanOutput', totalFiles: number, totalDirectories: number, ignoredFiles: number, skippedFiles: number, ignoredDirectories: number, createdMedia: number, updatedMedia: number, createdSeries: number, updatedSeries: number } | { __typename: 'SeriesScanOutput' } | { __typename: 'ThumbnailGenerationOutput' } | null, logs?: Array<{ __typename?: 'Log', id: number }> } | null };

export type DeleteLibraryThumbnailsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteLibraryThumbnailsMutation = { __typename?: 'Mutation', deleteLibraryThumbnails: boolean };

export type LibraryThumbnailSelectorUpdateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateThumbnailInput;
}>;


export type LibraryThumbnailSelectorUpdateMutation = { __typename?: 'Mutation', updateLibraryThumbnail: { __typename?: 'Library', id: string, thumbnail: { __typename?: 'ImageRef', url: string } } };

export type LibraryThumbnailSelectorUploadMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  file: Scalars['Upload']['input'];
}>;


export type LibraryThumbnailSelectorUploadMutation = { __typename?: 'Mutation', uploadLibraryThumbnail: { __typename?: 'Library', id: string, thumbnail: { __typename?: 'ImageRef', url: string } } };

export type RegenerateThumbnailsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  forceRegenerate: Scalars['Boolean']['input'];
}>;


export type RegenerateThumbnailsMutation = { __typename?: 'Mutation', generateLibraryThumbnails: boolean };

export type SeriesLayoutQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SeriesLayoutQuery = { __typename?: 'Query', seriesById?: { __typename?: 'Series', id: string, path: string, resolvedName: string, resolvedDescription?: string | null, library: { __typename?: 'Library', id: string, name: string }, tags: Array<{ __typename?: 'Tag', id: number, name: string }> } | null };

export type SeriesLibrayLinkQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SeriesLibrayLinkQuery = { __typename?: 'Query', libraryById?: { __typename?: 'Library', id: string, name: string } | null };

export type SeriesBooksSceneQueryVariables = Exact<{
  filter: MediaFilterInput;
  orderBy: Array<MediaOrderBy> | MediaOrderBy;
  pagination: Pagination;
}>;


export type SeriesBooksSceneQuery = { __typename?: 'Query', media: { __typename?: 'PaginatedMediaResponse', nodes: Array<(
      { __typename?: 'Media', id: string }
      & { ' $fragmentRefs'?: { 'BookCardFragment': BookCardFragment;'BookMetadataFragment': BookMetadataFragment } }
    )>, pageInfo: { __typename: 'CursorPaginationInfo' } | { __typename: 'OffsetPaginationInfo', currentPage: number, totalPages: number, pageSize: number, pageOffset: number, zeroBased: boolean } } };

export type SeriesBookGridQueryVariables = Exact<{
  id: Scalars['String']['input'];
  pagination?: InputMaybe<Pagination>;
}>;


export type SeriesBookGridQuery = { __typename?: 'Query', media: { __typename?: 'PaginatedMediaResponse', nodes: Array<{ __typename?: 'Media', id: string, pages: number, thumbnail: { __typename?: 'ImageRef', url: string } }>, pageInfo: { __typename: 'CursorPaginationInfo', currentCursor?: string | null, nextCursor?: string | null, limit: number } | { __typename: 'OffsetPaginationInfo' } } };

export type SeriesSettingsSceneQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SeriesSettingsSceneQuery = { __typename?: 'Query', seriesById?: (
    { __typename?: 'Series', id: string, metadata?: (
      { __typename?: 'SeriesMetadata' }
      & { ' $fragmentRefs'?: { 'SeriesMetadataEditorFragment': SeriesMetadataEditorFragment } }
    ) | null }
    & { ' $fragmentRefs'?: { 'SeriesThumbnailSelectorFragment': SeriesThumbnailSelectorFragment } }
  ) | null };

export type SeriesSettingsSceneAnalyzeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SeriesSettingsSceneAnalyzeMutation = { __typename?: 'Mutation', analyzeSeries: boolean };

export type SeriesSettingsSceneResetMetadataMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  impact: MetadataResetImpact;
}>;


export type SeriesSettingsSceneResetMetadataMutation = { __typename?: 'Mutation', resetSeriesMetadata: { __typename?: 'Series', id: string } };

export type SeriesThumbnailSelectorFragment = { __typename?: 'Series', id: string, thumbnail: { __typename?: 'ImageRef', url: string } } & { ' $fragmentName'?: 'SeriesThumbnailSelectorFragment' };

export type SeriesThumbnailSelectorUpdateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateThumbnailInput;
}>;


export type SeriesThumbnailSelectorUpdateMutation = { __typename?: 'Mutation', updateSeriesThumbnail: { __typename?: 'Series', id: string, thumbnail: { __typename?: 'ImageRef', url: string } } };

export type SeriesThumbnailSelectorUploadMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  file: Scalars['Upload']['input'];
}>;


export type SeriesThumbnailSelectorUploadMutation = { __typename?: 'Mutation', uploadSeriesThumbnail: { __typename?: 'Series', id: string, thumbnail: { __typename?: 'ImageRef', url: string } } };

export type ApiKeyTableQueryVariables = Exact<{ [key: string]: never; }>;


export type ApiKeyTableQuery = { __typename?: 'Query', apiKeys: Array<{ __typename?: 'Apikey', id: number, name: string, lastUsedAt?: any | null, expiresAt?: any | null, createdAt: any, permissions: { __typename: 'InheritPermissionStruct' } | { __typename: 'UserPermissionStruct', value: Array<UserPermission> } }> };

export type CreateApiKeyModalMutationVariables = Exact<{
  input: ApikeyInput;
}>;


export type CreateApiKeyModalMutation = { __typename?: 'Mutation', createApiKey: { __typename?: 'CreatedAPIKey', secret: string, apiKey: { __typename?: 'Apikey', id: number } } };

export type DeleteApiKeyConfirmModalMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteApiKeyConfirmModalMutation = { __typename?: 'Mutation', deleteApiKey: { __typename?: 'Apikey', id: number } };

export type UpdateUserLocaleSelectorMutationVariables = Exact<{
  input: UpdateUserPreferencesInput;
}>;


export type UpdateUserLocaleSelectorMutation = { __typename?: 'Mutation', updateViewerPreferences: { __typename?: 'UserPreferences', locale: string } };

export type UpdateUserProfileFormMutationVariables = Exact<{
  input: UpdateUserInput;
}>;


export type UpdateUserProfileFormMutation = { __typename?: 'Mutation', updateViewer: { __typename?: 'User', id: string, username: string, avatarUrl?: string | null } };

export type NavigationArrangementQueryVariables = Exact<{ [key: string]: never; }>;


export type NavigationArrangementQuery = { __typename?: 'Query', me: { __typename?: 'User', preferences: { __typename?: 'UserPreferences', navigationArrangement: { __typename?: 'Arrangement', locked: boolean, sections: Array<{ __typename: 'ArrangementSection', visible: boolean, config: { __typename: 'CustomArrangementConfig' } | { __typename: 'InProgressBooks' } | { __typename: 'RecentlyAdded' } | { __typename: 'SystemArrangementConfig', variant: SystemArrangement, links: Array<FilterableArrangementEntityLink> } }> } } } };

export type NavigationArrangementUpdateMutationVariables = Exact<{
  input: NavigationArrangementInput;
}>;


export type NavigationArrangementUpdateMutation = { __typename?: 'Mutation', updateNavigationArrangement: { __typename: 'Arrangement' } };

export type NavigationArrangementUpdateLockStatusMutationVariables = Exact<{
  locked: Scalars['Boolean']['input'];
}>;


export type NavigationArrangementUpdateLockStatusMutation = { __typename?: 'Mutation', updateNavigationArrangementLock: { __typename: 'Arrangement' } };

export type CreateEmailerSceneEmailersQueryVariables = Exact<{ [key: string]: never; }>;


export type CreateEmailerSceneEmailersQuery = { __typename?: 'Query', emailers: Array<{ __typename?: 'Emailer', name: string }> };

export type CreateEmailerSceneCreateEmailerMutationVariables = Exact<{
  input: EmailerInput;
}>;


export type CreateEmailerSceneCreateEmailerMutation = { __typename?: 'Mutation', createEmailer: { __typename?: 'Emailer', id: number } };

export type EditEmailerSceneQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type EditEmailerSceneQuery = { __typename?: 'Query', emailers: Array<{ __typename?: 'Emailer', name: string }>, emailerById?: { __typename?: 'Emailer', id: number, name: string, isPrimary: boolean, smtpHost: string, smtpPort: number, lastUsedAt?: any | null, maxAttachmentSizeBytes?: number | null, senderDisplayName: string, senderEmail: string, tlsEnabled: boolean, username: string } | null };

export type EditEmailerSceneEditEmailerMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: EmailerInput;
}>;


export type EditEmailerSceneEditEmailerMutation = { __typename?: 'Mutation', updateEmailer: { __typename?: 'Emailer', id: number } };

export type CreateOrUpdateDeviceModalCreateEmailDeviceMutationVariables = Exact<{
  input: EmailDeviceInput;
}>;


export type CreateOrUpdateDeviceModalCreateEmailDeviceMutation = { __typename?: 'Mutation', createEmailDevice: { __typename?: 'RegisteredEmailDevice', id: number, name: string } };

export type CreateOrUpdateDeviceModalUpdateEmailDeviceMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: EmailDeviceInput;
}>;


export type CreateOrUpdateDeviceModalUpdateEmailDeviceMutation = { __typename?: 'Mutation', updateEmailDevice: { __typename?: 'RegisteredEmailDevice', id: number, name: string, forbidden: boolean } };

export type DeleteDeviceConfirmationDeleteEmailDeviceMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteDeviceConfirmationDeleteEmailDeviceMutation = { __typename?: 'Mutation', deleteEmailDevice: { __typename?: 'RegisteredEmailDevice', id: number } };

export type EmailDevicesTableQueryVariables = Exact<{ [key: string]: never; }>;


export type EmailDevicesTableQuery = { __typename?: 'Query', emailDevices: Array<{ __typename?: 'RegisteredEmailDevice', id: number, name: string, email: string, forbidden: boolean }> };

export type EmailerListItemFragment = { __typename?: 'Emailer', id: number, name: string, isPrimary: boolean, smtpHost: string, smtpPort: number, lastUsedAt?: any | null, maxAttachmentSizeBytes?: number | null, senderDisplayName: string, senderEmail: string, tlsEnabled: boolean, username: string } & { ' $fragmentName'?: 'EmailerListItemFragment' };

export type EmailerSendHistoryQueryVariables = Exact<{
  id: Scalars['Int']['input'];
  fetchUser: Scalars['Boolean']['input'];
}>;


export type EmailerSendHistoryQuery = { __typename?: 'Query', emailerById?: { __typename?: 'Emailer', sendHistory: Array<{ __typename?: 'EmailerSendRecord', sentAt: any, recipientEmail: string, sentByUserId?: string | null, sentBy?: { __typename?: 'User', id: string, username: string } | null, attachmentMeta: Array<{ __typename?: 'AttachmentMeta', filename: string, mediaId?: string | null, size: number, media?: { __typename?: 'Media', resolvedName: string } | null }> }> } | null };

export type EmailersListQueryVariables = Exact<{ [key: string]: never; }>;


export type EmailersListQuery = { __typename?: 'Query', emailers: Array<(
    { __typename?: 'Emailer', id: number }
    & { ' $fragmentRefs'?: { 'EmailerListItemFragment': EmailerListItemFragment } }
  )> };

export type DeleteJobHistoryConfirmationMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteJobHistoryConfirmationMutation = { __typename?: 'Mutation', deleteJobHistory: { __typename?: 'DeleteJobHistory', affectedRows: number } };

export type JobActionMenuCancelJobMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type JobActionMenuCancelJobMutation = { __typename?: 'Mutation', cancelJob: boolean };

export type JobActionMenuDeleteJobMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type JobActionMenuDeleteJobMutation = { __typename?: 'Mutation', cancelJob: boolean };

export type JobActionMenuDeleteLogsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type JobActionMenuDeleteLogsMutation = { __typename?: 'Mutation', deleteJobLogs: { __typename?: 'DeleteJobAssociatedLogs', affectedRows: number } };

type JobDataInspector_ExternalJobOutput_Fragment = { __typename: 'ExternalJobOutput', val: any } & { ' $fragmentName'?: 'JobDataInspector_ExternalJobOutput_Fragment' };

type JobDataInspector_LibraryScanOutput_Fragment = { __typename: 'LibraryScanOutput', totalFiles: number, totalDirectories: number, ignoredFiles: number, skippedFiles: number, ignoredDirectories: number, createdMedia: number, updatedMedia: number, createdSeries: number, updatedSeries: number } & { ' $fragmentName'?: 'JobDataInspector_LibraryScanOutput_Fragment' };

type JobDataInspector_SeriesScanOutput_Fragment = { __typename: 'SeriesScanOutput', totalFiles: number, ignoredFiles: number, skippedFiles: number, createdMedia: number, updatedMedia: number } & { ' $fragmentName'?: 'JobDataInspector_SeriesScanOutput_Fragment' };

type JobDataInspector_ThumbnailGenerationOutput_Fragment = { __typename: 'ThumbnailGenerationOutput', visitedFiles: number, skippedFiles: number, generatedThumbnails: number, removedThumbnails: number } & { ' $fragmentName'?: 'JobDataInspector_ThumbnailGenerationOutput_Fragment' };

export type JobDataInspectorFragment = JobDataInspector_ExternalJobOutput_Fragment | JobDataInspector_LibraryScanOutput_Fragment | JobDataInspector_SeriesScanOutput_Fragment | JobDataInspector_ThumbnailGenerationOutput_Fragment;

export type JobSchedulerConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type JobSchedulerConfigQuery = { __typename?: 'Query', libraries: { __typename?: 'PaginatedLibraryResponse', nodes: Array<{ __typename?: 'Library', id: string, name: string, emoji?: string | null }> }, scheduledJobConfigs: Array<{ __typename?: 'ScheduledJobConfig', id: number, intervalSecs: number, scanConfigs: Array<{ __typename?: 'Library', id: string, name: string }> }> };

export type JobSchedulerUpdateMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: ScheduledJobConfigInput;
}>;


export type JobSchedulerUpdateMutation = { __typename?: 'Mutation', updateScheduledJobConfig: { __typename?: 'ScheduledJobConfig', id: number, intervalSecs: number, scanConfigs: Array<{ __typename?: 'Library', id: string, name: string }> } };

export type JobSchedulerDeleteMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type JobSchedulerDeleteMutation = { __typename?: 'Mutation', deleteScheduledJobConfig: boolean };

export type JobSchedulerCreateMutationVariables = Exact<{
  input: ScheduledJobConfigInput;
}>;


export type JobSchedulerCreateMutation = { __typename?: 'Mutation', createScheduledJobConfig: { __typename?: 'ScheduledJobConfig', id: number, intervalSecs: number, scanConfigs: Array<{ __typename?: 'Library', id: string, name: string }> } };

export type JobTableQueryVariables = Exact<{
  pagination: Pagination;
}>;


export type JobTableQuery = { __typename?: 'Query', jobs: { __typename?: 'PaginatedJobResponse', nodes: Array<{ __typename?: 'Job', id: string, name: string, description?: string | null, status: JobStatus, createdAt: any, completedAt?: any | null, msElapsed: number, logCount: number, outputData?: (
        { __typename?: 'ExternalJobOutput' }
        & { ' $fragmentRefs'?: { 'JobDataInspector_ExternalJobOutput_Fragment': JobDataInspector_ExternalJobOutput_Fragment } }
      ) | (
        { __typename?: 'LibraryScanOutput' }
        & { ' $fragmentRefs'?: { 'JobDataInspector_LibraryScanOutput_Fragment': JobDataInspector_LibraryScanOutput_Fragment } }
      ) | (
        { __typename?: 'SeriesScanOutput' }
        & { ' $fragmentRefs'?: { 'JobDataInspector_SeriesScanOutput_Fragment': JobDataInspector_SeriesScanOutput_Fragment } }
      ) | (
        { __typename?: 'ThumbnailGenerationOutput' }
        & { ' $fragmentRefs'?: { 'JobDataInspector_ThumbnailGenerationOutput_Fragment': JobDataInspector_ThumbnailGenerationOutput_Fragment } }
      ) | null }>, pageInfo: { __typename: 'CursorPaginationInfo' } | { __typename: 'OffsetPaginationInfo', currentPage: number, totalPages: number, pageSize: number, pageOffset: number, zeroBased: boolean } } };

export type LiveLogsFeedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type LiveLogsFeedSubscription = { __typename?: 'Subscription', tailLogFile: string };

export type DeleteLogsMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteLogsMutation = { __typename?: 'Mutation', deleteLogs: { __typename?: 'LogDeleteOutput', deleted: number } };

export type PersistedLogsQueryVariables = Exact<{
  filter: LogFilterInput;
  pagination: Pagination;
  orderBy: Array<LogModelOrderBy> | LogModelOrderBy;
}>;


export type PersistedLogsQuery = { __typename?: 'Query', logs: { __typename?: 'PaginatedLogResponse', nodes: Array<{ __typename?: 'Log', id: number, timestamp: any, level: LogLevel, message: string, jobId?: string | null, context?: string | null }>, pageInfo: { __typename: 'CursorPaginationInfo' } | { __typename: 'OffsetPaginationInfo', totalPages: number, currentPage: number, pageSize: number, pageOffset: number, zeroBased: boolean } } };

export type CreateOrUpdateUserFormUpdateUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
}>;


export type CreateOrUpdateUserFormUpdateUserMutation = { __typename?: 'Mutation', updateUser: { __typename?: 'User', id: string, username: string, permissions: Array<UserPermission>, maxSessionsAllowed?: number | null, ageRestriction?: { __typename?: 'AgeRestriction', age: number, restrictOnUnset: boolean } | null } };

export type CreateOrUpdateUserFormCreateUserMutationVariables = Exact<{
  input: CreateUserInput;
}>;


export type CreateOrUpdateUserFormCreateUserMutation = { __typename?: 'Mutation', createUser: { __typename?: 'User', id: string } };

export type CreateUserSceneQueryVariables = Exact<{ [key: string]: never; }>;


export type CreateUserSceneQuery = { __typename?: 'Query', users: { __typename?: 'PaginatedUserResponse', nodes: Array<{ __typename?: 'User', username: string }> } };

export type UpdateUserSceneQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  skip: Scalars['Boolean']['input'];
}>;


export type UpdateUserSceneQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string }, userById?: { __typename?: 'User', id: string, avatarUrl?: string | null, username: string, permissions: Array<UserPermission>, maxSessionsAllowed?: number | null, isServerOwner: boolean, ageRestriction?: { __typename?: 'AgeRestriction', age: number, restrictOnUnset: boolean } | null }, users?: { __typename?: 'PaginatedUserResponse', nodes: Array<{ __typename?: 'User', username: string }> } };

export type ClearLoginActivityConfirmationMutationVariables = Exact<{ [key: string]: never; }>;


export type ClearLoginActivityConfirmationMutation = { __typename?: 'Mutation', deleteLoginActivity: number };

export type LoginActivityTableQueryVariables = Exact<{ [key: string]: never; }>;


export type LoginActivityTableQuery = { __typename?: 'Query', loginActivity: Array<{ __typename?: 'UserLoginActivity', id: number, ipAddress: string, userAgent: string, authenticationSuccessful: boolean, timestamp: any, user: { __typename?: 'User', id: string, username: string, avatarUrl?: string | null } }> };

export type DeleteUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  hardDelete?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type DeleteUserMutation = { __typename?: 'Mutation', deleteUser: { __typename?: 'User', id: string } };

export type UserActionMenuLockUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  lock: Scalars['Boolean']['input'];
}>;


export type UserActionMenuLockUserMutation = { __typename?: 'Mutation', updateUserLockStatus: { __typename?: 'User', id: string, isLocked: boolean } };

export type UserActionMenuDeleteUserSessionsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UserActionMenuDeleteUserSessionsMutation = { __typename?: 'Mutation', deleteUserSessions: number };

export type UserTableQueryVariables = Exact<{
  pagination: Pagination;
}>;


export type UserTableQuery = { __typename?: 'Query', users: { __typename?: 'PaginatedUserResponse', nodes: Array<{ __typename?: 'User', id: string, avatarUrl?: string | null, username: string, isServerOwner: boolean, isLocked: boolean, createdAt: any, lastLogin?: any | null, loginSessionsCount: number }>, pageInfo: { __typename: 'CursorPaginationInfo' } | { __typename: 'OffsetPaginationInfo', totalPages: number, currentPage: number, pageSize: number, pageOffset: number, zeroBased: boolean } } };

export type CreateSmartListViewMutationVariables = Exact<{
  input: SaveSmartListView;
}>;


export type CreateSmartListViewMutation = { __typename?: 'Mutation', createSmartListView: { __typename?: 'SmartListView', id: number, listId: string, name: string, bookColumns: Array<{ __typename?: 'SmartListViewColumn', id: string, position: number }>, bookSorting: Array<{ __typename?: 'SmartListViewSort', id: string, desc: boolean }>, groupColumns: Array<{ __typename?: 'SmartListViewColumn', id: string, position: number }>, groupSorting: Array<{ __typename?: 'SmartListViewSort', id: string, desc: boolean }> } };

export type UpdateSmartListViewMutationVariables = Exact<{
  originalName: Scalars['String']['input'];
  input: SaveSmartListView;
}>;


export type UpdateSmartListViewMutation = { __typename?: 'Mutation', updateSmartListView: { __typename?: 'SmartListView', id: number, listId: string, name: string, bookColumns: Array<{ __typename?: 'SmartListViewColumn', id: string, position: number }>, bookSorting: Array<{ __typename?: 'SmartListViewSort', id: string, desc: boolean }>, groupColumns: Array<{ __typename?: 'SmartListViewColumn', id: string, position: number }>, groupSorting: Array<{ __typename?: 'SmartListViewSort', id: string, desc: boolean }> } };

export type SmartListsWithSearchQueryVariables = Exact<{
  input: SmartListsInput;
}>;


export type SmartListsWithSearchQuery = { __typename?: 'Query', smartLists: Array<{ __typename?: 'SmartList', id: string, creatorId: string, description?: string | null, defaultGrouping: SmartListGrouping, filters: string, joiner: SmartListJoiner, name: string, visibility: EntityVisibility }> };

export type SmartListByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SmartListByIdQuery = { __typename?: 'Query', smartListById?: { __typename?: 'SmartList', id: string, creatorId: string, description?: string | null, defaultGrouping: SmartListGrouping, filters: string, joiner: SmartListJoiner, name: string, visibility: EntityVisibility, views: Array<{ __typename?: 'SmartListView', id: number, listId: string, name: string, bookColumns: Array<{ __typename?: 'SmartListViewColumn', id: string, position: number }>, bookSorting: Array<{ __typename?: 'SmartListViewSort', id: string, desc: boolean }>, groupColumns: Array<{ __typename?: 'SmartListViewColumn', id: string, position: number }>, groupSorting: Array<{ __typename?: 'SmartListViewSort', id: string, desc: boolean }> }> } | null };

export type SmartListMetaQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SmartListMetaQuery = { __typename?: 'Query', smartListMeta?: { __typename?: 'SmartListMeta', matchedBooks: number, matchedSeries: number, matchedLibraries: number } | null };

export type UpdateSmartListMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: SaveSmartListInput;
}>;


export type UpdateSmartListMutation = { __typename?: 'Mutation', updateSmartList: { __typename: 'SmartList' } };

export type SmartListItemsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SmartListItemsQuery = { __typename?: 'Query', smartListItems: { __typename: 'SmartListGrouped', items: Array<{ __typename?: 'SmartListGroupedItem', entity: { __typename: 'Library', id: string, name: string } | { __typename: 'Series', id: string, name: string }, books: Array<(
        { __typename?: 'Media' }
        & { ' $fragmentRefs'?: { 'BookCardFragment': BookCardFragment;'BookMetadataFragment': BookMetadataFragment } }
      )> }> } | { __typename: 'SmartListUngrouped', books: Array<(
      { __typename?: 'Media' }
      & { ' $fragmentRefs'?: { 'BookCardFragment': BookCardFragment;'BookMetadataFragment': BookMetadataFragment } }
    )> } };

export type SmartListBasicSettingsSceneQueryVariables = Exact<{ [key: string]: never; }>;


export type SmartListBasicSettingsSceneQuery = { __typename?: 'Query', smartLists: Array<{ __typename?: 'SmartList', name: string }> };

export type DeleteSmartListMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteSmartListMutation = { __typename?: 'Mutation', deleteSmartList: { __typename: 'SmartList' } };

export type DirectoryListingQueryVariables = Exact<{
  input: DirectoryListingInput;
  pagination: Pagination;
}>;


export type DirectoryListingQuery = { __typename?: 'Query', listDirectory: { __typename?: 'PaginatedDirectoryListingResponse', nodes: Array<{ __typename?: 'DirectoryListing', parent?: string | null, files: Array<{ __typename?: 'DirectoryListingFile', name: string, path: string, isDirectory: boolean }> }>, pageInfo: { __typename: 'CursorPaginationInfo' } | { __typename: 'OffsetPaginationInfo', currentPage: number, totalPages: number, pageSize: number, pageOffset: number, zeroBased: boolean } } };

export type UploadConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type UploadConfigQuery = { __typename?: 'Query', uploadConfig: { __typename?: 'UploadConfig', enabled: boolean, maxFileUploadSize: number } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: DocumentTypeDecoration<TResult, TVariables>['__apiType'];
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const ReadingNowFragmentDoc = new TypedDocumentString(`
    fragment ReadingNow on Media {
  id
  resolvedName
  metadata {
    summary
    genres
    links
  }
  thumbnail {
    url
  }
}
    `, {"fragmentName":"ReadingNow"}) as unknown as TypedDocumentString<ReadingNowFragment, unknown>;
export const BookGridItemFragmentDoc = new TypedDocumentString(`
    fragment BookGridItem on Media {
  id
  resolvedName
  thumbnail {
    url
  }
}
    `, {"fragmentName":"BookGridItem"}) as unknown as TypedDocumentString<BookGridItemFragment, unknown>;
export const BookListItemFragmentDoc = new TypedDocumentString(`
    fragment BookListItem on Media {
  id
  resolvedName
  thumbnail {
    url
  }
}
    `, {"fragmentName":"BookListItem"}) as unknown as TypedDocumentString<BookListItemFragment, unknown>;
export const BookSearchItemFragmentDoc = new TypedDocumentString(`
    fragment BookSearchItem on Media {
  id
  resolvedName
  thumbnail {
    url
  }
  size
  pages
}
    `, {"fragmentName":"BookSearchItem"}) as unknown as TypedDocumentString<BookSearchItemFragment, unknown>;
export const LibraryGridItemFragmentDoc = new TypedDocumentString(`
    fragment LibraryGridItem on Library {
  id
  name
  thumbnail {
    url
  }
}
    `, {"fragmentName":"LibraryGridItem"}) as unknown as TypedDocumentString<LibraryGridItemFragment, unknown>;
export const LibrarySearchItemFragmentDoc = new TypedDocumentString(`
    fragment LibrarySearchItem on Library {
  id
  name
  thumbnail {
    url
  }
}
    `, {"fragmentName":"LibrarySearchItem"}) as unknown as TypedDocumentString<LibrarySearchItemFragment, unknown>;
export const SeriesGridItemFragmentDoc = new TypedDocumentString(`
    fragment SeriesGridItem on Series {
  id
  resolvedName
  thumbnail {
    url
  }
}
    `, {"fragmentName":"SeriesGridItem"}) as unknown as TypedDocumentString<SeriesGridItemFragment, unknown>;
export const SeriesSearchItemFragmentDoc = new TypedDocumentString(`
    fragment SeriesSearchItem on Series {
  id
  resolvedName
  thumbnail {
    url
  }
  readCount
  mediaCount
  percentageCompleted
}
    `, {"fragmentName":"SeriesSearchItem"}) as unknown as TypedDocumentString<SeriesSearchItemFragment, unknown>;
export const BookCardFragmentDoc = new TypedDocumentString(`
    fragment BookCard on Media {
  id
  resolvedName
  extension
  pages
  size
  status
  thumbnail {
    url
  }
  readProgress {
    percentageCompleted
    epubcfi
    page
    updatedAt
  }
  readHistory {
    __typename
    completedAt
  }
}
    `, {"fragmentName":"BookCard"}) as unknown as TypedDocumentString<BookCardFragment, unknown>;
export const MediaMetadataEditorFragmentDoc = new TypedDocumentString(`
    fragment MediaMetadataEditor on MediaMetadata {
  ageRating
  characters
  colorists
  coverArtists
  day
  editors
  identifierAmazon
  identifierCalibre
  identifierGoogle
  identifierIsbn
  identifierMobiAsin
  identifierUuid
  genres
  inkers
  language
  letterers
  links
  month
  notes
  number
  pageCount
  pencillers
  publisher
  series
  summary
  teams
  title
  titleSort
  volume
  writers
  year
}
    `, {"fragmentName":"MediaMetadataEditor"}) as unknown as TypedDocumentString<MediaMetadataEditorFragment, unknown>;
export const SeriesMetadataEditorFragmentDoc = new TypedDocumentString(`
    fragment SeriesMetadataEditor on SeriesMetadata {
  ageRating
  booktype
  characters
  comicid
  genres
  imprint
  links
  metaType
  publisher
  status
  summary
  title
  volume
  writers
}
    `, {"fragmentName":"SeriesMetadataEditor"}) as unknown as TypedDocumentString<SeriesMetadataEditorFragment, unknown>;
export const BookFileInformationFragmentDoc = new TypedDocumentString(`
    fragment BookFileInformation on Media {
  id
  size
  extension
  hash
  relativeLibraryPath
}
    `, {"fragmentName":"BookFileInformation"}) as unknown as TypedDocumentString<BookFileInformationFragment, unknown>;
export const BookMetadataFragmentDoc = new TypedDocumentString(`
    fragment BookMetadata on Media {
  metadata {
    ageRating
    characters
    colorists
    coverArtists
    editors
    genres
    inkers
    letterers
    links
    pencillers
    publisher
    teams
    writers
    year
  }
}
    `, {"fragmentName":"BookMetadata"}) as unknown as TypedDocumentString<BookMetadataFragment, unknown>;
export const BookThumbnailSelectorFragmentDoc = new TypedDocumentString(`
    fragment BookThumbnailSelector on Media {
  id
  thumbnail {
    url
  }
  pages
}
    `, {"fragmentName":"BookThumbnailSelector"}) as unknown as TypedDocumentString<BookThumbnailSelectorFragment, unknown>;
export const LibrarySettingsConfigFragmentDoc = new TypedDocumentString(`
    fragment LibrarySettingsConfig on Library {
  config {
    id
    convertRarToZip
    hardDeleteConversions
    defaultReadingDir
    defaultReadingMode
    defaultReadingImageScaleFit
    generateFileHashes
    generateKoreaderHashes
    processMetadata
    watch
    libraryPattern
    thumbnailConfig {
      __typename
      resizeMethod {
        __typename
        ... on ScaleEvenlyByFactor {
          factor
        }
        ... on ExactDimensionResize {
          width
          height
        }
        ... on ScaledDimensionResize {
          dimension
          size
        }
      }
      format
      quality
      page
    }
    ignoreRules
  }
}
    `, {"fragmentName":"LibrarySettingsConfig"}) as unknown as TypedDocumentString<LibrarySettingsConfigFragment, unknown>;
export const SeriesThumbnailSelectorFragmentDoc = new TypedDocumentString(`
    fragment SeriesThumbnailSelector on Series {
  id
  thumbnail {
    url
  }
}
    `, {"fragmentName":"SeriesThumbnailSelector"}) as unknown as TypedDocumentString<SeriesThumbnailSelectorFragment, unknown>;
export const EmailerListItemFragmentDoc = new TypedDocumentString(`
    fragment EmailerListItem on Emailer {
  id
  name
  isPrimary
  smtpHost
  smtpPort
  lastUsedAt
  maxAttachmentSizeBytes
  senderDisplayName
  senderEmail
  tlsEnabled
  username
}
    `, {"fragmentName":"EmailerListItem"}) as unknown as TypedDocumentString<EmailerListItemFragment, unknown>;
export const JobDataInspectorFragmentDoc = new TypedDocumentString(`
    fragment JobDataInspector on CoreJobOutput {
  __typename
  ... on LibraryScanOutput {
    totalFiles
    totalDirectories
    ignoredFiles
    skippedFiles
    ignoredDirectories
    createdMedia
    updatedMedia
    createdSeries
    updatedSeries
  }
  ... on SeriesScanOutput {
    totalFiles
    ignoredFiles
    skippedFiles
    createdMedia
    updatedMedia
  }
  ... on ThumbnailGenerationOutput {
    visitedFiles
    skippedFiles
    generatedThumbnails
    removedThumbnails
  }
  ... on ExternalJobOutput {
    val
  }
}
    `, {"fragmentName":"JobDataInspector"}) as unknown as TypedDocumentString<JobDataInspectorFragment, unknown>;
export const SearchMediaDocument = new TypedDocumentString(`
    query SearchMedia($filter: MediaFilterInput!) {
  media(filter: $filter, pagination: {cursor: {limit: 10}}) {
    nodes {
      id
      ...BookSearchItem
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        nextCursor
      }
    }
  }
}
    fragment BookSearchItem on Media {
  id
  resolvedName
  thumbnail {
    url
  }
  size
  pages
}`) as unknown as TypedDocumentString<SearchMediaQuery, SearchMediaQueryVariables>;
export const SearchSeriesDocument = new TypedDocumentString(`
    query SearchSeries($filter: SeriesFilterInput!) {
  series(filter: $filter, pagination: {cursor: {limit: 10}}) {
    nodes {
      id
      ...SeriesSearchItem
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        nextCursor
      }
    }
  }
}
    fragment SeriesSearchItem on Series {
  id
  resolvedName
  thumbnail {
    url
  }
  readCount
  mediaCount
  percentageCompleted
}`) as unknown as TypedDocumentString<SearchSeriesQuery, SearchSeriesQueryVariables>;
export const SearchLibraryDocument = new TypedDocumentString(`
    query SearchLibrary($search: String!) {
  libraries(search: $search, pagination: {cursor: {limit: 10}}) {
    nodes {
      id
      ...LibrarySearchItem
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        nextCursor
      }
    }
  }
}
    fragment LibrarySearchItem on Library {
  id
  name
  thumbnail {
    url
  }
}`) as unknown as TypedDocumentString<SearchLibraryQuery, SearchLibraryQueryVariables>;
export const BookByIdDocument = new TypedDocumentString(`
    query BookById($id: ID!) {
  mediaById(id: $id) {
    id
    extension
    isFavorite
    metadata {
      ageRating
      characters
      colorists
      coverArtists
      day
      editors
      identifierAmazon
      identifierCalibre
      identifierGoogle
      identifierIsbn
      identifierMobiAsin
      identifierUuid
      genres
      inkers
      language
      letterers
      links
      month
      notes
      number
      pageCount
      pencillers
      publisher
      series
      summary
      teams
      title
      titleSort
      volume
      writers
      year
    }
    pages
    readProgress {
      page
      percentageCompleted
      epubcfi
      startedAt
      elapsedSeconds
    }
    readHistory {
      completedAt
    }
    resolvedName
    series {
      resolvedName
    }
    size
    thumbnail {
      url
    }
  }
}
    `) as unknown as TypedDocumentString<BookByIdQuery, BookByIdQueryVariables>;
export const BookReadScreenDocument = new TypedDocumentString(`
    query BookReadScreen($id: ID!) {
  mediaById(id: $id) {
    id
    name: resolvedName
    pages
    extension
    readProgress {
      percentageCompleted
      epubcfi
      page
      elapsedSeconds
    }
    libraryConfig {
      defaultReadingImageScaleFit
      defaultReadingMode
      defaultReadingDir
    }
    metadata {
      pageAnalysis {
        dimensions {
          height
          width
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<BookReadScreenQuery, BookReadScreenQueryVariables>;
export const UpdateReadProgressionDocument = new TypedDocumentString(`
    mutation UpdateReadProgression($id: ID!, $input: MediaProgressInput!) {
  updateMediaProgress(id: $id, input: $input) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<UpdateReadProgressionMutation, UpdateReadProgressionMutationVariables>;
export const BooksScreenDocument = new TypedDocumentString(`
    query BooksScreen($pagination: Pagination) {
  media(pagination: $pagination) {
    nodes {
      id
      ...BookGridItem
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        currentCursor
        nextCursor
        limit
      }
    }
  }
}
    fragment BookGridItem on Media {
  id
  resolvedName
  thumbnail {
    url
  }
}`) as unknown as TypedDocumentString<BooksScreenQuery, BooksScreenQueryVariables>;
export const BookSearchScreenDocument = new TypedDocumentString(`
    query BookSearchScreen($filter: MediaFilterInput!, $pagination: Pagination!) {
  media(filter: $filter, pagination: $pagination) {
    nodes {
      id
      ...BookGridItem
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        currentCursor
        nextCursor
        limit
      }
    }
  }
}
    fragment BookGridItem on Media {
  id
  resolvedName
  thumbnail {
    url
  }
}`) as unknown as TypedDocumentString<BookSearchScreenQuery, BookSearchScreenQueryVariables>;
export const LibrarySeriesScreenSeriesNameDocument = new TypedDocumentString(`
    query LibrarySeriesScreenSeriesName($id: ID!) {
  libraryById(id: $id) {
    name
  }
}
    `) as unknown as TypedDocumentString<LibrarySeriesScreenSeriesNameQuery, LibrarySeriesScreenSeriesNameQueryVariables>;
export const LibrarySeriesScreenDocument = new TypedDocumentString(`
    query LibrarySeriesScreen($filter: SeriesFilterInput!, $pagination: Pagination) {
  series(filter: $filter, pagination: $pagination) {
    nodes {
      id
      ...SeriesGridItem
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        currentCursor
        nextCursor
        limit
      }
    }
  }
}
    fragment SeriesGridItem on Series {
  id
  resolvedName
  thumbnail {
    url
  }
}`) as unknown as TypedDocumentString<LibrarySeriesScreenQuery, LibrarySeriesScreenQueryVariables>;
export const LibrariesScreenDocument = new TypedDocumentString(`
    query LibrariesScreen($pagination: Pagination) {
  libraries(pagination: $pagination) {
    nodes {
      id
      ...LibraryGridItem
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        currentCursor
        nextCursor
        limit
      }
    }
  }
}
    fragment LibraryGridItem on Library {
  id
  name
  thumbnail {
    url
  }
}`) as unknown as TypedDocumentString<LibrariesScreenQuery, LibrariesScreenQueryVariables>;
export const SeriesBooksSceneSeriesNameDocument = new TypedDocumentString(`
    query SeriesBooksSceneSeriesName($id: ID!) {
  seriesById(id: $id) {
    resolvedName
  }
}
    `) as unknown as TypedDocumentString<SeriesBooksSceneSeriesNameQuery, SeriesBooksSceneSeriesNameQueryVariables>;
export const SeriesBooksScreenDocument = new TypedDocumentString(`
    query SeriesBooksScreen($filter: MediaFilterInput!, $pagination: Pagination) {
  media(filter: $filter, pagination: $pagination) {
    nodes {
      id
      ...BookGridItem
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        currentCursor
        nextCursor
        limit
      }
    }
  }
}
    fragment BookGridItem on Media {
  id
  resolvedName
  thumbnail {
    url
  }
}`) as unknown as TypedDocumentString<SeriesBooksScreenQuery, SeriesBooksScreenQueryVariables>;
export const SeriesScreenDocument = new TypedDocumentString(`
    query SeriesScreen($pagination: Pagination) {
  series(pagination: $pagination) {
    nodes {
      id
      ...SeriesGridItem
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        currentCursor
        nextCursor
        limit
      }
    }
  }
}
    fragment SeriesGridItem on Series {
  id
  resolvedName
  thumbnail {
    url
  }
}`) as unknown as TypedDocumentString<SeriesScreenQuery, SeriesScreenQueryVariables>;
export const ContinueReadingDocument = new TypedDocumentString(`
    query ContinueReading($pagination: Pagination) {
  keepReading(pagination: $pagination) {
    nodes {
      id
      ...BookListItem
      ...ReadingNow
    }
    pageInfo {
      __typename
      ... on OffsetPaginationInfo {
        totalPages
        currentPage
        pageSize
        pageOffset
        zeroBased
      }
    }
  }
}
    fragment ReadingNow on Media {
  id
  resolvedName
  metadata {
    summary
    genres
    links
  }
  thumbnail {
    url
  }
}
fragment BookListItem on Media {
  id
  resolvedName
  thumbnail {
    url
  }
}`) as unknown as TypedDocumentString<ContinueReadingQuery, ContinueReadingQueryVariables>;
export const RecentlyAddedBooksDocument = new TypedDocumentString(`
    query RecentlyAddedBooks($pagination: Pagination) {
  recentlyAddedMedia(pagination: $pagination) {
    nodes {
      id
      ...BookListItem
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        currentCursor
        nextCursor
        limit
      }
    }
  }
}
    fragment BookListItem on Media {
  id
  resolvedName
  thumbnail {
    url
  }
}`) as unknown as TypedDocumentString<RecentlyAddedBooksQuery, RecentlyAddedBooksQueryVariables>;
export const StackedBookThumbnailsDocument = new TypedDocumentString(`
    query StackedBookThumbnails {
  media(pagination: {cursor: {limit: 1}}) {
    nodes {
      id
      thumbnail {
        url
      }
    }
  }
}
    `) as unknown as TypedDocumentString<StackedBookThumbnailsQuery, StackedBookThumbnailsQueryVariables>;
export const StackedLibraryThumbnailsDocument = new TypedDocumentString(`
    query StackedLibraryThumbnails {
  libraries(pagination: {none: {unpaginated: true}}) {
    nodes {
      id
      thumbnail {
        url
      }
    }
  }
}
    `) as unknown as TypedDocumentString<StackedLibraryThumbnailsQuery, StackedLibraryThumbnailsQueryVariables>;
export const StackedSeriesThumbnailsDocument = new TypedDocumentString(`
    query StackedSeriesThumbnails {
  series(pagination: {cursor: {limit: 1}}) {
    nodes {
      id
      thumbnail {
        url
      }
    }
  }
}
    `) as unknown as TypedDocumentString<StackedSeriesThumbnailsQuery, StackedSeriesThumbnailsQueryVariables>;
export const StackedSmartListThumbnailsDocument = new TypedDocumentString(`
    query StackedSmartListThumbnails {
  smartLists {
    id
    thumbnail {
      url
    }
  }
}
    `) as unknown as TypedDocumentString<StackedSmartListThumbnailsQuery, StackedSmartListThumbnailsQueryVariables>;
export const UseFavoriteBookDocument = new TypedDocumentString(`
    mutation UseFavoriteBook($id: ID!, $isFavorite: Boolean!) {
  favoriteMedia(id: $id, isFavorite: $isFavorite) {
    id
    isFavorite
  }
}
    `) as unknown as TypedDocumentString<UseFavoriteBookMutation, UseFavoriteBookMutationVariables>;
export const TagSelectQueryDocument = new TypedDocumentString(`
    query TagSelectQuery {
  tags {
    id
    name
  }
}
    `) as unknown as TypedDocumentString<TagSelectQueryQuery, TagSelectQueryQueryVariables>;
export const BookSearchOverlayDocument = new TypedDocumentString(`
    query BookSearchOverlay($pagination: Pagination, $filter: MediaFilterInput!) {
  media(pagination: $pagination, filter: $filter) {
    nodes {
      id
      ...BookCard
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        currentCursor
        nextCursor
        limit
      }
    }
  }
}
    fragment BookCard on Media {
  id
  resolvedName
  extension
  pages
  size
  status
  thumbnail {
    url
  }
  readProgress {
    percentageCompleted
    epubcfi
    page
    updatedAt
  }
  readHistory {
    __typename
    completedAt
  }
}`) as unknown as TypedDocumentString<BookSearchOverlayQuery, BookSearchOverlayQueryVariables>;
export const UpdateMediaMetadataDocument = new TypedDocumentString(`
    mutation UpdateMediaMetadata($id: ID!, $input: MediaMetadataInput!) {
  updateMediaMetadata(id: $id, input: $input) {
    metadata {
      ...MediaMetadataEditor
    }
  }
}
    fragment MediaMetadataEditor on MediaMetadata {
  ageRating
  characters
  colorists
  coverArtists
  day
  editors
  identifierAmazon
  identifierCalibre
  identifierGoogle
  identifierIsbn
  identifierMobiAsin
  identifierUuid
  genres
  inkers
  language
  letterers
  links
  month
  notes
  number
  pageCount
  pencillers
  publisher
  series
  summary
  teams
  title
  titleSort
  volume
  writers
  year
}`) as unknown as TypedDocumentString<UpdateMediaMetadataMutation, UpdateMediaMetadataMutationVariables>;
export const BookOverviewSceneDocument = new TypedDocumentString(`
    query BookOverviewScene($id: ID!) {
  mediaById(id: $id) {
    id
    ...BookCard
    ...BookFileInformation
    resolvedName
    extension
    metadata {
      links
      summary
      ...MediaMetadataEditor
    }
    readHistory {
      completedAt
    }
  }
}
    fragment BookCard on Media {
  id
  resolvedName
  extension
  pages
  size
  status
  thumbnail {
    url
  }
  readProgress {
    percentageCompleted
    epubcfi
    page
    updatedAt
  }
  readHistory {
    __typename
    completedAt
  }
}
fragment MediaMetadataEditor on MediaMetadata {
  ageRating
  characters
  colorists
  coverArtists
  day
  editors
  identifierAmazon
  identifierCalibre
  identifierGoogle
  identifierIsbn
  identifierMobiAsin
  identifierUuid
  genres
  inkers
  language
  letterers
  links
  month
  notes
  number
  pageCount
  pencillers
  publisher
  series
  summary
  teams
  title
  titleSort
  volume
  writers
  year
}
fragment BookFileInformation on Media {
  id
  size
  extension
  hash
  relativeLibraryPath
}`) as unknown as TypedDocumentString<BookOverviewSceneQuery, BookOverviewSceneQueryVariables>;
export const DeleteBookClubConfirmationDocument = new TypedDocumentString(`
    mutation DeleteBookClubConfirmation($id: ID!) {
  deleteBookClub(id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<DeleteBookClubConfirmationMutation, DeleteBookClubConfirmationMutationVariables>;
export const MediaAtPathDocument = new TypedDocumentString(`
    query MediaAtPath($path: String!) {
  mediaByPath(path: $path) {
    id
    resolvedName
    thumbnail {
      url
    }
  }
}
    `) as unknown as TypedDocumentString<MediaAtPathQuery, MediaAtPathQueryVariables>;
export const UploadLibraryBooksDocument = new TypedDocumentString(`
    mutation UploadLibraryBooks($input: UploadBooksInput!) {
  uploadBooks(input: $input)
}
    `) as unknown as TypedDocumentString<UploadLibraryBooksMutation, UploadLibraryBooksMutationVariables>;
export const UploadLibrarySeriesDocument = new TypedDocumentString(`
    mutation UploadLibrarySeries($input: UploadSeriesInput!) {
  uploadSeries(input: $input)
}
    `) as unknown as TypedDocumentString<UploadLibrarySeriesMutation, UploadLibrarySeriesMutationVariables>;
export const MediaFilterFormDocument = new TypedDocumentString(`
    query MediaFilterForm($seriesId: ID) {
  mediaMetadataOverview(seriesId: $seriesId) {
    genres
    writers
    pencillers
    colorists
    letterers
    inkers
    publishers
    editors
    characters
  }
}
    `) as unknown as TypedDocumentString<MediaFilterFormQuery, MediaFilterFormQueryVariables>;
export const DeleteLibraryDocument = new TypedDocumentString(`
    mutation DeleteLibrary($id: ID!) {
  deleteLibrary(id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<DeleteLibraryMutation, DeleteLibraryMutationVariables>;
export const LastVisitedLibraryDocument = new TypedDocumentString(`
    query LastVisitedLibrary {
  lastVisitedLibrary {
    id
    name
    thumbnail {
      url
    }
  }
}
    `) as unknown as TypedDocumentString<LastVisitedLibraryQuery, LastVisitedLibraryQueryVariables>;
export const LibraryBooksAlphabetDocument = new TypedDocumentString(`
    query LibraryBooksAlphabet($id: ID!) {
  libraryById(id: $id) {
    mediaAlphabet
  }
}
    `) as unknown as TypedDocumentString<LibraryBooksAlphabetQuery, LibraryBooksAlphabetQueryVariables>;
export const LibrarySeriesAlphabetDocument = new TypedDocumentString(`
    query LibrarySeriesAlphabet($id: ID!) {
  libraryById(id: $id) {
    seriesAlphabet
  }
}
    `) as unknown as TypedDocumentString<LibrarySeriesAlphabetQuery, LibrarySeriesAlphabetQueryVariables>;
export const SideBarQueryDocument = new TypedDocumentString(`
    query SideBarQuery {
  me {
    id
    preferences {
      navigationArrangement {
        locked
        sections {
          config {
            __typename
            ... on SystemArrangementConfig {
              variant
              links
            }
          }
          visible
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<SideBarQueryQuery, SideBarQueryQueryVariables>;
export const BookClubSideBarSectionDocument = new TypedDocumentString(`
    query BookClubSideBarSection {
  bookClubs {
    id
    name
    slug
    emoji
    members {
      id
      userId
      role
    }
  }
}
    `) as unknown as TypedDocumentString<BookClubSideBarSectionQuery, BookClubSideBarSectionQueryVariables>;
export const UpdateLibraryEmojiDocument = new TypedDocumentString(`
    mutation UpdateLibraryEmoji($id: ID!, $emoji: String) {
  updateLibraryEmoji(id: $id, emoji: $emoji) {
    id
  }
}
    `) as unknown as TypedDocumentString<UpdateLibraryEmojiMutation, UpdateLibraryEmojiMutationVariables>;
export const ScanLibraryMutationDocument = new TypedDocumentString(`
    mutation ScanLibraryMutation($id: ID!) {
  scanLibrary(id: $id)
}
    `) as unknown as TypedDocumentString<ScanLibraryMutationMutation, ScanLibraryMutationMutationVariables>;
export const LibrarySideBarSectionDocument = new TypedDocumentString(`
    query LibrarySideBarSection {
  libraries(pagination: {none: {unpaginated: true}}) {
    nodes {
      id
      name
      emoji
    }
  }
}
    `) as unknown as TypedDocumentString<LibrarySideBarSectionQuery, LibrarySideBarSectionQueryVariables>;
export const SmartListSideBarSectionDocument = new TypedDocumentString(`
    query SmartListSideBarSection {
  smartLists {
    id
    name
  }
}
    `) as unknown as TypedDocumentString<SmartListSideBarSectionQuery, SmartListSideBarSectionQueryVariables>;
export const TopNavigationDocument = new TypedDocumentString(`
    query TopNavigation {
  me {
    id
    preferences {
      navigationArrangement {
        locked
        sections {
          config {
            __typename
            ... on SystemArrangementConfig {
              variant
              links
            }
          }
          visible
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<TopNavigationQuery, TopNavigationQueryVariables>;
export const LibraryNavigationItemDocument = new TypedDocumentString(`
    query LibraryNavigationItem {
  libraries(pagination: {none: {unpaginated: true}}) {
    nodes {
      id
      name
      emoji
    }
  }
}
    `) as unknown as TypedDocumentString<LibraryNavigationItemQuery, LibraryNavigationItemQueryVariables>;
export const EpubJsReaderDocument = new TypedDocumentString(`
    query EpubJsReader($id: ID!) {
  epubById(id: $id) {
    mediaId
    rootBase
    rootFile
    extraCss
    toc
    resources
    metadata
    spine {
      id
      idref
      properties
      linear
    }
    bookmarks {
      id
      userId
      epubcfi
      mediaId
    }
    media {
      id
      resolvedName
      pages
      extension
      readProgress {
        percentageCompleted
        epubcfi
        page
        elapsedSeconds
      }
      libraryConfig {
        defaultReadingImageScaleFit
        defaultReadingMode
        defaultReadingDir
      }
    }
  }
}
    `) as unknown as TypedDocumentString<EpubJsReaderQuery, EpubJsReaderQueryVariables>;
export const UpdateEpubProgressDocument = new TypedDocumentString(`
    mutation UpdateEpubProgress($id: ID!, $input: MediaProgressInput!) {
  updateMediaProgress(id: $id, input: $input) {
    __typename
    ... on ActiveReadingSession {
      percentageCompleted
      epubcfi
      page
      elapsedSeconds
    }
  }
}
    `) as unknown as TypedDocumentString<UpdateEpubProgressMutation, UpdateEpubProgressMutationVariables>;
export const CreateOrUpdateBookmarkDocument = new TypedDocumentString(`
    mutation CreateOrUpdateBookmark($input: BookmarkInput!) {
  createOrUpdateBookmark(input: $input) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<CreateOrUpdateBookmarkMutation, CreateOrUpdateBookmarkMutationVariables>;
export const DeleteBookmarkDocument = new TypedDocumentString(`
    mutation DeleteBookmark($epubcfi: String!) {
  deleteBookmark(epubcfi: $epubcfi) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<DeleteBookmarkMutation, DeleteBookmarkMutationVariables>;
export const SeriesBooksAlphabetDocument = new TypedDocumentString(`
    query SeriesBooksAlphabet($id: ID!) {
  seriesById(id: $id) {
    mediaAlphabet
  }
}
    `) as unknown as TypedDocumentString<SeriesBooksAlphabetQuery, SeriesBooksAlphabetQueryVariables>;
export const UpdateSeriesMetadataDocument = new TypedDocumentString(`
    mutation UpdateSeriesMetadata($id: ID!, $input: SeriesMetadataInput!) {
  updateSeriesMetadata(id: $id, input: $input) {
    metadata {
      ...SeriesMetadataEditor
    }
  }
}
    fragment SeriesMetadataEditor on SeriesMetadata {
  ageRating
  booktype
  characters
  comicid
  genres
  imprint
  links
  metaType
  publisher
  status
  summary
  title
  volume
  writers
}`) as unknown as TypedDocumentString<UpdateSeriesMetadataMutation, UpdateSeriesMetadataMutationVariables>;
export const UseCoreEventDocument = new TypedDocumentString(`
    subscription UseCoreEvent {
  readEvents {
    __typename
    ... on CreatedManySeries {
      count
      libraryId
    }
    ... on CreatedMedia {
      id
      seriesId
    }
    ... on CreatedOrUpdatedManyMedia {
      count
      seriesId
    }
    ... on DiscoveredMissingLibrary {
      id
    }
    ... on JobStarted {
      id
    }
    ... on JobUpdate {
      __typename
      id
      status
      message
      completedTasks
      remainingTasks
      completedSubtasks
      totalSubtasks
    }
    ... on JobOutput {
      id
      output {
        __typename
        ... on LibraryScanOutput {
          createdMedia
          createdSeries
          updatedMedia
          updatedSeries
        }
        ... on SeriesScanOutput {
          createdMedia
          updatedMedia
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<UseCoreEventSubscription, UseCoreEventSubscriptionVariables>;
export const UsePreferencesDocument = new TypedDocumentString(`
    mutation UsePreferences($input: UpdateUserPreferencesInput!) {
  updateViewerPreferences(input: $input) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<UsePreferencesMutation, UsePreferencesMutationVariables>;
export const BookActionMenuCompleteDocument = new TypedDocumentString(`
    mutation BookActionMenuComplete($id: ID!, $isComplete: Boolean!, $page: Int) {
  markMediaAsComplete(id: $id, isComplete: $isComplete, page: $page) {
    completedAt
  }
}
    `) as unknown as TypedDocumentString<BookActionMenuCompleteMutation, BookActionMenuCompleteMutationVariables>;
export const BookActionMenuDeleteSessionDocument = new TypedDocumentString(`
    mutation BookActionMenuDeleteSession($id: ID!) {
  deleteMediaProgress(id: $id) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<BookActionMenuDeleteSessionMutation, BookActionMenuDeleteSessionMutationVariables>;
export const BookActionMenuDeleteHistoryDocument = new TypedDocumentString(`
    mutation BookActionMenuDeleteHistory($id: ID!) {
  deleteMediaReadHistory(id: $id) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<BookActionMenuDeleteHistoryMutation, BookActionMenuDeleteHistoryMutationVariables>;
export const BookLibrarySeriesLinksDocument = new TypedDocumentString(`
    query BookLibrarySeriesLinks($id: ID!) {
  seriesById(id: $id) {
    id
    name
    libraryId
  }
}
    `) as unknown as TypedDocumentString<BookLibrarySeriesLinksQuery, BookLibrarySeriesLinksQueryVariables>;
export const BookOverviewHeaderDocument = new TypedDocumentString(`
    query BookOverviewHeader($id: ID!) {
  mediaById(id: $id) {
    id
    resolvedName
    seriesId
    extension
    pages
    metadata {
      ageRating
      genres
      publisher
      writers
      year
    }
    tags {
      id
      name
    }
  }
}
    `) as unknown as TypedDocumentString<BookOverviewHeaderQuery, BookOverviewHeaderQueryVariables>;
export const BooksAfterCurrentQueryDocument = new TypedDocumentString(`
    query BooksAfterCurrentQuery($id: ID!, $pagination: Pagination) {
  mediaById(id: $id) {
    nextInSeries(pagination: $pagination) {
      nodes {
        id
        ...BookCard
      }
      pageInfo {
        __typename
        ... on CursorPaginationInfo {
          currentCursor
          nextCursor
          limit
        }
      }
    }
  }
}
    fragment BookCard on Media {
  id
  resolvedName
  extension
  pages
  size
  status
  thumbnail {
    url
  }
  readProgress {
    percentageCompleted
    epubcfi
    page
    updatedAt
  }
  readHistory {
    __typename
    completedAt
  }
}`) as unknown as TypedDocumentString<BooksAfterCurrentQueryQuery, BooksAfterCurrentQueryQueryVariables>;
export const BooksAlphabetDocument = new TypedDocumentString(`
    query BooksAlphabet {
  mediaAlphabet
}
    `) as unknown as TypedDocumentString<BooksAlphabetQuery, BooksAlphabetQueryVariables>;
export const EmailBookDropdownDeviceDocument = new TypedDocumentString(`
    query EmailBookDropdownDevice {
  emailDevices {
    id
    name
  }
}
    `) as unknown as TypedDocumentString<EmailBookDropdownDeviceQuery, EmailBookDropdownDeviceQueryVariables>;
export const SendEmailAttachmentDocument = new TypedDocumentString(`
    mutation SendEmailAttachment($id: ID!, $sendTo: [EmailerSendTo!]!) {
  sendAttachmentEmail(input: {mediaIds: [$id], sendTo: $sendTo}) {
    sentCount
    errors
  }
}
    `) as unknown as TypedDocumentString<SendEmailAttachmentMutation, SendEmailAttachmentMutationVariables>;
export const BookReaderSceneDocument = new TypedDocumentString(`
    query BookReaderScene($id: ID!) {
  mediaById(id: $id) {
    id
    resolvedName
    pages
    extension
    readProgress {
      percentageCompleted
      epubcfi
      page
      elapsedSeconds
    }
    libraryConfig {
      defaultReadingImageScaleFit
      defaultReadingMode
      defaultReadingDir
    }
    metadata {
      pageAnalysis {
        dimensions {
          height
          width
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<BookReaderSceneQuery, BookReaderSceneQueryVariables>;
export const UpdateReadProgressDocument = new TypedDocumentString(`
    mutation UpdateReadProgress($id: ID!, $input: MediaProgressInput!) {
  updateMediaProgress(id: $id, input: $input) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<UpdateReadProgressMutation, UpdateReadProgressMutationVariables>;
export const BookManagementSceneDocument = new TypedDocumentString(`
    query BookManagementScene($id: ID!) {
  mediaById(id: $id) {
    id
    resolvedName
    library {
      id
      name
    }
    series {
      id
      resolvedName
    }
    ...BookThumbnailSelector
  }
}
    fragment BookThumbnailSelector on Media {
  id
  thumbnail {
    url
  }
  pages
}`) as unknown as TypedDocumentString<BookManagementSceneQuery, BookManagementSceneQueryVariables>;
export const BookManagementSceneAnalyzeDocument = new TypedDocumentString(`
    mutation BookManagementSceneAnalyze($id: ID!) {
  analyzeMedia(id: $id)
}
    `) as unknown as TypedDocumentString<BookManagementSceneAnalyzeMutation, BookManagementSceneAnalyzeMutationVariables>;
export const BookThumbnailSelectorUpdateDocument = new TypedDocumentString(`
    mutation BookThumbnailSelectorUpdate($id: ID!, $input: PageBasedThumbnailInput!) {
  updateMediaThumbnail(id: $id, input: $input) {
    id
    thumbnail {
      url
    }
  }
}
    `) as unknown as TypedDocumentString<BookThumbnailSelectorUpdateMutation, BookThumbnailSelectorUpdateMutationVariables>;
export const BookThumbnailSelectorUploadDocument = new TypedDocumentString(`
    mutation BookThumbnailSelectorUpload($id: ID!, $file: Upload!) {
  uploadMediaThumbnail(id: $id, file: $file) {
    id
    thumbnail {
      url
    }
  }
}
    `) as unknown as TypedDocumentString<BookThumbnailSelectorUploadMutation, BookThumbnailSelectorUploadMutationVariables>;
export const BookClubLayoutDocument = new TypedDocumentString(`
    query BookClubLayout($slug: String!) {
  bookClubBySlug(slug: $slug) {
    id
    name
    slug
    description
    isPrivate
    roleSpec
    creator {
      id
      displayName
      avatarUrl
    }
    membersCount
    membership {
      role
      isCreator
      avatarUrl
      __typename
    }
    schedule {
      id
      defaultIntervalDays
    }
    createdAt
  }
}
    `) as unknown as TypedDocumentString<BookClubLayoutQuery, BookClubLayoutQueryVariables>;
export const UserBookClubsSceneDocument = new TypedDocumentString(`
    query UserBookClubsScene {
  bookClubs(all: false) {
    id
    name
    slug
    description
    membersCount
    schedule {
      activeBooks {
        __typename
      }
    }
  }
}
    `) as unknown as TypedDocumentString<UserBookClubsSceneQuery, UserBookClubsSceneQueryVariables>;
export const CreateBookClubFormDocument = new TypedDocumentString(`
    query CreateBookClubForm {
  bookClubs {
    name
    slug
  }
}
    `) as unknown as TypedDocumentString<CreateBookClubFormQuery, CreateBookClubFormQueryVariables>;
export const CreateBookClubSceneDocument = new TypedDocumentString(`
    mutation CreateBookClubScene($input: CreateBookClubInput!) {
  createBookClub(input: $input) {
    id
    slug
  }
}
    `) as unknown as TypedDocumentString<CreateBookClubSceneMutation, CreateBookClubSceneMutationVariables>;
export const BookClubBasicSettingsSceneDocument = new TypedDocumentString(`
    query BookClubBasicSettingsScene {
  bookClubs(all: true) {
    id
    name
    slug
  }
}
    `) as unknown as TypedDocumentString<BookClubBasicSettingsSceneQuery, BookClubBasicSettingsSceneQueryVariables>;
export const BookClubMembersTableDocument = new TypedDocumentString(`
    query BookClubMembersTable($id: ID!) {
  bookClubById(id: $id) {
    id
    members {
      id
      avatarUrl
      isCreator
      displayName
      role
      userId
    }
  }
}
    `) as unknown as TypedDocumentString<BookClubMembersTableQuery, BookClubMembersTableQueryVariables>;
export const RemoveBookClubMemberDocument = new TypedDocumentString(`
    mutation RemoveBookClubMember($bookClubId: ID!, $memberId: ID!) {
  removeBookClubMember(bookClubId: $bookClubId, memberId: $memberId) {
    id
  }
}
    `) as unknown as TypedDocumentString<RemoveBookClubMemberMutation, RemoveBookClubMemberMutationVariables>;
export const BookSearchSceneDocument = new TypedDocumentString(`
    query BookSearchScene($filter: MediaFilterInput!, $orderBy: [MediaOrderBy!]!, $pagination: Pagination!) {
  media(filter: $filter, orderBy: $orderBy, pagination: $pagination) {
    nodes {
      id
      ...BookCard
      ...BookMetadata
    }
    pageInfo {
      __typename
      ... on OffsetPaginationInfo {
        currentPage
        totalPages
        pageSize
        pageOffset
        zeroBased
      }
    }
  }
}
    fragment BookCard on Media {
  id
  resolvedName
  extension
  pages
  size
  status
  thumbnail {
    url
  }
  readProgress {
    percentageCompleted
    epubcfi
    page
    updatedAt
  }
  readHistory {
    __typename
    completedAt
  }
}
fragment BookMetadata on Media {
  metadata {
    ageRating
    characters
    colorists
    coverArtists
    editors
    genres
    inkers
    letterers
    links
    pencillers
    publisher
    teams
    writers
    year
  }
}`) as unknown as TypedDocumentString<BookSearchSceneQuery, BookSearchSceneQueryVariables>;
export const CreateLibrarySceneExistingLibrariesDocument = new TypedDocumentString(`
    query CreateLibrarySceneExistingLibraries {
  libraries(pagination: {none: {unpaginated: true}}) {
    nodes {
      id
      name
      path
    }
  }
}
    `) as unknown as TypedDocumentString<CreateLibrarySceneExistingLibrariesQuery, CreateLibrarySceneExistingLibrariesQueryVariables>;
export const CreateLibrarySceneCreateLibraryDocument = new TypedDocumentString(`
    mutation CreateLibrarySceneCreateLibrary($input: CreateOrUpdateLibraryInput!) {
  createLibrary(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<CreateLibrarySceneCreateLibraryMutation, CreateLibrarySceneCreateLibraryMutationVariables>;
export const CreateSmartListFormDocument = new TypedDocumentString(`
    query CreateSmartListForm {
  smartLists(input: {mine: true}) {
    name
  }
}
    `) as unknown as TypedDocumentString<CreateSmartListFormQuery, CreateSmartListFormQueryVariables>;
export const CreateSmartListSceneDocument = new TypedDocumentString(`
    mutation CreateSmartListScene($input: SaveSmartListInput!) {
  createSmartList(input: $input) {
    id
    name
  }
}
    `) as unknown as TypedDocumentString<CreateSmartListSceneMutation, CreateSmartListSceneMutationVariables>;
export const ContinueReadingMediaQueryDocument = new TypedDocumentString(`
    query ContinueReadingMediaQuery($pagination: Pagination!) {
  keepReading(pagination: $pagination) {
    nodes {
      id
      ...BookCard
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        currentCursor
        nextCursor
        limit
      }
      ... on OffsetPaginationInfo {
        currentPage
        totalPages
        pageSize
        pageOffset
        zeroBased
      }
    }
  }
}
    fragment BookCard on Media {
  id
  resolvedName
  extension
  pages
  size
  status
  thumbnail {
    url
  }
  readProgress {
    percentageCompleted
    epubcfi
    page
    updatedAt
  }
  readHistory {
    __typename
    completedAt
  }
}`) as unknown as TypedDocumentString<ContinueReadingMediaQueryQuery, ContinueReadingMediaQueryQueryVariables>;
export const HomeSceneQueryDocument = new TypedDocumentString(`
    query HomeSceneQuery {
  numberOfLibraries
}
    `) as unknown as TypedDocumentString<HomeSceneQueryQuery, HomeSceneQueryQueryVariables>;
export const RecentlyAddedMediaQueryDocument = new TypedDocumentString(`
    query RecentlyAddedMediaQuery($pagination: Pagination!) {
  recentlyAddedMedia(pagination: $pagination) {
    nodes {
      id
      ...BookCard
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        currentCursor
        nextCursor
        limit
      }
    }
  }
}
    fragment BookCard on Media {
  id
  resolvedName
  extension
  pages
  size
  status
  thumbnail {
    url
  }
  readProgress {
    percentageCompleted
    epubcfi
    page
    updatedAt
  }
  readHistory {
    __typename
    completedAt
  }
}`) as unknown as TypedDocumentString<RecentlyAddedMediaQueryQuery, RecentlyAddedMediaQueryQueryVariables>;
export const RecentlyAddedSeriesQueryDocument = new TypedDocumentString(`
    query RecentlyAddedSeriesQuery($pagination: Pagination!) {
  recentlyAddedSeries(pagination: $pagination) {
    nodes {
      id
      resolvedName
      mediaCount
      percentageCompleted
      status
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        currentCursor
        nextCursor
        limit
      }
    }
  }
}
    `) as unknown as TypedDocumentString<RecentlyAddedSeriesQueryQuery, RecentlyAddedSeriesQueryQueryVariables>;
export const LibraryLayoutDocument = new TypedDocumentString(`
    query LibraryLayout($id: ID!) {
  libraryById(id: $id) {
    id
    name
    description
    path
    stats {
      bookCount
      completedBooks
      inProgressBooks
    }
    tags {
      id
      name
    }
    thumbnail {
      url
    }
    ...LibrarySettingsConfig
  }
}
    fragment LibrarySettingsConfig on Library {
  config {
    id
    convertRarToZip
    hardDeleteConversions
    defaultReadingDir
    defaultReadingMode
    defaultReadingImageScaleFit
    generateFileHashes
    generateKoreaderHashes
    processMetadata
    watch
    libraryPattern
    thumbnailConfig {
      __typename
      resizeMethod {
        __typename
        ... on ScaleEvenlyByFactor {
          factor
        }
        ... on ExactDimensionResize {
          width
          height
        }
        ... on ScaledDimensionResize {
          dimension
          size
        }
      }
      format
      quality
      page
    }
    ignoreRules
  }
}`) as unknown as TypedDocumentString<LibraryLayoutQuery, LibraryLayoutQueryVariables>;
export const VisitLibraryDocument = new TypedDocumentString(`
    mutation VisitLibrary($id: ID!) {
  visitLibrary(id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<VisitLibraryMutation, VisitLibraryMutationVariables>;
export const LibraryBooksSceneDocument = new TypedDocumentString(`
    query LibraryBooksScene($filter: MediaFilterInput!, $orderBy: [MediaOrderBy!]!, $pagination: Pagination!) {
  media(filter: $filter, orderBy: $orderBy, pagination: $pagination) {
    nodes {
      id
      ...BookCard
      ...BookMetadata
    }
    pageInfo {
      __typename
      ... on OffsetPaginationInfo {
        currentPage
        totalPages
        pageSize
        pageOffset
        zeroBased
      }
    }
  }
}
    fragment BookCard on Media {
  id
  resolvedName
  extension
  pages
  size
  status
  thumbnail {
    url
  }
  readProgress {
    percentageCompleted
    epubcfi
    page
    updatedAt
  }
  readHistory {
    __typename
    completedAt
  }
}
fragment BookMetadata on Media {
  metadata {
    ageRating
    characters
    colorists
    coverArtists
    editors
    genres
    inkers
    letterers
    links
    pencillers
    publisher
    teams
    writers
    year
  }
}`) as unknown as TypedDocumentString<LibraryBooksSceneQuery, LibraryBooksSceneQueryVariables>;
export const LibrarySeriesDocument = new TypedDocumentString(`
    query LibrarySeries($filter: SeriesFilterInput!, $orderBy: [SeriesOrderBy!]!, $pagination: Pagination!) {
  series(filter: $filter, orderBy: $orderBy, pagination: $pagination) {
    nodes {
      id
      resolvedName
      mediaCount
      percentageCompleted
      status
    }
    pageInfo {
      __typename
      ... on OffsetPaginationInfo {
        totalPages
        currentPage
        pageSize
        pageOffset
        zeroBased
      }
    }
  }
}
    `) as unknown as TypedDocumentString<LibrarySeriesQuery, LibrarySeriesQueryVariables>;
export const LibrarySeriesGridDocument = new TypedDocumentString(`
    query LibrarySeriesGrid($id: String!, $pagination: Pagination) {
  series(filter: {libraryId: {eq: $id}}, pagination: $pagination) {
    nodes {
      id
      thumbnail {
        url
      }
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        currentCursor
        nextCursor
        limit
      }
    }
  }
}
    `) as unknown as TypedDocumentString<LibrarySeriesGridQuery, LibrarySeriesGridQueryVariables>;
export const LibrarySettingsRouterEditLibraryMutationDocument = new TypedDocumentString(`
    mutation LibrarySettingsRouterEditLibraryMutation($id: ID!, $input: CreateOrUpdateLibraryInput!) {
  updateLibrary(id: $id, input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<LibrarySettingsRouterEditLibraryMutationMutation, LibrarySettingsRouterEditLibraryMutationMutationVariables>;
export const LibrarySettingsRouterScanLibraryMutationDocument = new TypedDocumentString(`
    mutation LibrarySettingsRouterScanLibraryMutation($id: ID!, $options: JSON) {
  scanLibrary(id: $id, options: $options)
}
    `) as unknown as TypedDocumentString<LibrarySettingsRouterScanLibraryMutationMutation, LibrarySettingsRouterScanLibraryMutationMutationVariables>;
export const LibraryExclusionsUsersQueryDocument = new TypedDocumentString(`
    query LibraryExclusionsUsersQuery {
  users(pagination: {none: {unpaginated: true}}) {
    nodes {
      id
      username
    }
  }
}
    `) as unknown as TypedDocumentString<LibraryExclusionsUsersQueryQuery, LibraryExclusionsUsersQueryQueryVariables>;
export const LibraryExclusionsQueryDocument = new TypedDocumentString(`
    query LibraryExclusionsQuery($id: ID!) {
  libraryById(id: $id) {
    excludedUsers {
      id
      username
    }
  }
}
    `) as unknown as TypedDocumentString<LibraryExclusionsQueryQuery, LibraryExclusionsQueryQueryVariables>;
export const UpdateLibraryExclusionsDocument = new TypedDocumentString(`
    mutation UpdateLibraryExclusions($id: ID!, $userIds: [String!]!) {
  updateLibraryExcludedUsers(id: $id, userIds: $userIds) {
    id
    excludedUsers {
      id
      username
    }
  }
}
    `) as unknown as TypedDocumentString<UpdateLibraryExclusionsMutation, UpdateLibraryExclusionsMutationVariables>;
export const CleanLibraryDocument = new TypedDocumentString(`
    mutation CleanLibrary($id: ID!) {
  cleanLibrary(id: $id) {
    deletedMediaCount
    deletedSeriesCount
    isEmpty
  }
}
    `) as unknown as TypedDocumentString<CleanLibraryMutation, CleanLibraryMutationVariables>;
export const AnalyzeLibraryMediaDocument = new TypedDocumentString(`
    mutation AnalyzeLibraryMedia($id: ID!) {
  analyzeMedia(id: $id)
}
    `) as unknown as TypedDocumentString<AnalyzeLibraryMediaMutation, AnalyzeLibraryMediaMutationVariables>;
export const ScanHistorySectionClearHistoryDocument = new TypedDocumentString(`
    mutation ScanHistorySectionClearHistory($id: ID!) {
  clearScanHistory(id: $id)
}
    `) as unknown as TypedDocumentString<ScanHistorySectionClearHistoryMutation, ScanHistorySectionClearHistoryMutationVariables>;
export const ScanHistoryTableDocument = new TypedDocumentString(`
    query ScanHistoryTable($id: ID!) {
  libraryById(id: $id) {
    id
    scanHistory {
      id
      jobId
      timestamp
      options
    }
  }
}
    `) as unknown as TypedDocumentString<ScanHistoryTableQuery, ScanHistoryTableQueryVariables>;
export const ScanRecordInspectorJobsDocument = new TypedDocumentString(`
    query ScanRecordInspectorJobs($id: ID!, $loadLogs: Boolean!) {
  jobById(id: $id) {
    id
    outputData {
      __typename
      ... on LibraryScanOutput {
        totalFiles
        totalDirectories
        ignoredFiles
        skippedFiles
        ignoredDirectories
        createdMedia
        updatedMedia
        createdSeries
        updatedSeries
      }
    }
    logs @include(if: $loadLogs) {
      id
    }
  }
}
    `) as unknown as TypedDocumentString<ScanRecordInspectorJobsQuery, ScanRecordInspectorJobsQueryVariables>;
export const DeleteLibraryThumbnailsDocument = new TypedDocumentString(`
    mutation DeleteLibraryThumbnails($id: ID!) {
  deleteLibraryThumbnails(id: $id)
}
    `) as unknown as TypedDocumentString<DeleteLibraryThumbnailsMutation, DeleteLibraryThumbnailsMutationVariables>;
export const LibraryThumbnailSelectorUpdateDocument = new TypedDocumentString(`
    mutation LibraryThumbnailSelectorUpdate($id: ID!, $input: UpdateThumbnailInput!) {
  updateLibraryThumbnail(id: $id, input: $input) {
    id
    thumbnail {
      url
    }
  }
}
    `) as unknown as TypedDocumentString<LibraryThumbnailSelectorUpdateMutation, LibraryThumbnailSelectorUpdateMutationVariables>;
export const LibraryThumbnailSelectorUploadDocument = new TypedDocumentString(`
    mutation LibraryThumbnailSelectorUpload($id: ID!, $file: Upload!) {
  uploadLibraryThumbnail(id: $id, file: $file) {
    id
    thumbnail {
      url
    }
  }
}
    `) as unknown as TypedDocumentString<LibraryThumbnailSelectorUploadMutation, LibraryThumbnailSelectorUploadMutationVariables>;
export const RegenerateThumbnailsDocument = new TypedDocumentString(`
    mutation RegenerateThumbnails($id: ID!, $forceRegenerate: Boolean!) {
  generateLibraryThumbnails(id: $id, forceRegenerate: $forceRegenerate)
}
    `) as unknown as TypedDocumentString<RegenerateThumbnailsMutation, RegenerateThumbnailsMutationVariables>;
export const SeriesLayoutDocument = new TypedDocumentString(`
    query SeriesLayout($id: ID!) {
  seriesById(id: $id) {
    id
    path
    library {
      id
      name
    }
    resolvedName
    resolvedDescription
    tags {
      id
      name
    }
  }
}
    `) as unknown as TypedDocumentString<SeriesLayoutQuery, SeriesLayoutQueryVariables>;
export const SeriesLibrayLinkDocument = new TypedDocumentString(`
    query SeriesLibrayLink($id: ID!) {
  libraryById(id: $id) {
    id
    name
  }
}
    `) as unknown as TypedDocumentString<SeriesLibrayLinkQuery, SeriesLibrayLinkQueryVariables>;
export const SeriesBooksSceneDocument = new TypedDocumentString(`
    query SeriesBooksScene($filter: MediaFilterInput!, $orderBy: [MediaOrderBy!]!, $pagination: Pagination!) {
  media(filter: $filter, orderBy: $orderBy, pagination: $pagination) {
    nodes {
      id
      ...BookCard
      ...BookMetadata
    }
    pageInfo {
      __typename
      ... on OffsetPaginationInfo {
        currentPage
        totalPages
        pageSize
        pageOffset
        zeroBased
      }
    }
  }
}
    fragment BookCard on Media {
  id
  resolvedName
  extension
  pages
  size
  status
  thumbnail {
    url
  }
  readProgress {
    percentageCompleted
    epubcfi
    page
    updatedAt
  }
  readHistory {
    __typename
    completedAt
  }
}
fragment BookMetadata on Media {
  metadata {
    ageRating
    characters
    colorists
    coverArtists
    editors
    genres
    inkers
    letterers
    links
    pencillers
    publisher
    teams
    writers
    year
  }
}`) as unknown as TypedDocumentString<SeriesBooksSceneQuery, SeriesBooksSceneQueryVariables>;
export const SeriesBookGridDocument = new TypedDocumentString(`
    query SeriesBookGrid($id: String!, $pagination: Pagination) {
  media(filter: {seriesId: {eq: $id}}, pagination: $pagination) {
    nodes {
      id
      thumbnail {
        url
      }
      pages
    }
    pageInfo {
      __typename
      ... on CursorPaginationInfo {
        currentCursor
        nextCursor
        limit
      }
    }
  }
}
    `) as unknown as TypedDocumentString<SeriesBookGridQuery, SeriesBookGridQueryVariables>;
export const SeriesSettingsSceneDocument = new TypedDocumentString(`
    query SeriesSettingsScene($id: ID!) {
  seriesById(id: $id) {
    id
    ...SeriesThumbnailSelector
    metadata {
      ...SeriesMetadataEditor
    }
  }
}
    fragment SeriesMetadataEditor on SeriesMetadata {
  ageRating
  booktype
  characters
  comicid
  genres
  imprint
  links
  metaType
  publisher
  status
  summary
  title
  volume
  writers
}
fragment SeriesThumbnailSelector on Series {
  id
  thumbnail {
    url
  }
}`) as unknown as TypedDocumentString<SeriesSettingsSceneQuery, SeriesSettingsSceneQueryVariables>;
export const SeriesSettingsSceneAnalyzeDocument = new TypedDocumentString(`
    mutation SeriesSettingsSceneAnalyze($id: ID!) {
  analyzeSeries(id: $id)
}
    `) as unknown as TypedDocumentString<SeriesSettingsSceneAnalyzeMutation, SeriesSettingsSceneAnalyzeMutationVariables>;
export const SeriesSettingsSceneResetMetadataDocument = new TypedDocumentString(`
    mutation SeriesSettingsSceneResetMetadata($id: ID!, $impact: MetadataResetImpact!) {
  resetSeriesMetadata(id: $id, impact: $impact) {
    id
  }
}
    `) as unknown as TypedDocumentString<SeriesSettingsSceneResetMetadataMutation, SeriesSettingsSceneResetMetadataMutationVariables>;
export const SeriesThumbnailSelectorUpdateDocument = new TypedDocumentString(`
    mutation SeriesThumbnailSelectorUpdate($id: ID!, $input: UpdateThumbnailInput!) {
  updateSeriesThumbnail(id: $id, input: $input) {
    id
    thumbnail {
      url
    }
  }
}
    `) as unknown as TypedDocumentString<SeriesThumbnailSelectorUpdateMutation, SeriesThumbnailSelectorUpdateMutationVariables>;
export const SeriesThumbnailSelectorUploadDocument = new TypedDocumentString(`
    mutation SeriesThumbnailSelectorUpload($id: ID!, $file: Upload!) {
  uploadSeriesThumbnail(id: $id, file: $file) {
    id
    thumbnail {
      url
    }
  }
}
    `) as unknown as TypedDocumentString<SeriesThumbnailSelectorUploadMutation, SeriesThumbnailSelectorUploadMutationVariables>;
export const ApiKeyTableDocument = new TypedDocumentString(`
    query APIKeyTable {
  apiKeys {
    id
    name
    permissions {
      __typename
      ... on UserPermissionStruct {
        value
      }
    }
    lastUsedAt
    expiresAt
    createdAt
  }
}
    `) as unknown as TypedDocumentString<ApiKeyTableQuery, ApiKeyTableQueryVariables>;
export const CreateApiKeyModalDocument = new TypedDocumentString(`
    mutation CreateAPIKeyModal($input: ApikeyInput!) {
  createApiKey(input: $input) {
    apiKey {
      id
    }
    secret
  }
}
    `) as unknown as TypedDocumentString<CreateApiKeyModalMutation, CreateApiKeyModalMutationVariables>;
export const DeleteApiKeyConfirmModalDocument = new TypedDocumentString(`
    mutation DeleteAPIKeyConfirmModal($id: Int!) {
  deleteApiKey(id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<DeleteApiKeyConfirmModalMutation, DeleteApiKeyConfirmModalMutationVariables>;
export const UpdateUserLocaleSelectorDocument = new TypedDocumentString(`
    mutation UpdateUserLocaleSelector($input: UpdateUserPreferencesInput!) {
  updateViewerPreferences(input: $input) {
    locale
  }
}
    `) as unknown as TypedDocumentString<UpdateUserLocaleSelectorMutation, UpdateUserLocaleSelectorMutationVariables>;
export const UpdateUserProfileFormDocument = new TypedDocumentString(`
    mutation UpdateUserProfileForm($input: UpdateUserInput!) {
  updateViewer(input: $input) {
    id
    username
    avatarUrl
  }
}
    `) as unknown as TypedDocumentString<UpdateUserProfileFormMutation, UpdateUserProfileFormMutationVariables>;
export const NavigationArrangementDocument = new TypedDocumentString(`
    query NavigationArrangement {
  me {
    preferences {
      navigationArrangement {
        locked
        sections {
          __typename
          config {
            __typename
            ... on SystemArrangementConfig {
              variant
              links
            }
          }
          visible
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<NavigationArrangementQuery, NavigationArrangementQueryVariables>;
export const NavigationArrangementUpdateDocument = new TypedDocumentString(`
    mutation NavigationArrangementUpdate($input: NavigationArrangementInput!) {
  updateNavigationArrangement(input: $input) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<NavigationArrangementUpdateMutation, NavigationArrangementUpdateMutationVariables>;
export const NavigationArrangementUpdateLockStatusDocument = new TypedDocumentString(`
    mutation NavigationArrangementUpdateLockStatus($locked: Boolean!) {
  updateNavigationArrangementLock(locked: $locked) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<NavigationArrangementUpdateLockStatusMutation, NavigationArrangementUpdateLockStatusMutationVariables>;
export const CreateEmailerSceneEmailersDocument = new TypedDocumentString(`
    query CreateEmailerSceneEmailers {
  emailers {
    name
  }
}
    `) as unknown as TypedDocumentString<CreateEmailerSceneEmailersQuery, CreateEmailerSceneEmailersQueryVariables>;
export const CreateEmailerSceneCreateEmailerDocument = new TypedDocumentString(`
    mutation CreateEmailerSceneCreateEmailer($input: EmailerInput!) {
  createEmailer(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<CreateEmailerSceneCreateEmailerMutation, CreateEmailerSceneCreateEmailerMutationVariables>;
export const EditEmailerSceneDocument = new TypedDocumentString(`
    query EditEmailerScene($id: Int!) {
  emailers {
    name
  }
  emailerById(id: $id) {
    id
    name
    isPrimary
    smtpHost
    smtpPort
    lastUsedAt
    maxAttachmentSizeBytes
    senderDisplayName
    senderEmail
    tlsEnabled
    username
  }
}
    `) as unknown as TypedDocumentString<EditEmailerSceneQuery, EditEmailerSceneQueryVariables>;
export const EditEmailerSceneEditEmailerDocument = new TypedDocumentString(`
    mutation EditEmailerSceneEditEmailer($id: Int!, $input: EmailerInput!) {
  updateEmailer(id: $id, input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<EditEmailerSceneEditEmailerMutation, EditEmailerSceneEditEmailerMutationVariables>;
export const CreateOrUpdateDeviceModalCreateEmailDeviceDocument = new TypedDocumentString(`
    mutation CreateOrUpdateDeviceModalCreateEmailDevice($input: EmailDeviceInput!) {
  createEmailDevice(input: $input) {
    id
    name
  }
}
    `) as unknown as TypedDocumentString<CreateOrUpdateDeviceModalCreateEmailDeviceMutation, CreateOrUpdateDeviceModalCreateEmailDeviceMutationVariables>;
export const CreateOrUpdateDeviceModalUpdateEmailDeviceDocument = new TypedDocumentString(`
    mutation CreateOrUpdateDeviceModalUpdateEmailDevice($id: Int!, $input: EmailDeviceInput!) {
  updateEmailDevice(id: $id, input: $input) {
    id
    name
    forbidden
  }
}
    `) as unknown as TypedDocumentString<CreateOrUpdateDeviceModalUpdateEmailDeviceMutation, CreateOrUpdateDeviceModalUpdateEmailDeviceMutationVariables>;
export const DeleteDeviceConfirmationDeleteEmailDeviceDocument = new TypedDocumentString(`
    mutation DeleteDeviceConfirmationDeleteEmailDevice($id: Int!) {
  deleteEmailDevice(id: $id) {
    id
  }
}
    `) as unknown as TypedDocumentString<DeleteDeviceConfirmationDeleteEmailDeviceMutation, DeleteDeviceConfirmationDeleteEmailDeviceMutationVariables>;
export const EmailDevicesTableDocument = new TypedDocumentString(`
    query EmailDevicesTable {
  emailDevices {
    id
    name
    email
    forbidden
  }
}
    `) as unknown as TypedDocumentString<EmailDevicesTableQuery, EmailDevicesTableQueryVariables>;
export const EmailerSendHistoryDocument = new TypedDocumentString(`
    query EmailerSendHistory($id: Int!, $fetchUser: Boolean!) {
  emailerById(id: $id) {
    sendHistory {
      sentAt
      recipientEmail
      sentByUserId
      sentBy @include(if: $fetchUser) {
        id
        username
      }
      attachmentMeta {
        filename
        mediaId
        media {
          resolvedName
        }
        size
      }
    }
  }
}
    `) as unknown as TypedDocumentString<EmailerSendHistoryQuery, EmailerSendHistoryQueryVariables>;
export const EmailersListDocument = new TypedDocumentString(`
    query EmailersList {
  emailers {
    id
    ...EmailerListItem
  }
}
    fragment EmailerListItem on Emailer {
  id
  name
  isPrimary
  smtpHost
  smtpPort
  lastUsedAt
  maxAttachmentSizeBytes
  senderDisplayName
  senderEmail
  tlsEnabled
  username
}`) as unknown as TypedDocumentString<EmailersListQuery, EmailersListQueryVariables>;
export const DeleteJobHistoryConfirmationDocument = new TypedDocumentString(`
    mutation DeleteJobHistoryConfirmation {
  deleteJobHistory {
    affectedRows
  }
}
    `) as unknown as TypedDocumentString<DeleteJobHistoryConfirmationMutation, DeleteJobHistoryConfirmationMutationVariables>;
export const JobActionMenuCancelJobDocument = new TypedDocumentString(`
    mutation JobActionMenuCancelJob($id: ID!) {
  cancelJob(id: $id)
}
    `) as unknown as TypedDocumentString<JobActionMenuCancelJobMutation, JobActionMenuCancelJobMutationVariables>;
export const JobActionMenuDeleteJobDocument = new TypedDocumentString(`
    mutation JobActionMenuDeleteJob($id: ID!) {
  cancelJob(id: $id)
}
    `) as unknown as TypedDocumentString<JobActionMenuDeleteJobMutation, JobActionMenuDeleteJobMutationVariables>;
export const JobActionMenuDeleteLogsDocument = new TypedDocumentString(`
    mutation JobActionMenuDeleteLogs($id: ID!) {
  deleteJobLogs(id: $id) {
    affectedRows
  }
}
    `) as unknown as TypedDocumentString<JobActionMenuDeleteLogsMutation, JobActionMenuDeleteLogsMutationVariables>;
export const JobSchedulerConfigDocument = new TypedDocumentString(`
    query JobSchedulerConfig {
  libraries(pagination: {none: {unpaginated: true}}) {
    nodes {
      id
      name
      emoji
    }
  }
  scheduledJobConfigs {
    id
    intervalSecs
    scanConfigs {
      id
      name
    }
  }
}
    `) as unknown as TypedDocumentString<JobSchedulerConfigQuery, JobSchedulerConfigQueryVariables>;
export const JobSchedulerUpdateDocument = new TypedDocumentString(`
    mutation JobSchedulerUpdate($id: Int!, $input: ScheduledJobConfigInput!) {
  updateScheduledJobConfig(id: $id, input: $input) {
    id
    intervalSecs
    scanConfigs {
      id
      name
    }
  }
}
    `) as unknown as TypedDocumentString<JobSchedulerUpdateMutation, JobSchedulerUpdateMutationVariables>;
export const JobSchedulerDeleteDocument = new TypedDocumentString(`
    mutation JobSchedulerDelete($id: Int!) {
  deleteScheduledJobConfig(id: $id)
}
    `) as unknown as TypedDocumentString<JobSchedulerDeleteMutation, JobSchedulerDeleteMutationVariables>;
export const JobSchedulerCreateDocument = new TypedDocumentString(`
    mutation JobSchedulerCreate($input: ScheduledJobConfigInput!) {
  createScheduledJobConfig(input: $input) {
    id
    intervalSecs
    scanConfigs {
      id
      name
    }
  }
}
    `) as unknown as TypedDocumentString<JobSchedulerCreateMutation, JobSchedulerCreateMutationVariables>;
export const JobTableDocument = new TypedDocumentString(`
    query JobTable($pagination: Pagination!) {
  jobs(pagination: $pagination) {
    nodes {
      id
      name
      description
      status
      createdAt
      completedAt
      msElapsed
      outputData {
        ...JobDataInspector
      }
      logCount
    }
    pageInfo {
      __typename
      ... on OffsetPaginationInfo {
        currentPage
        totalPages
        pageSize
        pageOffset
        zeroBased
      }
    }
  }
}
    fragment JobDataInspector on CoreJobOutput {
  __typename
  ... on LibraryScanOutput {
    totalFiles
    totalDirectories
    ignoredFiles
    skippedFiles
    ignoredDirectories
    createdMedia
    updatedMedia
    createdSeries
    updatedSeries
  }
  ... on SeriesScanOutput {
    totalFiles
    ignoredFiles
    skippedFiles
    createdMedia
    updatedMedia
  }
  ... on ThumbnailGenerationOutput {
    visitedFiles
    skippedFiles
    generatedThumbnails
    removedThumbnails
  }
  ... on ExternalJobOutput {
    val
  }
}`) as unknown as TypedDocumentString<JobTableQuery, JobTableQueryVariables>;
export const LiveLogsFeedDocument = new TypedDocumentString(`
    subscription LiveLogsFeed {
  tailLogFile
}
    `) as unknown as TypedDocumentString<LiveLogsFeedSubscription, LiveLogsFeedSubscriptionVariables>;
export const DeleteLogsDocument = new TypedDocumentString(`
    mutation DeleteLogs {
  deleteLogs {
    deleted
  }
}
    `) as unknown as TypedDocumentString<DeleteLogsMutation, DeleteLogsMutationVariables>;
export const PersistedLogsDocument = new TypedDocumentString(`
    query PersistedLogs($filter: LogFilterInput!, $pagination: Pagination!, $orderBy: [LogModelOrderBy!]!) {
  logs(filter: $filter, pagination: $pagination, orderBy: $orderBy) {
    nodes {
      id
      timestamp
      level
      message
      jobId
      context
    }
    pageInfo {
      __typename
      ... on OffsetPaginationInfo {
        totalPages
        currentPage
        pageSize
        pageOffset
        pageOffset
        zeroBased
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PersistedLogsQuery, PersistedLogsQueryVariables>;
export const CreateOrUpdateUserFormUpdateUserDocument = new TypedDocumentString(`
    mutation CreateOrUpdateUserFormUpdateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    username
    ageRestriction {
      age
      restrictOnUnset
    }
    permissions
    maxSessionsAllowed
  }
}
    `) as unknown as TypedDocumentString<CreateOrUpdateUserFormUpdateUserMutation, CreateOrUpdateUserFormUpdateUserMutationVariables>;
export const CreateOrUpdateUserFormCreateUserDocument = new TypedDocumentString(`
    mutation CreateOrUpdateUserFormCreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<CreateOrUpdateUserFormCreateUserMutation, CreateOrUpdateUserFormCreateUserMutationVariables>;
export const CreateUserSceneDocument = new TypedDocumentString(`
    query CreateUserScene {
  users(pagination: {none: {unpaginated: true}}) {
    nodes {
      username
    }
  }
}
    `) as unknown as TypedDocumentString<CreateUserSceneQuery, CreateUserSceneQueryVariables>;
export const UpdateUserSceneDocument = new TypedDocumentString(`
    query UpdateUserScene($id: ID!, $skip: Boolean!) {
  me {
    id
  }
  userById(id: $id) @skip(if: $skip) {
    id
    avatarUrl
    username
    ageRestriction {
      age
      restrictOnUnset
    }
    permissions
    maxSessionsAllowed
    isServerOwner
  }
  users(pagination: {none: {unpaginated: true}}) @skip(if: $skip) {
    nodes {
      username
    }
  }
}
    `) as unknown as TypedDocumentString<UpdateUserSceneQuery, UpdateUserSceneQueryVariables>;
export const ClearLoginActivityConfirmationDocument = new TypedDocumentString(`
    mutation ClearLoginActivityConfirmation {
  deleteLoginActivity
}
    `) as unknown as TypedDocumentString<ClearLoginActivityConfirmationMutation, ClearLoginActivityConfirmationMutationVariables>;
export const LoginActivityTableDocument = new TypedDocumentString(`
    query LoginActivityTable {
  loginActivity {
    id
    ipAddress
    userAgent
    authenticationSuccessful
    timestamp
    user {
      id
      username
      avatarUrl
    }
  }
}
    `) as unknown as TypedDocumentString<LoginActivityTableQuery, LoginActivityTableQueryVariables>;
export const DeleteUserDocument = new TypedDocumentString(`
    mutation DeleteUser($id: ID!, $hardDelete: Boolean) {
  deleteUser(id: $id, hardDelete: $hardDelete) {
    id
  }
}
    `) as unknown as TypedDocumentString<DeleteUserMutation, DeleteUserMutationVariables>;
export const UserActionMenuLockUserDocument = new TypedDocumentString(`
    mutation UserActionMenuLockUser($id: ID!, $lock: Boolean!) {
  updateUserLockStatus(id: $id, lock: $lock) {
    id
    isLocked
  }
}
    `) as unknown as TypedDocumentString<UserActionMenuLockUserMutation, UserActionMenuLockUserMutationVariables>;
export const UserActionMenuDeleteUserSessionsDocument = new TypedDocumentString(`
    mutation UserActionMenuDeleteUserSessions($id: ID!) {
  deleteUserSessions(id: $id)
}
    `) as unknown as TypedDocumentString<UserActionMenuDeleteUserSessionsMutation, UserActionMenuDeleteUserSessionsMutationVariables>;
export const UserTableDocument = new TypedDocumentString(`
    query UserTable($pagination: Pagination!) {
  users(pagination: $pagination) {
    nodes {
      id
      avatarUrl
      username
      isServerOwner
      isLocked
      createdAt
      lastLogin
      loginSessionsCount
    }
    pageInfo {
      __typename
      ... on OffsetPaginationInfo {
        totalPages
        currentPage
        pageSize
        pageOffset
        zeroBased
      }
    }
  }
}
    `) as unknown as TypedDocumentString<UserTableQuery, UserTableQueryVariables>;
export const CreateSmartListViewDocument = new TypedDocumentString(`
    mutation CreateSmartListView($input: SaveSmartListView!) {
  createSmartListView(input: $input) {
    id
    listId
    name
    bookColumns {
      id
      position
    }
    bookSorting {
      id
      desc
    }
    groupColumns {
      id
      position
    }
    groupSorting {
      id
      desc
    }
  }
}
    `) as unknown as TypedDocumentString<CreateSmartListViewMutation, CreateSmartListViewMutationVariables>;
export const UpdateSmartListViewDocument = new TypedDocumentString(`
    mutation UpdateSmartListView($originalName: String!, $input: SaveSmartListView!) {
  updateSmartListView(originalName: $originalName, input: $input) {
    id
    listId
    name
    bookColumns {
      id
      position
    }
    bookSorting {
      id
      desc
    }
    groupColumns {
      id
      position
    }
    groupSorting {
      id
      desc
    }
  }
}
    `) as unknown as TypedDocumentString<UpdateSmartListViewMutation, UpdateSmartListViewMutationVariables>;
export const SmartListsWithSearchDocument = new TypedDocumentString(`
    query SmartListsWithSearch($input: SmartListsInput!) {
  smartLists(input: $input) {
    id
    creatorId
    description
    defaultGrouping
    filters
    joiner
    name
    visibility
  }
}
    `) as unknown as TypedDocumentString<SmartListsWithSearchQuery, SmartListsWithSearchQueryVariables>;
export const SmartListByIdDocument = new TypedDocumentString(`
    query SmartListById($id: ID!) {
  smartListById(id: $id) {
    id
    creatorId
    description
    defaultGrouping
    filters
    joiner
    name
    visibility
    views {
      id
      listId
      name
      bookColumns {
        id
        position
      }
      bookSorting {
        id
        desc
      }
      groupColumns {
        id
        position
      }
      groupSorting {
        id
        desc
      }
    }
  }
}
    `) as unknown as TypedDocumentString<SmartListByIdQuery, SmartListByIdQueryVariables>;
export const SmartListMetaDocument = new TypedDocumentString(`
    query SmartListMeta($id: ID!) {
  smartListMeta(id: $id) {
    matchedBooks
    matchedSeries
    matchedLibraries
  }
}
    `) as unknown as TypedDocumentString<SmartListMetaQuery, SmartListMetaQueryVariables>;
export const UpdateSmartListDocument = new TypedDocumentString(`
    mutation UpdateSmartList($id: ID!, $input: SaveSmartListInput!) {
  updateSmartList(id: $id, input: $input) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<UpdateSmartListMutation, UpdateSmartListMutationVariables>;
export const SmartListItemsDocument = new TypedDocumentString(`
    query SmartListItems($id: ID!) {
  smartListItems(id: $id) {
    __typename
    ... on SmartListGrouped {
      items {
        entity {
          __typename
          ... on Series {
            id
            name
          }
          ... on Library {
            id
            name
          }
        }
        books {
          ...BookCard
          ...BookMetadata
        }
      }
    }
    ... on SmartListUngrouped {
      books {
        ...BookCard
        ...BookMetadata
      }
    }
  }
}
    fragment BookCard on Media {
  id
  resolvedName
  extension
  pages
  size
  status
  thumbnail {
    url
  }
  readProgress {
    percentageCompleted
    epubcfi
    page
    updatedAt
  }
  readHistory {
    __typename
    completedAt
  }
}
fragment BookMetadata on Media {
  metadata {
    ageRating
    characters
    colorists
    coverArtists
    editors
    genres
    inkers
    letterers
    links
    pencillers
    publisher
    teams
    writers
    year
  }
}`) as unknown as TypedDocumentString<SmartListItemsQuery, SmartListItemsQueryVariables>;
export const SmartListBasicSettingsSceneDocument = new TypedDocumentString(`
    query SmartListBasicSettingsScene {
  smartLists(input: {mine: true}) {
    name
  }
}
    `) as unknown as TypedDocumentString<SmartListBasicSettingsSceneQuery, SmartListBasicSettingsSceneQueryVariables>;
export const DeleteSmartListDocument = new TypedDocumentString(`
    mutation DeleteSmartList($id: ID!) {
  deleteSmartList(id: $id) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<DeleteSmartListMutation, DeleteSmartListMutationVariables>;
export const DirectoryListingDocument = new TypedDocumentString(`
    query DirectoryListing($input: DirectoryListingInput!, $pagination: Pagination!) {
  listDirectory(input: $input, pagination: $pagination) {
    nodes {
      parent
      files {
        name
        path
        isDirectory
      }
    }
    pageInfo {
      __typename
      ... on OffsetPaginationInfo {
        currentPage
        totalPages
        pageSize
        pageOffset
        zeroBased
      }
    }
  }
}
    `) as unknown as TypedDocumentString<DirectoryListingQuery, DirectoryListingQueryVariables>;
export const UploadConfigDocument = new TypedDocumentString(`
    query UploadConfig {
  uploadConfig {
    enabled
    maxFileUploadSize
  }
}
    `) as unknown as TypedDocumentString<UploadConfigQuery, UploadConfigQueryVariables>;