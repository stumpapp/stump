// TODO: move existing reading progress mutations here

// TODO(reading-journal): some brainstorms:
// i know in the feat req it was also mentioned potentially replacing reading_session/finished_reading_session
// tables. which means for journals we can:
//
// 1. keep all the existing shit, add reading_journal_entries, bunch o' duplicate stuff
// 2. replace existing systems with a unified reading_journal_entries approach
//
// i'll mention a few things i like about it remaining separate:
// - easy to mutate active progress when treating a single record as a living cursor
// - easy enough to conceptualize flow (active session but when done -> finished session. start again -> new session, etc)
//
// if it were split, i am thinking sm like:
//
// fn update_reading_progress(ctx, book_id, input):
//      user_prefs = user_preferences::find(user.id = user.id)
//      grace_period = user_prefs.reading_session_grace_period_secs
//      logical_today = calculate_logical_date(now(), prefs.reading_session_reset_day_offset)
//
//      latest_session = reading_session::find(user_id = user.id, media_id = media_id).order_desc(updated_at)
//
//      match latest_session:
//          exists and should_extend_session(session, logical_today, grace_period):
//              # client sends elapsed_seconds_delta (time spent on location before change) -> server accumulates
//              # device does not matter, all go towards culminating time
//              session.elapsed_seconds += input.elapsed_seconds_delta.unwrap_or(0).max(0)
//
//              session.end_page = input.page
//              session.end_locator = input.locator
//              session.end_percentage = input.percentage
//              session.updated_at = now()
//
//              if input.is_completed:
//                  session.is_completed = true
//
//              # would need to handle device_id here too
//
//              update(session)
//
//          else:
//              # new logical day (or first ever session for this book).
//              # the delta from the client is the initial elapsed
//              create session with:
//                  session_date    = logical_today
//                  start_page      = input.page
//                  start_locator   = input.locator
//                  start_percentage = input.percentage
//                  elapsed_seconds = input.elapsed_seconds_delta.unwrap_or(0).max(0)
//                  is_completed    = input.is_completed
//                  device_ids      = [input.device_id] if input.device_id else []
//
//
// # this is a fucky one for me, i don't know how i want to collect the user timezone since i don't want to force
// # the server's clock. i've included it here, but noting to consider. maybe from client? browser should know, mobile
// # i am not sure just need to check how
// fn calculate_logical_date(tz, day_reset_hour_offset):
//      // can also use chrono_tz::UTC i think as fallback
//      local_now = now(tz)
//      local_time = local_now - hours(day_reset_hour_offset)
//      return local_time.date_naive()
//
// fn should_extend_session(session, logical_date, grace_period_secs):
//      if session.is_completed:
//          return false
//
//      if session.session_date != logical_date:
//          return false
//
//      # updated_at is null only on a brand-new insert that hasn't been touched yet
//      # treat that as 0 seconds since last update (i.e. always extend)
//      secs_since_last_update = match session.updated_at:
//          Some(t) => secs(now() - t)
//          None    => 0
//
//      return secs_since_last_update <= grace_period_secs

// oh also if we unify things, do we even both with an opt-in for journaling? maybe if folks are
// really against seeing references to it on the ui for whatever reason, but otherwise in this
// hypothetical world we are solidifying it as a core bit so can't opt out of that. don't have to
// wrote notes if you don't wanna

