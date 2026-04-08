-- Speed up news list/stat queries for large article volumes.
create extension if not exists pg_trgm;

create index if not exists idx_articles_created_at
  on public.articles (created_at desc);

create index if not exists idx_articles_keyword_created_at
  on public.articles (keyword, created_at desc);

create index if not exists idx_articles_keyword_trgm
  on public.articles using gin (keyword gin_trgm_ops);

analyze public.articles;
