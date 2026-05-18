-- ── Org Invites: pending invitations to join an org as contributor ─────────────

create table if not exists public.org_invites (
  id           uuid primary key default gen_random_uuid(),
  org_user_id  uuid not null references public.profiles(id) on delete cascade,
  email        text not null,
  token        text unique not null default encode(gen_random_bytes(32), 'hex'),
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at   timestamptz not null default now() + interval '7 days',
  created_at   timestamptz not null default now()
);

-- ── Org Members: accepted contributor memberships ──────────────────────────────

create table if not exists public.org_members (
  id             uuid primary key default gen_random_uuid(),
  org_user_id    uuid not null references public.profiles(id) on delete cascade,
  member_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique(org_user_id, member_user_id)
);

alter table public.org_invites enable row level security;
alter table public.org_members enable row level security;

create policy "Org admin manages invites"
  on public.org_invites for all
  using (auth.uid() = org_user_id);

create policy "Org admin and members can view membership"
  on public.org_members for select
  using (auth.uid() = org_user_id or auth.uid() = member_user_id);

create policy "Org admin manages members"
  on public.org_members for all
  using (auth.uid() = org_user_id);

-- ── Update RLS to include org members ─────────────────────────────────────────

drop policy if exists "Owners can manage their fundraisers" on public.fundraisers;
create policy "Owners and org members can manage fundraisers"
  on public.fundraisers for all
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.org_members
      where org_user_id = owner_id
        and member_user_id = auth.uid()
    )
  );

