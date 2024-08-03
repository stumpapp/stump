use crate::prisma::{active_reading_session, finished_reading_session, media};

media::select!(media_path_select { path });

media::select!(media_path_modified_at_select {
   path
   modified_at
});

active_reading_session::include!(reading_session_with_book_pages {
	media: select { pages }
});

finished_reading_session::include!(finished_reading_session_with_book_pages {
	media: select { pages }
});

finished_reading_session::select!(finished_reading_session_series_complete {
   media_id
   completed_at
});
