import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ZendeskWidgetProps {
  showOnlyWithSubscription?: boolean;
  hasActiveSubscription?: boolean;
}

declare global {
  interface Window {
    zE?: any;
    zESettings?: any;
  }
}

const ZendeskWidget = ({ 
  showOnlyWithSubscription = false, 
  hasActiveSubscription = false 
}: ZendeskWidgetProps) => {
  const { user } = useAuth();

  useEffect(() => {
    // Se configurado para mostrar apenas com assinatura e usuário não tem, não carregar
    if (showOnlyWithSubscription && !hasActiveSubscription) {
      return;
    }

    // Não carregar se não houver usuário
    if (!user) {
      return;
    }

    const subdomain = import.meta.env.VITE_ZENDESK_SUBDOMAIN || 'correlegal';
    const script = document.createElement('script');
    script.id = 'ze-snippet';
    script.src = `https://static.zdassets.com/ekr/snippet.js?key=${subdomain}`;
    script.async = true;

    script.onload = () => {
      if (window.zE) {
        // Pré-preencher dados do usuário
        window.zE('messenger', 'loginUser', (callback: any) => {
          callback({
            name: user.user_metadata?.full_name || user.email?.split('@')[0],
            email: user.email,
          });
        });

        // Adicionar campos customizados (será configurado no Zendesk)
        window.zE('messenger', 'set', {
          conversationFields: [
            { id: 'cpf', value: user.user_metadata?.cpf || 'Não informado' },
            { id: 'service_type', value: user.user_metadata?.service_type || 'Não informado' },
            { id: 'origin', value: 'Corre Legal - Área do Cliente' },
            { id: 'has_subscription', value: hasActiveSubscription ? 'Sim' : 'Não' },
          ]
        });

        // Inicialmente oculto - será aberto por botão
        window.zE('messenger', 'hide');
      }
    };

    document.body.appendChild(script);

    // Cleanup
    return () => {
      const existingScript = document.getElementById('ze-snippet');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Remover widget do DOM
      const widgetFrame = document.querySelector('iframe[title*="Messaging"]');
      if (widgetFrame) {
        widgetFrame.remove();
      }
      
      // Limpar objeto global
      if (window.zE) {
        delete window.zE;
      }
    };
  }, [user, showOnlyWithSubscription, hasActiveSubscription]);

  // Componente não renderiza nada - apenas carrega o script
  return null;
};

export default ZendeskWidget;

// Funções auxiliares para controlar o widget
export const openZendeskWidget = () => {
  if (window.zE) {
    window.zE('messenger', 'open');
  }
};

export const closeZendeskWidget = () => {
  if (window.zE) {
    window.zE('messenger', 'close');
  }
};

export const showZendeskWidget = () => {
  if (window.zE) {
    window.zE('messenger', 'show');
  }
};

export const hideZendeskWidget = () => {
  if (window.zE) {
    window.zE('messenger', 'hide');
  }
};
