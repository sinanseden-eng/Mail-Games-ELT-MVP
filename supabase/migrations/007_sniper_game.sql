-- Mail Games ELT 0.9A — add the third game type.
-- Safe to run on an existing 0.8e1 database.

alter table public.matches
  drop constraint if exists matches_game_type_check;

alter table public.matches
  add constraint matches_game_type_check
  check (game_type in ('penalty', 'turkey', 'sniper'));
