// TODO: writing out the tests i want first knowing i have to build out some fixtures
// and supporting code first:
//
// 1. a user with no access to a library should not see the library in the ui
// 2. a user with access to a library should see the library in the ui
// 3. a user that has access revoked should immediately lose access to library
//    ^ kinda more in the category of management section i outline below
// 4. direct urls should not work for a user without access to a library, e.g. if i snag a url of a specific book or reader etc
// 5. an admin is not exempt from access control, e.g. MANAGE_SERVER still adheres to library_access
//
// i think there is an argument to be made that more management ops can be in a separate spec? idk, organization
// aside i would want to test:
//
// 1. a user with management access can see the access records (who does/does not have access)
//    ^ if also have user read perms ofc
// 2. a user without ^ cannot
// 3. a user with management access cannot affect their own access
// 4. ensure that selections are a full replacement, e.g. if two users are selected with diff
//    access then they both get assigned whichever i choose (no access or access)