// more brainstorming after chats:
// - multiple sessions a day in order to support "read 10 pages on iPhone" then "read 20 pages on iPad" in some timeline view
//  - unbounded, no more keyed to e.g. (device_id, logical_day, book_id, user_id)
//  - prolly index on logical_day though for grouping, precise timestamps for ordering within and mixing with annotations
// - potentially break out notes as daily_journal_entry keyed to (user_id, media_id, logical_day)
//  - could also keep notes on a per-session basis but might be too many options to juggle. also, exiting the reader != session end,
//    so presenting it wouldn't even be clear or intuitive.
// - grace period to serve two purposes:
//     1. the session cutoff -> if you exceed that time without an update, you have to start a new session (even if same logical day)
//     2. logical day extender -> if you read past your reset hour but within that window, you're still on the previous logical day
// - grouping/merging as a ui thing only, not at data model level (it'll store timestamps and logical_date for easy grouping but not enforce it?)
//
// remaining questions in my mind:
// - daily_journal_entry as a separate model (one note per logical day) vs notes per session
//      - separate model enforces one per day, simpler ux for that kinda thing
//          - also makes "reminders" easier if a user opts into some kind of daily journal thing (e.g. "hey you made X progress yesterday but didn't write a note, wanna jot something down?")
//            at same time tho i don't see it as a notification necessarily but like an option in ellipsis menu or smth idk
//      - notes per session more flexible and reflective-focused which i like but ux is not clear to me yet (e.g. exit reader != done reading)
//
// data models
//
// reading_session (replace reading_session + finished_reading_session)
// - id
// - started_at / updated_at / etc
//
// - start_page / end_page
// - start_locator / end_locator -> (readium for epubs, null for paged)
// - start_percentage / end_percentage
// - elapsed_seconds -> (via deltas in inputs)
// - device_id
// - is_completed
// - readthrough_number
// - logical_day -> (via calculate_logical_date)
//
// - media_id / user_id
// - etc etc
//
// daily_journal_entry (TODO: keep this or allow notes per session instead?)
// - id
// - note
// - logical_day -> unique per (user_id, media_id, logical_day)
// - media_id / user_id
// - created_at / updated_at
//
// ^ notes are written after the fact so timestamps irrelevant, maybe present last date with progress but no
// journal entry? idk
// ^^ or, maybe just leave it unbounded? can have any number of entries per day? hm.
//
// reading_device
// - id
// - name
// - user_id -> unique per (user_id, name)
// - created_at / updated_at
//
// ^ realizing i already ahve registered_reading_devices, it isn't used so safe to do away with and rename etc
// i don't think user_id is as important coming back to this
//
// code flow:
//
// fn update_reading_progress(ctx, book_id, input):
//      user_prefs = user_preferences::find(user.id = user.id)
//      grace_period = user_prefs.reading_session_grace_period_secs
//      logical_today = calculate_logical_date(now(), prefs.reading_session_reset_day_offset)
//
//      latest_session = reading_session::find(user_id = user.id, media_id = media_id).order_desc(updated_at)
//
//      match latest_session:
//          exists and should_extend_session(session, grace_period, input.device_id):
//              session.elapsed_seconds += input.elapsed_seconds_delta.unwrap_or(0).max(0)
//              session.end_page       = input.page
//              session.end_locator    = input.locator
//              session.end_percentage = input.percentage
//              session.updated_at     = now()
//              # device_id intentionally not updated — session belongs to the device that created it
//
//              if input.is_completed:
//                  session.is_completed = true
//
//              update(session)
//
//          else:
//              # grace period elapsed, different device, or first session for this book
//              create session with:
//                  started_at       = now()
//                  logical_day      = logical_today
//                  start_page       = input.page
//                  start_locator    = input.locator
//                  start_percentage = input.percentage
//                  elapsed_seconds  = input.elapsed_seconds_delta.unwrap_or(0).max(0)
//                  is_completed     = input.is_completed
//                  device_id        = input.device_id
//                  # this one a little fuzzy, and honestly part of me doesn't think this is any easier
//                  # than just having a dedicated reading_history table to track this historical info
//                  # it mostly just makes displaying in a timeline slightly easier since one model to pull from
//                  # concretely tho in this world it'd just be MAX(reading_session.readthrough_number) + 1 for the user/book combo
//                  # which isn't terrible so im waffling about potentially nothing its fine its fine
//                  readthrough_number = derive_readthrough_number(user.id, media_id)
//
//
// fn should_extend_session(session, grace_period_secs, device_id):
//      if session.is_completed:
//          return false
//
//      # diff device = diff reading session imo but open to discussion
//      if session.device_id != device_id:
//          return false
//
//      secs_since_last_update = match session.updated_at:
//          Some(t) => secs(now() - t)
//          None    => 0
//
//      return secs_since_last_update <= grace_period_secs
//
// fn derive_readthrough_number(user_id, media_id):
//    latest = reading_session::find(user_id = user_id, media_id = media_id).order_desc(readthrough_number).first()
//    return match latest:
//      Some(s) => s.readthrough_number + 1
//      None    => 1
//
//
// none of this set in stone yet!
//
// note for self: would impact kobo sync! see MediaWithMetadataAndReadingSessions:
// - apply_reading_session_joins -> in the new world need to either subquery for the latest session
//   before joining or do a separate query. prolly the latter is cleaner?
// - finished_reading_session_count -> MAX(readthrough_number) WHERE is_completed = true
// - finished_reading_session_last_completed_at -> MAX(updated_at) WHERE is_completed = true
// - reading state logic is still basically the same but would need to update query to pull just latest session
// - times_started_reading -> MAX(readthrough_number)
//
// useBookTimer notes:
// - currently operates as totalSeconds, need to shift to delta for reporting to server but retain totalSeconds for display
// - bookTimers is currently Record<bookId, ElapsedSeconds> with no session awareness for determining deltas. not rly sure
//   best approach for this yet
// - will likely need a ref for last sync to compute delta tho
//
// offline compounding complexity:
// - i think single session is fine for offline, it cannot follow server rules for non-stump servers anyways
// - potential for staleness, e.g. read in am offline, read in pm offline, sync next day. what happens?
//      - (a) include e.g. reading_started_at in the push payload? so server uses that instead of now()
//      - (b) accept offline reading always just creates a new session on sync
//
// other thoughts:
// - read_progress resolver could potentially return an aggregate struct representing effectively the same as it does today?
//     - e.g. total_elapsed_seconds, last_page, last_locator, etc merged from all sessions for that user/book combo for the current readthrough
//     - keeps client change overhead smaller, ideal. can't get around delta stuff tho
// - read_history resolver could either return all finished sessions (per above) or if decided to keep them as separate historical model or w/e
// - reading_sessions resolvever would be new and return the granular shit for timeline views and whatnot, either grouping on ui or exposing
//   some knob for adding a group_by clause in query?
