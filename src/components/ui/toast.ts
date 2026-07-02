/**
 * Tiny event-bus toast API. MutationForm calls `emitToast` on success/failure;
 * a single <Toaster/> mounted in the root layout listens and renders.
 */
export type ToastTone = "ok" | "danger" | "info";

export const TOAST_EVENT = "barberbook:toast";

export interface ToastPayload {
  readonly message: string;
  readonly tone: ToastTone;
}

export function emitToast(message: string, tone: ToastTone = "ok"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: { message, tone } }),
  );
}
