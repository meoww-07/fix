/// <reference types="vite/client" />

declare const chrome: {
  runtime: {
    sendMessage: <T = unknown>(message: unknown) => Promise<T>;
    onMessage: {
      addListener: (
        callback: (
          message: unknown,
          sender: { tab?: { id?: number; url?: string } },
          sendResponse: (response?: unknown) => void
        ) => boolean | void
      ) => void;
    };
    lastError?: { message?: string };
  };
  tabs: {
    query: (
      queryInfo: { active?: boolean; currentWindow?: boolean; url?: string | string[] },
      callback: (tabs: Array<{ id?: number; url?: string; title?: string }>) => void
    ) => void;
    sendMessage: <T = unknown>(tabId: number, message: unknown) => Promise<T>;
    create: (createProperties: { url: string; active?: boolean }) => Promise<{ id?: number; url?: string }>;
    remove: (tabId: number) => Promise<void>;
    onUpdated: {
      addListener: (
        callback: (tabId: number, changeInfo: { status?: string }, tab: { id?: number; url?: string }) => void
      ) => void;
      removeListener: (
        callback: (tabId: number, changeInfo: { status?: string }, tab: { id?: number; url?: string }) => void
      ) => void;
    };
  };
  scripting: {
    executeScript: <T = unknown>(details: {
      target: { tabId: number };
      func?: () => T;
      files?: string[];
    }) => Promise<Array<{ result?: T }>>;
  };
  storage: {
    local: {
      get: <T = Record<string, unknown>>(keys?: string | string[] | Record<string, unknown> | null) => Promise<T>;
      set: (items: Record<string, unknown>) => Promise<void>;
    };
  };
};
