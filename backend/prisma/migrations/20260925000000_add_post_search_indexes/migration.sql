CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Post_title_trgm_idx"
  ON "Post" USING GIN ("title" gin_trgm_ops);

CREATE INDEX "Post_excerpt_trgm_idx"
  ON "Post" USING GIN ("excerpt" gin_trgm_ops);

CREATE INDEX "Post_content_trgm_idx"
  ON "Post" USING GIN ("content" gin_trgm_ops);
