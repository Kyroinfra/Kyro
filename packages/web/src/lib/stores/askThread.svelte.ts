// stores/askThread.svelte.ts — module-scoped ask thread (background prompts)
//
// Owning the transcript and the stream loop AT MODULE SCOPE — not inside the
// ask page component — is what lets a question keep processing after the user
// navigates elsewhere: SvelteKit destroys the page on navigation, but module
// state and its in-flight fetch survive for the whole SPA session, and the
// $effect.root()-persisted transcript keeps saving the streamed answer. Leave
// and come back: the reply has finished (or is still streaming) in-thread.
//
// Boundary: a full page reload kills the browser connection, so whatever the
// server streamed up to that point is what is stored. Continuing across a
// reload would need server-side jobs — out of scope.
//
// Deletion note: the persistence effect is save-only; the stored key is only
// ever removed by clearThread() (explicit "clear chat"). An effect that wiped
// the key on empty state used to race restore and eat the whole thread
// (regression fixed in 464fedb).

import { browser } from "$app/environment";
import { askStream, type AskSource } from "$lib/api/ask";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: AskSource[];
  error?: string;
  streaming?: boolean;
}

const THREAD_KEY = "kyro.ask.thread";
const MAX_STORED = 50; // transcript cap (turns kept for restore)
const HISTORY_TURNS = 8; // turns replayed to the LLM

export const thread = $state<{ messages: ChatMessage[]; asking: boolean }>({
  messages: [],
  asking: false,
});

// Bumped by clearThread — in-flight stream loops stop writing once stale.
let generation = 0;
let activeController: AbortController | null = null;

function settle(
  slot: number,
  myGen: number,
  patch: Partial<ChatMessage>,
): void {
  if (myGen !== generation) return; // cleared mid-stream — discard the turn
  const target = thread.messages[slot];
  if (!target) return;
  thread.messages[slot] = { ...target, ...patch };
  thread.messages = [...thread.messages];
}

if (browser) {
  // Restore once, at module load on the client — before the ask page's first
  // render, so the transcript is already there when the component mounts.
  try {
    const saved = localStorage.getItem(THREAD_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        thread.messages = (parsed as ChatMessage[])
          .filter(m => m && typeof m.content === "string" && (m.content || m.error))
          .slice(-MAX_STORED)
          .map(m => ({ ...m, streaming: false }));
      }
    }
  } catch {
    // corrupt or unusable storage — start clean
  }

  // $effect.root keeps persistence alive for the WHOLE SPA session — it is
  // not owned by the ask page (whose effects are torn down on navigation).
  $effect.root(() => {
    $effect(() => {
      if (thread.messages.length === 0) return;
      try {
        localStorage.setItem(
          THREAD_KEY,
          JSON.stringify(thread.messages.slice(-MAX_STORED)),
        );
      } catch {
        // storage unavailable (private mode/full) — history simply degrades
      }
    });
  });
}

/** Injected assistant-side notice (e.g. "Select a collection first."). */
export function note(text: string): void {
  thread.messages = [
    ...thread.messages,
    { role: "assistant", content: "", error: text },
  ];
}

function buildHistory(): Array<{ role: "user" | "assistant"; content: string }> {
  return thread.messages
    .filter(m => !m.streaming && !m.error && m.content)
    .slice(-HISTORY_TURNS)
    .map(m => ({ role: m.role, content: m.content }));
}

export interface AskScope {
  apiKey: string;
  collectionId?: string;
}

export async function ask(question: string, scope: AskScope): Promise<void> {
  const q = question.trim();
  if (!q || thread.asking) return;

  // Snapshot prior turns BEFORE the new user message so the API receives the
  // thread without the question it is also getting inline.
  const history = buildHistory();

  thread.messages = [...thread.messages, { role: "user", content: q }];
  thread.asking = true;

  const myGen = generation;
  thread.messages = [
    ...thread.messages,
    { role: "assistant", content: "", streaming: true },
  ];
  const slot = thread.messages.length - 1;

  const controller = new AbortController();
  activeController = controller;

  try {
    await askStream(
      scope.apiKey,
      {
        question: q,
        ...(scope.collectionId ? { collectionId: scope.collectionId } : {}),
        history,
      },
      {
        onSources: sources => settle(slot, myGen, { sources }),
        onChunk: text =>
          settle(slot, myGen, {
            content: (thread.messages[slot]?.content ?? "") + text,
          }),
        onError: message => settle(slot, myGen, { error: message, streaming: false }),
      },
      controller.signal,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    settle(slot, myGen, { error: message, streaming: false });
  } finally {
    settle(slot, myGen, { streaming: false });
    if (myGen === generation) thread.asking = false;
    if (activeController === controller) activeController = null;
  }
}

/** "Clear chat" — the only place the stored thread is deleted. Also aborts
 *  any in-flight stream so nothing keeps generating in the background. */
export function clearThread(): void {
  generation++;
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
  thread.messages = [];
  thread.asking = false;
  try {
    localStorage.removeItem(THREAD_KEY);
  } catch {
    // storage unavailable — nothing to clean
  }
}
