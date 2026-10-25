"use client";

import { useActionState } from "react";

type ActionResult = { success?: string; error?: string } | void;
type Action = (formData: FormData) => Promise<ActionResult>;

export function AdminActionForm({ action, children }: { action: Action; children: React.ReactNode }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (_previous, formData) => action(formData), undefined);
  const feedback = state ?? {};

  return <form action={formAction}>
    {children}
    {"error" in feedback && feedback.error && <p role="alert" className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-900">{feedback.error}</p>}
    {"success" in feedback && feedback.success && <p role="status" className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">{feedback.success}</p>}
    {pending && <p className="mt-3 text-sm text-slate-500" role="status">Сохраняем изменения…</p>}
  </form>;
}
