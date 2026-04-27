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
//          exists and should_extend_session(session, locical_today):
//              # update session with pretty much same logic as today, but i guess elapsed_seconds would
//              # become a delta? since many session comprise a single read in this world... that feels tricky,
//              # more complex to maintain. if server maintains a delta, client would send.. what? i guess the total total,
//              # and we diff with last session to get it?
//
//              if input.is_completed:
//                 session.is_completed = true
//
//              update(session)
//
//          else:
//            # create new session with input
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
//      # maybe default to 0 if session.ended_at is null?
//      secs_since_last_update = secs(now() - session.updated_at)
//
//      if  secs_since_last_update <= grace_period_secs:
//          return true

// oh also if we unify things, do we even both with an opt-in for journaling? maybe if folks are
// really against seeing references to it on the ui for whatever reason, but otherwise in this
// hypothetical world we are solidifying it as a core bit so can't opt out of that. don't have to
// wrote notes if you don't wanna
