import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Palette, Pencil, Plus, Trash2 } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeFormDialog } from './ThemeFormDialog';
import { ThemeStrip, ThemeSwatch } from './ThemeSwatch';
import { useDeleteTheme, useThemes } from './usePlatform';
import { getErrorMessage } from '@/lib/api';

const usage = (count) => (count === 0 ? 'Not in use' : `Used by ${count} gym${count === 1 ? '' : 's'}`);

const ThemeCard = ({ theme, index, onEdit, onDelete }) => {
  const inUse = theme.gymCount > 0;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      className="panel flex flex-col gap-4 rounded-2xl border border-border/70 p-4"
    >
      <ThemeStrip theme={theme} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 truncate font-medium">
            <ThemeSwatch theme={theme} />
            <span className="truncate">{theme.name}</span>
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {theme.primary}
            {theme.accent && ` · ${theme.accent}`}
          </p>
        </div>

        {theme.isSystem && (
          <Badge variant="outline" className="shrink-0 gap-1 text-[0.625rem] tracking-[0.1em] uppercase">
            <Lock className="size-3" />
            Built-in
          </Badge>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{usage(theme.gymCount)}</span>

        {!theme.isSystem && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${theme.name}`} onClick={() => onEdit(theme)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${theme.name}`}
              title={inUse ? 'Move the gyms using this theme to another one first' : undefined}
              disabled={inUse}
              onClick={() => onDelete(theme)}
              className="hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </motion.li>
  );
};

/**
 * The theme library: the ten built-in themes and the platform
 * administrator's own. Built-in themes are read-only; a custom theme can be
 * deleted once no gym is wearing it.
 */
export const ThemesPage = () => {
  const { data: themes, isLoading, isError, error } = useThemes();
  const deleteTheme = useDeleteTheme();

  const [editing, setEditing] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (theme) => {
    setEditing(theme);
    setIsFormOpen(true);
  };

  const custom = themes?.filter((theme) => !theme.isSystem) ?? [];
  const system = themes?.filter((theme) => theme.isSystem) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Themes"
        description="The colours a gym's screens wear. Assign one to each gym from the Gyms page."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            New theme
          </Button>
        }
      />

      {isError && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3.5 text-sm text-destructive">
          {getErrorMessage(error)}
        </p>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-44 rounded-2xl" />
          ))}
        </div>
      )}

      {themes && (
        <div className="space-y-10">
          <section aria-labelledby="custom-themes" className="space-y-4">
            <h2 id="custom-themes" className="eyebrow">Your themes</h2>
            {custom.length === 0 ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex w-full items-center gap-4 rounded-2xl border border-dashed border-border p-5 text-left transition-colors hover:border-primary/45"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Palette className="size-5" />
                </span>
                <span>
                  <span className="block font-medium">Make a theme in a gym's own colours</span>
                  <span className="block text-sm text-muted-foreground">
                    Pick a primary colour and, if you like, an accent. The rest is worked out for you.
                  </span>
                </span>
              </button>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {custom.map((theme, index) => (
                  <ThemeCard key={theme.id} theme={theme} index={index} onEdit={openEdit} onDelete={setPendingDelete} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="system-themes" className="space-y-4">
            <h2 id="system-themes" className="eyebrow">Built-in themes</h2>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {system.map((theme, index) => (
                <ThemeCard key={theme.id} theme={theme} index={index} onEdit={openEdit} onDelete={setPendingDelete} />
              ))}
            </ul>
          </section>
        </div>
      )}

      <ThemeFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} theme={editing} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.name}?`}
        description="The theme is removed from the library. No gym is using it, so nothing changes on any gym's screens."
        confirmLabel="Delete theme"
        isPending={deleteTheme.isPending}
        onConfirm={async () => {
          await deleteTheme.mutateAsync({ id: pendingDelete.id, name: pendingDelete.name });
          setPendingDelete(null);
        }}
      />
    </>
  );
};
