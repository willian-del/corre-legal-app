import { ReactElement, ReactNode } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MockAuthProvider } from '../mocks/auth-context';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authOverrides?: any;
  initialRoute?: string;
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

const AllTheProviders = ({
  children,
  authOverrides,
  initialRoute = '/',
}: {
  children: ReactNode;
  authOverrides?: any;
  initialRoute?: string;
}) => {
  const queryClient = createTestQueryClient();

  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MockAuthProvider overrides={authOverrides}>
        <BrowserRouter>{children}</BrowserRouter>
      </MockAuthProvider>
    </QueryClientProvider>
  );
};

export const render = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { authOverrides, initialRoute, ...renderOptions } = options || {};

  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders authOverrides={authOverrides} initialRoute={initialRoute}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Re-export from @testing-library/react
export * from '@testing-library/react';
export { screen, waitFor };
