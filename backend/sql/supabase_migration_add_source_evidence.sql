alter table if exists public.articles add column if not exists source text;
alter table if exists public.articles add column if not exists evidence text;

update public.articles
set evidence = coalesce(evidence, aggro_reason)
where evidence is null;
