'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { apiFetch } from '@/lib/api-client';
import { type AdminUserItem, AdminUsersResponse } from '@/lib/contracts/admin-users';

function formatDate(iso: string | null): string {
  if (!iso) return 'Aldri';
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type ActionState = {
  userId: string;
  action: 'reset' | 'ban' | 'unban' | 'delete';
} | null;

export function AdminPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActionState>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserItem | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/admin/users', { schema: AdminUsersResponse });
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      setError('Kunne ikke hente brukere. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  async function doAction(userId: string, action: 'reset' | 'ban' | 'unban'): Promise<void> {
    setActiveAction({ userId, action });
    setActionError(null);
    setSuccessMsg(null);

    const pathMap = {
      reset: `/api/admin/users/${userId}/reset-password`,
      ban: `/api/admin/users/${userId}/ban`,
      unban: `/api/admin/users/${userId}/unban`,
    };
    const methodMap = { reset: 'POST', ban: 'PATCH', unban: 'PATCH' } as const;

    try {
      await apiFetch(pathMap[action], {
        method: methodMap[action],
        body: JSON.stringify({}),
      });
      if (action === 'reset') {
        setSuccessMsg('Passord-reset-lenke er sendt til brukerens e-post.');
      }
      if (action !== 'reset') await fetchUsers();
    } catch {
      setActionError('Noe gikk galt, prøv igjen.');
    } finally {
      setActiveAction(null);
    }
  }

  async function doDelete(userId: string): Promise<void> {
    setActiveAction({ userId, action: 'delete' });
    setActionError(null);
    setSuccessMsg(null);
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE', body: JSON.stringify({}) });
      setDeleteTarget(null);
      await fetchUsers();
    } catch {
      setActionError('Noe gikk galt, prøv igjen.');
      setDeleteTarget(null);
    } finally {
      setActiveAction(null);
    }
  }

  type ActionKind = 'reset' | 'ban' | 'unban' | 'delete';
  const isRunning = (userId: string, action?: ActionKind) =>
    activeAction?.userId === userId && (!action || activeAction.action === action);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2">Brukerstyring</h1>
          <p className="text-muted-foreground text-sm">Administrer registrerte brukere</p>
        </div>
        <Badge variant="secondary" className="self-start text-sm sm:self-auto">
          Totalt: {total} brukere
        </Badge>
      </div>

      <Separator />

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          {successMsg}
        </div>
      )}
      {actionError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* Search */}
      <div className="max-w-sm">
        <Input
          type="search"
          placeholder="Søk på navn eller e-post…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-muted-foreground py-12 text-center text-sm">Laster brukere…</div>
      ) : error ? (
        <div className="text-destructive py-12 text-center text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          {search ? 'Ingen brukere matcher søket.' : 'Ingen brukere registrert.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground border-b">
                <th className="px-4 py-3 text-left font-medium">Navn</th>
                <th className="px-4 py-3 text-left font-medium">E-post</th>
                <th className="hidden px-4 py-3 text-left font-medium md:table-cell">
                  Bedriftsnavn
                </th>
                <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Registrert</th>
                <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">
                  Siste innlogging
                </th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr
                  key={u.id}
                  className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}
                >
                  <td className="px-4 py-3 font-medium">{u.name || '—'}</td>
                  <td className="text-muted-foreground px-4 py-3">{u.email}</td>
                  <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                    {u.businessType || '—'}
                  </td>
                  <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                    {formatDate(u.lastLogin)}
                  </td>
                  <td className="px-4 py-3">
                    {u.banned ? (
                      <Badge variant="destructive" className="text-xs">
                        Deaktivert
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="border-green-200 bg-green-100 text-xs text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                      >
                        Aktiv
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      {/* Reset password */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!!activeAction && isRunning(u.id, 'reset')}
                        onClick={() => {
                          setSuccessMsg(null);
                          setActionError(null);
                          doAction(u.id, 'reset');
                        }}
                        className="h-7 text-xs"
                      >
                        {isRunning(u.id, 'reset') ? 'Sender…' : 'Resett passord'}
                      </Button>

                      {/* Ban / Unban */}
                      {u.banned ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!!activeAction && isRunning(u.id, 'unban')}
                          onClick={() => doAction(u.id, 'unban')}
                          className="h-7 text-xs"
                        >
                          {isRunning(u.id, 'unban') ? 'Reaktiverer…' : 'Reaktiver'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!!activeAction && isRunning(u.id, 'ban')}
                          onClick={() => doAction(u.id, 'ban')}
                          className="h-7 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400"
                        >
                          {isRunning(u.id, 'ban') ? 'Deaktiverer…' : 'Deaktiver'}
                        </Button>
                      )}

                      {/* Delete */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!!activeAction && isRunning(u.id, 'delete')}
                        onClick={() => {
                          setActionError(null);
                          setSuccessMsg(null);
                          setDeleteTarget(u);
                        }}
                        className="h-7 text-xs text-red-700 hover:text-red-800 dark:text-red-400"
                      >
                        {isRunning(u.id, 'delete') ? 'Sletter…' : 'Slett'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slett bruker</DialogTitle>
            <DialogDescription>
              Er du sikker på at du vil slette{' '}
              <strong>{deleteTarget?.name || deleteTarget?.email}</strong>? Denne handlingen kan
              ikke angres.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={activeAction?.action === 'delete'}
            >
              Avbryt
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteTarget && doDelete(deleteTarget.id)}
              disabled={activeAction?.action === 'delete'}
            >
              {activeAction?.action === 'delete' ? 'Sletter…' : 'Ja, slett bruker'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
