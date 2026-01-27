
# Plano: Corrigir Edge Function process-payment

## Problema Identificado

A API do Mercado Pago está retornando erro `"Params Error"` porque o campo `email` do pagador está `undefined`. Isso ocorre porque:

1. O frontend (`TransparentCheckoutForm.tsx`) não envia o email do usuário no objeto `payer`
2. A edge function tenta acessar `paymentDataMP.formData.payer.email` que não existe

## Solucao

Corrigir a edge function para obter o email do usuario autenticado via Supabase Auth (que ja esta disponivel no contexto), em vez de depender do frontend enviar esse dado.

---

## Alteracoes Necessarias

### 1. Atualizar Edge Function `process-payment/index.ts`

**Modificacoes:**

1. Usar o email do usuario autenticado (`user.email`) em vez de confiar no frontend
2. Adicionar validacao para garantir que campos obrigatorios existam antes de enviar para Mercado Pago
3. Melhorar logging para debug

**Codigo atualizado no objeto `mpData`:**

```typescript
const mpData = {
  payer: {
    email: user.email, // Usar email do usuario autenticado
    identification: paymentDataMP.formData?.payer?.identification,
  },
  binary_mode: true,
  installments: paymentDataMP.formData?.installments || 1,
  token: paymentDataMP.formData?.token,
  payment_method_id: paymentDataMP.formData?.payment_method_id,
  transaction_amount: finalAmount,
};
```

### 2. Validacao Adicional

Adicionar validacao antes de enviar para Mercado Pago:

```typescript
// Validar campos obrigatorios
if (!paymentDataMP?.formData?.token) {
  throw new Error("Token do cartao nao fornecido");
}

if (!user.email) {
  throw new Error("Email do usuario nao disponivel");
}
```

---

## Resumo das Mudancas

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/process-payment/index.ts` | Usar `user.email` do contexto de autenticacao, adicionar `payment_method_id`, melhorar validacao |

## Beneficios

- Email sempre disponivel via autenticacao (mais seguro)
- Nao depende do frontend enviar dados sensiveis
- Validacao robusta antes de chamar API externa
- Logs melhorados para debug

## Proximos Passos Apos Aprovacao

1. Implementar as correcoes
2. Redeploiar a edge function automaticamente
3. Testar o fluxo de pagamento completo
