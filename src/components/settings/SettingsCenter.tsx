'use client';

import {
  BellRing,
  CircleUserRound,
  Play,
  ShieldCheck,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/UI/tabs';
import { LearningPreferencesForm } from '@/components/settings/LearningPreferencesForm';
import { NotificationSettingsForm } from '@/components/settings/NotificationSettingsForm';
import { ProfileSettingsForm } from '@/components/settings/ProfileSettingsForm';
import { SecuritySettingsForm } from '@/components/settings/SecuritySettingsForm';
import type { SettingsUserData } from '@/components/settings/types';

interface SettingsCenterProps {
  initialUser: SettingsUserData;
  providers: string[];
}

export function SettingsCenter({
  initialUser,
  providers,
}: SettingsCenterProps) {
  return (
    <Tabs className="w-full" defaultValue="profile">
      <TabsList aria-label="Settings sections">
        <TabsTrigger value="profile">
          <CircleUserRound className="size-4" aria-hidden="true" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="learning">
          <Play className="size-4" aria-hidden="true" />
          Learning
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <BellRing className="size-4" aria-hidden="true" />
          Notices
        </TabsTrigger>
        <TabsTrigger value="security">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Security
        </TabsTrigger>
      </TabsList>

      <TabsContent className="w-full" value="profile">
        <ProfileSettingsForm initialUser={initialUser} />
      </TabsContent>
      <TabsContent className="w-full" value="learning">
        <LearningPreferencesForm initialUser={initialUser} />
      </TabsContent>
      <TabsContent className="w-full" value="notifications">
        <NotificationSettingsForm initialUser={initialUser} />
      </TabsContent>
      <TabsContent className="w-full" value="security">
        <SecuritySettingsForm
          email={initialUser.email}
          providers={providers}
        />
      </TabsContent>
    </Tabs>
  );
}
