use crate::prisma::{media, media_metadata};

media_metadata::select!(metadata_available_genre_select { genre });
media_metadata::select!(metadata_available_writers_select { writers });
media_metadata::select!(metadata_available_pencillers_select { pencillers });
media_metadata::select!(metadata_available_inkers_select { inkers });
media_metadata::select!(metadata_available_colorists_select { colorists });
media_metadata::select!(metadata_available_letterers_select { letterers });
media_metadata::select!(metadata_available_editors_select { editors });
media_metadata::select!(metadata_available_publisher_select { publisher });
media_metadata::select!(metadata_available_characters_select { characters });
media_metadata::select!(metadata_available_teams_select { teams });
