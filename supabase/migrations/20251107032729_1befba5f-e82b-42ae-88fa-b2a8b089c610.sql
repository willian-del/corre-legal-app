-- Criar tabela de tickets internos
CREATE TABLE public.tickets (
  -- Identificação
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados básicos do ticket
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  category text,
  
  -- Campos para IA (preparados para integração futura)
  ai_suggested_category text,
  ai_sentiment text,
  ai_summary text,
  ai_confidence_score numeric(3,2),
  ai_processed boolean DEFAULT false,
  ai_processed_at timestamp with time zone,
  
  -- Campos para automação de email
  email_sent boolean DEFAULT false,
  email_sent_at timestamp with time zone,
  email_template_id text,
  
  -- Relacionamento com Zendesk
  zendesk_ticket_id text,
  synced_with_zendesk boolean DEFAULT false,
  
  -- Metadados
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  
  -- Constraints
  CONSTRAINT tickets_status_check CHECK (status IN ('open', 'pending', 'in_progress', 'resolved', 'closed')),
  CONSTRAINT tickets_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Índices para otimização
CREATE INDEX idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE INDEX idx_tickets_zendesk_id ON public.tickets(zendesk_ticket_id) WHERE zendesk_ticket_id IS NOT NULL;

-- Trigger para atualizar updated_at
CREATE TRIGGER handle_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Habilitar RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios tickets
CREATE POLICY "Users can view their own tickets"
  ON public.tickets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem criar tickets
CREATE POLICY "Users can create their own tickets"
  ON public.tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar apenas campos permitidos
CREATE POLICY "Users can update their own tickets"
  ON public.tickets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);