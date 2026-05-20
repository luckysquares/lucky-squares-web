-- Support team roles on profiles (add column)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS support_role text CHECK (support_role IN ('agent', 'super_admin', 'readonly')) DEFAULT NULL;

-- Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_ref    text        UNIQUE NOT NULL, -- e.g. TKT-0001
  contact_name  text        NOT NULL,
  contact_email text        NOT NULL,
  subject       text        NOT NULL,
  category      text        NOT NULL DEFAULT 'general' CHECK (category IN ('billing','campaign_help','technical','abuse','general')),
  priority      text        NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status        text        NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),
  assignee_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  satisfaction  text        CHECK (satisfaction IN ('positive','negative')),
  sla_breached  boolean     NOT NULL DEFAULT false,
  merged_into   uuid        REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  closed_at     timestamptz
);

-- Messages (customer + admin replies + internal notes)
CREATE TABLE IF NOT EXISTS public.support_messages (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id     uuid        REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  body          text        NOT NULL,
  is_internal   boolean     NOT NULL DEFAULT false,
  sender_type   text        NOT NULL CHECK (sender_type IN ('customer','admin')),
  sender_name   text,
  sender_email  text,
  created_at    timestamptz DEFAULT now()
);

-- Canned responses
CREATE TABLE IF NOT EXISTS public.support_canned_responses (
  id          uuid  DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text  NOT NULL,
  body        text  NOT NULL,
  category    text,
  created_by  uuid  REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- Ticket reference sequence
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1;

-- Auto-increment ticket_ref
CREATE OR REPLACE FUNCTION public.generate_ticket_ref()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.ticket_ref := 'TKT-' || LPAD(nextval('support_ticket_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ticket_ref
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW WHEN (NEW.ticket_ref IS NULL OR NEW.ticket_ref = '')
  EXECUTE FUNCTION public.generate_ticket_ref();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_support_ticket_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_support_ticket_updated_at();

-- RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_canned_responses ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS support_tickets_created_idx ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON public.support_messages(ticket_id);
