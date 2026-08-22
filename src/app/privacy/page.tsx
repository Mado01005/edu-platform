import type { Metadata } from 'next';
import { LegalPageShell, type LegalSection } from '@/components/legal/legal-page-shell';

export const metadata: Metadata = {
  title: 'Privacy Policy | Oqool Academy',
  description: 'How Oqool Academy collects, uses, protects, and shares student and account information.',
};

const sections: readonly LegalSection[] = [
  {
    id: 'scope',
    title: 'Who this policy covers',
    titleAr: 'نطاق سياسة الخصوصية',
    content: (
      <>
        <p>Oqool Academy provides structured online learning, live classes, assignments, course resources, and student-support services. This policy explains how we handle personal information when students, parents, instructors, and administrators use our websites and learning platform.</p>
        <p>“Oqool Academy,” “we,” and “our” refer to the academy service operating through <strong>edu-platform.me</strong>. Questions can be sent to <a href="mailto:support@edu-platform.me">support@edu-platform.me</a>.</p>
      </>
    ),
  },
  {
    id: 'information',
    title: 'Information we collect',
    titleAr: 'البيانات التي نجمعها',
    content: (
      <>
        <p>We collect only the information reasonably needed to operate and protect the learning service:</p>
        <ul>
          <li><strong>Account information:</strong> name, email address, profile image, authentication identifier, phone number when supplied, grade level, and account role.</li>
          <li><strong>Learning activity:</strong> enrollments, lesson progress, assignments, submissions, grades, attendance, class participation, feedback, and certificates.</li>
          <li><strong>Support and communications:</strong> messages, support requests, notification preferences, and information a user chooses to share with academy staff.</li>
          <li><strong>Enrollment and payment records:</strong> course, amount, currency, payment status, receipt, and transaction reference. We do not intentionally store full payment-card credentials.</li>
          <li><strong>Security and technical data:</strong> device and browser information, session records, IP-derived security signals, timestamps, and logs used to prevent abuse and diagnose reliability issues.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'google-data',
    title: 'Google sign-in data',
    titleAr: 'بيانات تسجيل الدخول عبر Google',
    content: (
      <>
        <p>When a user chooses Google sign-in, we request basic identity scopes such as <strong>openid</strong>, email address, and profile information. We use that data to authenticate the user, match or create the correct academy account, display the user’s profile, and protect the session.</p>
        <p>We do not use Google account information for advertising, sell it, or permit unrelated third parties to use it for their own marketing. Our handling of information received from Google APIs follows the Google API Services User Data Policy, including its Limited Use requirements.</p>
        <p>You can review or revoke Oqool Academy access from your Google Account permissions. Revocation stops future Google sign-in access but does not automatically erase records we must retain for learning history, security, accounting, or legal obligations.</p>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How we use information',
    titleAr: 'كيف نستخدم البيانات',
    content: (
      <ul>
        <li>Provide authentication, course access, live classes, feedback, progress tracking, support, and completion records.</li>
        <li>Maintain account security, enforce role permissions, detect misuse, and prevent unauthorized concurrent access.</li>
        <li>Process enrollments, payment approvals, receipts, refunds when applicable, and financial audit records.</li>
        <li>Send service, class, security, and account notices. Marketing messages are sent only where permitted and can be declined.</li>
        <li>Improve lesson quality, accessibility, reliability, and the overall student experience using aggregated or appropriately protected information.</li>
        <li>Comply with lawful requests and protect students, families, staff, the academy, and the public.</li>
      </ul>
    ),
  },
  {
    id: 'sharing',
    title: 'When information is shared',
    titleAr: 'متى نشارك البيانات',
    content: (
      <>
        <p>We share personal information only when necessary to deliver the service, follow a user’s direction, or meet a legal obligation. This may include vetted providers that supply authentication, hosting, storage, communications, live-class, analytics, or payment infrastructure.</p>
        <p>Providers receive only the information needed for their function and must handle it under contractual, technical, and legal safeguards. We may also share information with a parent or guardian where the account relationship, student safety, law, or academy service requires it.</p>
        <p>If Oqool Academy is reorganized or transferred, relevant records may move with the service subject to this policy and applicable law. We do not sell personal information.</p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Retention and security',
    titleAr: 'الاحتفاظ بالبيانات وحمايتها',
    content: (
      <>
        <p>We keep information for as long as it is needed to provide the account and courses, preserve academic and financial records, resolve disputes, enforce agreements, meet legal obligations, and maintain platform security. Different records may have different retention periods.</p>
        <p>We use access controls, encrypted transport, protected authentication cookies, role-based permissions, logging, backups, and service-provider safeguards. No internet service can guarantee absolute security, so users should protect their passwords and report suspected account misuse promptly.</p>
      </>
    ),
  },
  {
    id: 'students',
    title: 'Students, children, and guardians',
    titleAr: 'الطلاب وأولياء الأمور',
    content: (
      <>
        <p>Oqool Academy serves school-age learners. A parent or legal guardian should review the service and this policy when local law requires consent for a minor. Guardians should help students provide accurate information and use live classes, messages, and shared resources safely.</p>
        <p>If you believe a child’s information was provided without required authorization, contact us so we can review the account and take appropriate action.</p>
      </>
    ),
  },
  {
    id: 'rights',
    title: 'Your choices and rights',
    titleAr: 'خياراتك وحقوقك',
    content: (
      <>
        <p>Depending on applicable law, users or guardians may request access, correction, deletion, restriction, or a copy of personal information. Some records cannot be deleted immediately when they are needed for academic integrity, financial audit history, fraud prevention, dispute resolution, or legal compliance.</p>
        <p>Send a request from the account email to <a href="mailto:support@edu-platform.me">support@edu-platform.me</a>. We may verify identity and authority before acting on a request.</p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Policy updates and contact',
    titleAr: 'تحديثات السياسة والتواصل',
    content: (
      <>
        <p>We may update this policy when the service, providers, or legal requirements change. The effective date at the top identifies the current version. Material changes may also be announced through the platform or registered contact details.</p>
        <p>Privacy questions and requests: <a href="mailto:support@edu-platform.me">support@edu-platform.me</a>.</p>
      </>
    ),
  },
] as const;

export default function PrivacyPage() {
  return (
    <LegalPageShell
      effectiveDate="August 22, 2026"
      eyebrow="Privacy · Student trust"
      intro={<p>Clear learning begins with clear expectations. This policy describes what information enters Oqool Academy, why it is needed, and the choices available to students and families.</p>}
      sections={sections}
      title="Privacy Policy"
      titleAr="سياسة الخصوصية"
    />
  );
}