drop policy if exists "Fundraiser owners can manage prizes" on public.prizes;
create policy "Fundraiser owners and org members can manage prizes"
  on public.prizes for all
  using (
    exists (
      select 1 from public.fundraisers f
      where f.id = fundraiser_id
        and (
          f.owner_id = auth.uid()
          or exists (
            select 1 from public.org_members om
            where om.org_user_id = f.owner_id
              and om.member_user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Fundraiser owners can read all squares" on public.squares;
create policy "Fundraiser owners and org members can read all squares"
  on public.squares for select
  using (
    exists (
      select 1 from public.fundraisers f
      where f.id = fundraiser_id
        and (
          f.owner_id = auth.uid()
          or exists (
            select 1 from public.org_members om
            where om.org_user_id = f.owner_id
              and om.member_user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Owners can update squares on their fundraisers" on public.squares;
create policy "Owners and org members can update squares"
  on public.squares for update
  using (
    exists (
      select 1 from public.fundraisers f
      where f.id = fundraiser_id
        and (
          f.owner_id = auth.uid()
          or exists (
            select 1 from public.org_members om
            where om.org_user_id = f.owner_id
              and om.member_user_id = auth.uid()
          )
        )
    )
  );

-- Allow org members to trigger a draw
create or replace function public.record_draw(
  p_fundraiser_id     uuid,
  p_winner_square_num int
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_owner_id uuid;
begin
  select owner_id into v_owner_id from fundraisers where id = p_fundraiser_id;

  if v_owner_id != auth.uid() and not exists (
    select 1 from org_members
    where org_user_id = v_owner_id and member_user_id = auth.uid()
  ) then
    raise exception 'not authorised';
  end if;

  update fundraisers
    set status = 'drawn', winner_square_num = p_winner_square_num
    where id = p_fundraiser_id;
end;
$$;

-- ── RPCs ──────────────────────────────────────────────────────────────────────

-- Returns the current user's org role and org owner id (if contributor)
create or replace function public.get_my_org_info()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org_user_id uuid;
  v_org_name    text;
begin
  select om.org_user_id, p.organisation
  into   v_org_user_id, v_org_name
  from   org_members om
  join   profiles p on p.id = om.org_user_id
  where  om.member_user_id = auth.uid()
  limit  1;

  if found then
    return jsonb_build_object(
      'role',         'contributor',
      'org_user_id',  v_org_user_id,
      'org_name',     v_org_name
    );
  end if;

  return jsonb_build_object('role', 'admin', 'org_user_id', null);
end;
$$;

-- Invite a contributor by email (org plan only, max 3 contributors)
create or replace function public.invite_org_member(p_email text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_count  int;
  v_invite org_invites%rowtype;
begin
  if not exists (select 1 from profiles where id = auth.uid() and plan = 'org') then
    return jsonb_build_object('error', 'Organisation plan required to invite contributors');
  end if;

  select count(*) into v_count from org_members where org_user_id = auth.uid();
  if v_count >= 3 then
    return jsonb_build_object('error', 'You have reached the maximum of 3 contributors');
  end if;

  select count(*) into v_count
  from org_invites
  where org_user_id = auth.uid()
    and email = lower(p_email)
    and status = 'pending';
  if v_count > 0 then
    return jsonb_build_object('error', 'An invite is already pending for this email address');
  end if;

  if exists (
    select 1 from org_members om
    join auth.users u on u.id = om.member_user_id
    where om.org_user_id = auth.uid() and lower(u.email) = lower(p_email)
  ) then
    return jsonb_build_object('error', 'This person is already a contributor');
  end if;

  insert into org_invites (org_user_id, email)
  values (auth.uid(), lower(p_email))
  returning * into v_invite;

  return jsonb_build_object('ok', true, 'token', v_invite.token, 'invite_id', v_invite.id);
end;
$$;

-- Returns members and pending invites for the current user's org
create or replace function public.get_org_members()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object(
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',        om.id,
        'user_id',   om.member_user_id,
        'name',      p.full_name,
        'email',     u.email,
        'joined_at', om.created_at
      ) order by om.created_at)
      from org_members om
      join profiles p on p.id = om.member_user_id
      join auth.users u on u.id = om.member_user_id
      where om.org_user_id = auth.uid()
    ), '[]'::jsonb),
    'invites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',         oi.id,
        'email',      oi.email,
        'expires_at', oi.expires_at,
        'created_at', oi.created_at
      ) order by oi.created_at)
      from org_invites oi
      where oi.org_user_id = auth.uid()
        and oi.status = 'pending'
    ), '[]'::jsonb)
  );
end;
$$;

-- Revoke a contributor's access
create or replace function public.revoke_org_member(p_member_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  delete from org_members
  where org_user_id = auth.uid()
    and member_user_id = p_member_user_id;

  if not found then
    return jsonb_build_object('error', 'Member not found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- Cancel a pending invite
create or replace function public.revoke_org_invite(p_invite_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update org_invites
  set status = 'revoked'
  where id = p_invite_id
    and org_user_id = auth.uid()
    and status = 'pending';

  if not found then
    return jsonb_build_object('error', 'Invite not found or already used');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- Look up an invite by token (no auth required, used on the accept page)
create or replace function public.get_invite_by_token(p_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_invite   org_invites%rowtype;
  v_org_name text;
begin
  select * into v_invite from org_invites where token = p_token;

  if not found then
    return jsonb_build_object('error', 'Invalid invite link');
  end if;

  if v_invite.status != 'pending' then
    return jsonb_build_object('error', 'This invite is no longer valid', 'status', v_invite.status);
  end if;

  if v_invite.expires_at < now() then
    update org_invites set status = 'expired' where id = v_invite.id;
    return jsonb_build_object('error', 'This invite has expired');
  end if;

  select organisation into v_org_name from profiles where id = v_invite.org_user_id;

  return jsonb_build_object(
    'ok',        true,
    'invite_id', v_invite.id,
    'email',     v_invite.email,
    'org_name',  v_org_name,
    'expires_at', v_invite.expires_at
  );
end;
$$;

-- Accept an invite (must be authenticated, email must match invite email)
create or replace function public.accept_org_invite(p_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_invite     org_invites%rowtype;
  v_user_email text;
begin
  select email into v_user_email from auth.users where id = auth.uid();

  select * into v_invite from org_invites where token = p_token and status = 'pending';

  if not found then
    return jsonb_build_object('error', 'Invalid or expired invite');
  end if;

  if v_invite.expires_at < now() then
    update org_invites set status = 'expired' where id = v_invite.id;
    return jsonb_build_object('error', 'This invite has expired');
  end if;

  if lower(v_user_email) != v_invite.email then
    return jsonb_build_object('error', 'This invite was sent to a different email address. Please sign in with ' || v_invite.email);
  end if;

  if exists (
    select 1 from org_members
    where org_user_id = v_invite.org_user_id and member_user_id = auth.uid()
  ) then
    update org_invites set status = 'accepted' where id = v_invite.id;
    return jsonb_build_object('ok', true, 'already_member', true);
  end if;

  if (select count(*) from org_members where org_user_id = v_invite.org_user_id) >= 3 then
    return jsonb_build_object('error', 'This organisation has reached its 3-contributor limit');
  end if;

  insert into org_members (org_user_id, member_user_id)
  values (v_invite.org_user_id, auth.uid());

  update org_invites set status = 'accepted' where id = v_invite.id;

  return jsonb_build_object('ok', true);
end;
$$;
