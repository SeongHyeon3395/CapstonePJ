# Spectrum Backend

## 1) Setup

1. Install dependencies
  - npm install
  - Readability crawler packages are included (`jsdom`, `@mozilla/readability`)
2. Create environment file
   - copy `.env.example` to `.env`
3. Fill required keys
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - OPENAI_API_KEY
   - NAVER_CLIENT_ID
   - NAVER_CLIENT_SECRET
  - OPENAI_EMBED_DIMENSIONS (small: 1536, large: 3072)

## 2) Run

- Development: npm run dev
- Build: npm run build
- Production: npm start

## 3) API

- GET /api/news?keyword=...
  - Alias of `/api/news/analyze` for quick testing.
- GET /api/news/analyze?keyword=...
  - Collects Naver news, crawls content, computes similarity score, labels stance, stores in Supabase, and returns analyzed articles.
- GET /api/news/stats?keyword=...
  - Reads stored articles, counts stance by exact count, and returns count-based percentages.
- POST /api/chat/ask
  - Body: { "article_id": "...", "question": "..." }
  - Answers strictly from article content.

## 4) Required Supabase schema

```sql
create extension if not exists vector;

create table if not exists public.articles (
  id uuid primary key,
  keyword text not null,
  title text not null,
  content text not null,
  url text not null,
  stance text not null check (stance in ('찬성','반대','중립','분류불가')),
  similarity_score int not null check (similarity_score >= 0 and similarity_score <= 100),
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
```

## 5) What You Need To Provide

- Naver Search API credentials: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`
- OpenAI API key: `OPENAI_API_KEY`
- Supabase project URL: `SUPABASE_URL`
- Supabase backend key: `SUPABASE_SERVICE_ROLE_KEY` (server only, never expose to mobile app)

## 6) Embedding Dimension Rule

- If `OPENAI_EMBED_MODEL=text-embedding-3-small`, use `OPENAI_EMBED_DIMENSIONS=1536` and `vector(1536)`.
- If `OPENAI_EMBED_MODEL=text-embedding-3-large`, use `OPENAI_EMBED_DIMENSIONS=3072` and `vector(3072)`.
- If model dimension and DB vector dimension differ, insert/update to `article_embeddings` fails.
