create table if not exists public.app_users (
  id uuid primary key,
  university text not null,
  department text not null,
  name text not null,
  student_number text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_app_users_identity
  on public.app_users (university, name, student_number);

create table if not exists public.user_analysis_records (
  id uuid primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  keyword text not null,
  title text not null,
  content text not null,
  url text not null,
  source text not null,
  stance text not null check (stance in ('찬성','반대','중립','분류불가')),
  similarity_score int not null check (similarity_score >= 0 and similarity_score <= 100),
  evidence text not null,
  summary text not null,
  input_type text not null check (input_type in ('url','content')),
  input_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_analysis_records_user_created
  on public.user_analysis_records (user_id, created_at desc);

create index if not exists idx_user_analysis_records_keyword
  on public.user_analysis_records (keyword);
