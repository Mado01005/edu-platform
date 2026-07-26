export interface SettingsUserData {
  avatarUrl: string | null;
  autoPlayNext: boolean;
  bio: string | null;
  defaultPlaybackSpeed: number;
  defaultVideoQuality: string;
  email: string;
  headline: string | null;
  name: string | null;
  notifyAnnouncements: boolean;
  notifyDiscussions: boolean;
  notifyZoomClasses: boolean;
  timezone: string;
}

export interface SettingsNotice {
  message: string;
  type: 'error' | 'success';
}
