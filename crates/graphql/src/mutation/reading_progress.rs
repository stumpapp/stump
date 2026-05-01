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
