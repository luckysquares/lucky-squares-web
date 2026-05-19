-- Demo prizes for each sample campaign
-- Matched by title so no hardcoded UUIDs needed

-- ── Werribee Junior Football Club ────────────────────────────────────────────
insert into public.prizes (fundraiser_id, place, description, value, donated, sort_order)
select id, '1st', '$100 cash', 100, false, 1
from public.fundraisers where title = 'Help our Under 14s get to the State Championships';

insert into public.prizes (fundraiser_id, place, description, value, donated, sort_order)
select id, '2nd', 'Signed Werribee Eagles club jumper', null, true, 2
from public.fundraisers where title = 'Help our Under 14s get to the State Championships';

insert into public.prizes (fundraiser_id, place, description, value, donated, sort_order)
select id, '3rd', 'Family 4-pack to a VFL home game', null, true, 3
from public.fundraisers where title = 'Help our Under 14s get to the State Championships';

-- ── Sunbury Primary School P&C ────────────────────────────────────────────────
insert into public.prizes (fundraiser_id, place, description, value, donated, sort_order)
select id, '1st', '$200 Rebel Sport voucher', 200, true, 1
from public.fundraisers where title = 'New playground equipment for Sunbury Primary';

insert into public.prizes (fundraiser_id, place, description, value, donated, sort_order)
select id, '2nd', '$100 Coles gift card', 100, true, 2
from public.fundraisers where title = 'New playground equipment for Sunbury Primary';

-- ── Bayside Surf Lifesaving Club ──────────────────────────────────────────────
insert into public.prizes (fundraiser_id, place, description, value, donated, sort_order)
select id, '1st', '$250 cash', 250, false, 1
from public.fundraisers where title = 'New patrol boards for Bayside Surf Lifesaving Club';

insert into public.prizes (fundraiser_id, place, description, value, donated, sort_order)
select id, '2nd', 'Rip Curl wetsuit', 280, true, 2
from public.fundraisers where title = 'New patrol boards for Bayside Surf Lifesaving Club';

insert into public.prizes (fundraiser_id, place, description, value, donated, sort_order)
select id, '3rd', 'Club beach pack — towel, cap and sunscreen kit', null, true, 3
from public.fundraisers where title = 'New patrol boards for Bayside Surf Lifesaving Club';

-- ── Glenelg Baseball Club — Chuggernauts ──────────────────────────────────────
insert into public.prizes (fundraiser_id, place, description, value, donated, sort_order)
select id, '1st', '$100 cash', 100, false, 1
from public.fundraisers where title = 'PANPACS Gold Coast 2026 — Chuggernauts Women''s Baseball';

insert into public.prizes (fundraiser_id, place, description, value, donated, sort_order)
select id, '2nd', 'Official Chuggernauts team kit — jersey, cap and bag', null, true, 2
from public.fundraisers where title = 'PANPACS Gold Coast 2026 — Chuggernauts Women''s Baseball';

-- ── Wildlife Friends SA ────────────────────────────────────────────────────────
insert into public.prizes (fundraiser_id, place, description, value, donated, sort_order)
select id, '1st', '$150 cash', 150, false, 1
from public.fundraisers where title = 'New rescue vehicle for Wildlife Friends SA';

insert into public.prizes (fundraiser_id, place, description, value, donated, sort_order)
select id, '2nd', 'Adopt a Wombat experience pack', null, true, 2
from public.fundraisers where title = 'New rescue vehicle for Wildlife Friends SA';

insert into public.prizes (fundraiser_id, place, description, value, donated, sort_order)
select id, '3rd', '$50 Bunnings gift card', 50, true, 3
from public.fundraisers where title = 'New rescue vehicle for Wildlife Friends SA';
