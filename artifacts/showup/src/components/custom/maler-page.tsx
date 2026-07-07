'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api-client';
import {
  type TemplateItem,
  type TemplateLanguage,
  TemplateList,
  type TemplateType,
  TemplateTypeSchema,
} from '@/lib/contracts/maler';

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  reminder_24h: '24-timers påminnelse',
  reminder_2h: '2-timers påminnelse',
  confirmation: 'Bekreftelseskvittering',
};

const DEFAULT_BODIES: Record<TemplateType, string> = {
  reminder_24h:
    'Hei {{kundenavn}}! Dette er en påminnelse om avtalen din i morgen {{dato}} kl. {{klokkeslett}}. Svar JA for å bekrefte, NEI for å kansellere, eller OMBESTILL. [ref:{{id}}]',
  reminder_2h:
    'Hei {{kundenavn}}! Påminnelse om avtalen din om 2 timer – {{dato}} kl. {{klokkeslett}}. Svar JA for å bekrefte. [ref:{{id}}]',
  confirmation:
    'Hei {{kundenavn}}! Avtalen din {{dato}} kl. {{klokkeslett}} er bekreftet. Vi gleder oss til å se deg!',
};

const MOCK_VALUES: Record<string, string> = {
  '{{kundenavn}}': 'Ola Nordmann',
  '{{dato}}': 'mandag 8. juli 2026',
  '{{klokkeslett}}': '10:00',
  '{{tjeneste}}': 'Behandling',
  '{{id}}': 'abc123',
};

function interpolate(body: string) {
  return body.replace(/\{\{[^}]+\}\}/g, (match) => MOCK_VALUES[match] ?? match);
}

function TemplateEditor({
  type,
  initial,
  onSaved,
}: {
  type: TemplateType;
  initial?: TemplateItem;
  onSaved: (item: TemplateItem) => void;
}) {
  const [language, setLanguage] = useState<TemplateLanguage>(initial?.language ?? 'no');
  const [body, setBody] = useState(initial?.body ?? DEFAULT_BODIES[type]);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const result = await apiFetch<TemplateItem>(`/api/maler/${type}`, {
        method: 'PUT',
        body: JSON.stringify({ language, body }),
      });
      onSaved(result);
      toast.success('Mal lagret');
    } catch {
      toast.error('Kunne ikke lagre mal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`lang-${type}`}>Språk</Label>
          <Select value={language} onValueChange={(v) => setLanguage(v as TemplateLanguage)}>
            <SelectTrigger id={`lang-${type}`} className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">Norsk</SelectItem>
              <SelectItem value="en">Engelsk</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`body-${type}`}>Meldingstekst</Label>
          <Textarea
            id={`body-${type}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="font-mono text-sm"
            placeholder="Skriv melding her..."
          />
          <p className="text-xs text-muted-foreground">
            Variabler: <code className="rounded bg-muted px-1">{'{{kundenavn}}'}</code>{' '}
            <code className="rounded bg-muted px-1">{'{{dato}}'}</code>{' '}
            <code className="rounded bg-muted px-1">{'{{klokkeslett}}'}</code>{' '}
            <code className="rounded bg-muted px-1">{'{{tjeneste}}'}</code>
          </p>
        </div>

        <Button type="button" onClick={save} disabled={saving || body.trim().length === 0}>
          {saving ? 'Lagrer…' : 'Lagre mal'}
        </Button>
      </div>

      <Card className="bg-muted/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Forhåndsvisning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {interpolate(body) || '(tom)'}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">{body.length} / 1600 tegn</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function MalerPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/maler', { schema: TemplateList })
      .then((data) => setTemplates(data.items))
      .catch(() => toast.error('Kunne ikke laste maler'))
      .finally(() => setLoading(false));
  }, []);

  function getTemplate(type: TemplateType, lang: TemplateLanguage) {
    return templates.find((t) => t.type === type && t.language === lang);
  }

  function handleSaved(item: TemplateItem) {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.type === item.type && t.language === item.language);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
  }

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Laster maler…</div>;
  }

  const types = TemplateTypeSchema.options;

  return (
    <Tabs defaultValue={types[0]} className="space-y-6">
      <TabsList>
        {types.map((t) => (
          <TabsTrigger key={t} value={t}>
            {TEMPLATE_LABELS[t]}
          </TabsTrigger>
        ))}
      </TabsList>
      {types.map((t) => (
        <TabsContent key={t} value={t} className="mt-0">
          <TemplateEditor type={t} initial={getTemplate(t, 'no')} onSaved={handleSaved} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
