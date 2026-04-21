import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type RenderOptions = {
  initialEntries?: string[];
  routePath?: string;
};

type RenderResult = {
  container: HTMLDivElement;
  queryClient: QueryClient;
  unmount: () => Promise<void>;
};

function withRouter(ui: ReactElement, options: RenderOptions) {
  if (!options.routePath) {
    return <MemoryRouter initialEntries={options.initialEntries}>{ui}</MemoryRouter>;
  }

  return (
    <MemoryRouter initialEntries={options.initialEntries}>
      <Routes>
        <Route path={options.routePath} element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

export async function renderWithProviders(ui: ReactElement, options: RenderOptions = {}): Promise<RenderResult> {
  const container = document.createElement("div");
  document.body.append(container);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const root: Root = createRoot(container);

  await act(async () => {
    root.render(<QueryClientProvider client={queryClient}>{withRouter(ui, options)}</QueryClientProvider>);
  });

  return {
    container,
    queryClient,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      queryClient.clear();
      container.remove();
    },
  };
}

export async function waitFor(assertion: () => void, timeoutMs = 2000) {
  const startedAt = Date.now();

  while (true) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw error;
      }
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 20));
      });
    }
  }
}

export async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}
