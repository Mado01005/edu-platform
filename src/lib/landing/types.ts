export type Locale = 'en' | 'ar';

export type LocalizedText = Readonly<Record<Locale, string>>;

export type LandingEventName =
  | 'landing_view'
  | 'hero_diagnostic_click'
  | 'hero_free_lesson_click'
  | 'navbar_diagnostic_click'
  | 'whatsapp_click'
  | 'sign_in_click'
  | 'catalog_click'
  | 'preview_lesson_click'
  | 'curriculum_tab_change'
  | 'grade_select'
  | 'subject_select'
  | 'faq_open'
  | 'language_toggle'
  | 'final_diagnostic_click';

export type CurriculumId = 'saudi' | 'american';

export type LandingTestimonial = Readonly<{
  id: string;
  quote: LocalizedText;
  attribution: LocalizedText;
  consentVerified: true;
}>;

