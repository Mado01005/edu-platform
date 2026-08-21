'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      className={cn('flex min-w-0 flex-col gap-4', className)}
      data-slot="tabs"
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'grid w-full min-w-0 grid-cols-2 gap-1 rounded-2xl border border-emerald-950/10 bg-slate-100 p-1 shadow-sm shadow-emerald-950/5 sm:grid-cols-4',
        className,
      )}
      data-slot="tabs-list"
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-transparent px-2 text-xs font-semibold text-slate-600 transition-all duration-200 ease-in-out hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#084B2B] data-[state=active]:border-emerald-200/60 data-[state=active]:bg-emerald-50 data-[state=active]:font-semibold data-[state=active]:text-[#084B2B] data-[state=active]:shadow-sm sm:text-sm',
        className,
      )}
      data-slot="tabs-trigger"
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        'w-full min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#084B2B]',
        className,
      )}
      data-slot="tabs-content"
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
