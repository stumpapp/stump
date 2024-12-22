use crate::prisma::{active_reading_session, finished_reading_session, media};

media::select!(media_id_select { id });

media::select!(media_path_select { path });

media::select!(media_path_modified_at_select {
   id
   path
   modified_at
   status
});

media::select!(media_thumbnail {
   id
   path
   series: select {
	  library: select {
		config
	  }
   }
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

active_reading_session::include!(reading_session_koreader { device });

finished_reading_session::include!(finished_session_koreader { device });
