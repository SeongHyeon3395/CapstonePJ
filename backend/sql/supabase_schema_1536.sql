create extension if not exists vector;

create table if not exists public.articles (
  id uuid primary key,
  keyword text not null,
  title text not null,
  content text not null,
  url text not null,
  source text,
  stance text not null check (stance in ('찬성','반대','중립','분류불가')),
  similarity_score int not null check (similarity_score >= 0 and similarity_score <= 100),
  evidence text,
  aggro_reason text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_articles_keyword on public.articles(keyword);
create unique index if not exists idx_articles_url on public.articles(url);

create table if not exists public.article_embeddings (
  id uuid primary key,
  article_id uuid not null references public.articles(id) on delete cascade,
  chunk text not null,
  embedding vector(1536) not null
);

create index if not exists idx_article_embeddings_article_id on public.article_embeddings(article_id);
