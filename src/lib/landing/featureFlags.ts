export type CapabilityStatus = 'available' | 'experience';

export const landingFeatureFlags = {
  assessmentExperience: {
    status: 'available',
  },
  lessonVault: {
    status: 'experience',
  },
  crossDeviceLearning: {
    status: 'experience',
  },
  parentProgressTracking: {
    status: 'available',
  },
} as const satisfies Record<string, { status: CapabilityStatus }>;

