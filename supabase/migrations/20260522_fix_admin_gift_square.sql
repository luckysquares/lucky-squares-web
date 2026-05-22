-- Fix admin_gift_square: use upsert so it works even if the square row
-- doesn't exist yet (squares are created lazily), and replace the non-existent
-- "owner" column with the correct "buyer_name" column.

create or replace function public.admin_gift_square(
  p_fundraiser_id uuid,
  p_square_number integer
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.squares (
    fundraiser_id, number, status, is_sponsored, buyer_name, paid
  ) values (
    p_fundraiser_id, p_square_number, 'sold', true, 'Lucky Squares Australia', true
  )
  on conflict (fundraiser_id, number) do update set
    status       = 'sold',
    is_sponsored = true,
    buyer_name   = 'Lucky Squares Australia',
    paid         = true,
    reserved_until = null;
end;
$$;
