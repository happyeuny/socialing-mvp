-- 상태·유형 enum (architecture 3.1, AGENTS.md 용어 표)

create type public.profile_role as enum ('member', 'host', 'admin');

create type public.venue_type as enum ('branch', 'external');

create type public.join_type as enum ('first_come', 'approval');

create type public.socialing_status as enum ('recruiting', 'confirmed', 'completed', 'canceled');

create type public.application_status as enum ('pending', 'accepted', 'rejected', 'canceled');
