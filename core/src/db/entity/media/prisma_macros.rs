use crate::prisma::media;

media::select!(media_path_modified_at_select {
   path
   modified_at
});
