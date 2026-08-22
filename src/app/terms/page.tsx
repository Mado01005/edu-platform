import type { Metadata } from 'next';
import { LegalPageShell, type LegalSection } from '@/components/legal/legal-page-shell';

export const metadata: Metadata = {
  title: 'Terms of Service | Oqool Academy',
  description: 'The terms governing accounts, learning services, course materials, payments, and conduct at Oqool Academy.',
};

const sections: readonly LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Accepting these terms',
    titleAr: 'الموافقة على الشروط',
    content: (
      <>
        <p>These Terms of Service govern access to Oqool Academy websites, accounts, courses, live classes, assignments, resources, certificates, and support services. By creating an account, enrolling, paying for a course, or using the platform, you agree to these terms and the <a href="/privacy">Privacy Policy</a>.</p>
        <p>If the learner is not legally able to accept these terms independently, a parent or legal guardian must review and accept them on the learner’s behalf.</p>
      </>
    ),
  },
  {
    id: 'accounts',
    title: 'Accounts and access',
    titleAr: 'الحسابات وصلاحية الوصول',
    content: (
      <ul>
        <li>Provide accurate registration information and keep it reasonably current.</li>
        <li>Keep sign-in credentials and verification codes private. Each account is intended for its registered user unless the academy explicitly permits guardian access.</li>
        <li>Notify us promptly about suspected unauthorized access. We may end other active sessions or require identity verification to protect the account.</li>
        <li>Course access, staff tools, and administrative functions depend on assigned roles and valid enrollment. Users must not attempt to bypass those controls.</li>
      </ul>
    ),
  },
  {
    id: 'learning',
    title: 'Learning services',
    titleAr: 'الخدمات التعليمية',
    content: (
      <>
        <p>Course descriptions, schedules, instructors, resources, assessments, and completion requirements may change when academically or operationally necessary. We aim to provide reasonable notice for material changes.</p>
        <p>Progress indicators, feedback, grades, certificates, and predicted outcomes support learning but do not guarantee a particular school, examination, admission, employment, or professional result. Students remain responsible for participation, submitted work, and external examination requirements.</p>
      </>
    ),
  },
  {
    id: 'materials',
    title: 'Course materials and license',
    titleAr: 'المحتوى وحقوق الاستخدام',
    content: (
      <>
        <p>Oqool Academy and its instructors retain their rights in videos, lessons, documents, assignments, graphics, recordings, software, and other materials. A valid enrollment gives the registered student a limited, personal, non-transferable right to use those materials for learning during the permitted access period.</p>
        <p>Users may not redistribute, sell, publish, scrape, record, remove protections from, share account access to, or create unauthorized derivative products from academy materials. A download option does not transfer ownership or permit public distribution.</p>
      </>
    ),
  },
  {
    id: 'conduct',
    title: 'Live classes and community conduct',
    titleAr: 'السلوك في الحصص والمجتمع التعليمي',
    content: (
      <ul>
        <li>Treat students, families, instructors, and support staff respectfully.</li>
        <li>Do not harass, threaten, impersonate, disrupt classes, submit another person’s work, or share harmful or unlawful material.</li>
        <li>Do not record or publish another participant’s image, voice, messages, or work without appropriate permission.</li>
        <li>Follow instructor directions that protect learning quality, student safety, privacy, and academic integrity.</li>
      </ul>
    ),
  },
  {
    id: 'payments',
    title: 'Enrollment, payments, and refunds',
    titleAr: 'الاشتراكات والمدفوعات والاسترداد',
    content: (
      <>
        <p>Prices, currencies, payment methods, installment terms, access periods, and included materials are those shown or confirmed at enrollment. Access may remain pending while a manual or online payment is reviewed.</p>
        <p>Refund eligibility is determined by the offer, course status, consumed services, applicable consumer law, and any written refund terms presented at purchase. Payment disputes should be sent promptly with the account email, course, amount, date, and available transaction reference.</p>
        <p>Users must not submit false payment evidence, reverse a legitimate charge fraudulently, or use a payment method without authorization.</p>
      </>
    ),
  },
  {
    id: 'prohibited',
    title: 'Prohibited use',
    titleAr: 'الاستخدام غير المسموح',
    content: (
      <ul>
        <li>Breaking laws, infringing rights, or compromising another person’s privacy or safety.</li>
        <li>Probing, bypassing, overloading, reverse engineering, or interfering with platform security and availability.</li>
        <li>Using automated tools to extract protected content, personal data, or course structures without written permission.</li>
        <li>Uploading malware, unsupported executable content, stolen materials, or information the user has no right to share.</li>
        <li>Using the service to train, populate, or operate a competing content product without written authorization.</li>
      </ul>
    ),
  },
  {
    id: 'availability',
    title: 'Availability and third-party services',
    titleAr: 'توفر الخدمة ومقدمو الخدمات',
    content: (
      <>
        <p>We work to keep the academy reliable, but maintenance, internet conditions, provider incidents, security events, and circumstances beyond reasonable control can interrupt access. We may change or replace infrastructure while preserving active learning access where reasonably possible.</p>
        <p>Features may rely on third-party authentication, hosting, storage, live-class, communication, or payment services. Those services may have additional terms and privacy practices. Oqool Academy is not responsible for a third party’s independent service outside our reasonable control.</p>
      </>
    ),
  },
  {
    id: 'suspension',
    title: 'Suspension and termination',
    titleAr: 'إيقاف أو إنهاء الحساب',
    content: (
      <>
        <p>We may restrict or suspend access when reasonably necessary to investigate security risks, payment fraud, material misconduct, repeated policy violations, unlawful activity, or threats to students and staff. Where appropriate, we will provide notice and an opportunity to resolve the issue.</p>
        <p>Ending access does not erase obligations or records that must survive, including payment balances, academic integrity records, intellectual-property restrictions, dispute evidence, and lawful retention duties.</p>
      </>
    ),
  },
  {
    id: 'responsibility',
    title: 'Responsibility and applicable law',
    titleAr: 'المسؤولية والقانون المطبق',
    content: (
      <>
        <p>The service is provided with reasonable professional care. To the extent permitted by law, Oqool Academy is not liable for indirect or unforeseeable losses, external examination decisions, third-party outages, or losses caused by a user’s device, connection, credentials, or unauthorized conduct.</p>
        <p>Nothing in these terms excludes rights or responsibilities that cannot legally be excluded. These terms are governed by the applicable laws of Egypt, without removing mandatory consumer or data-protection rights that apply in a user’s location.</p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes and contact',
    titleAr: 'التعديلات والتواصل',
    content: (
      <>
        <p>We may update these terms to reflect service, legal, security, or operational changes. The effective date identifies the current version. Material changes may be announced through the platform or registered contact details; continued use after the effective date means the updated terms apply where permitted by law.</p>
        <p>Questions, payment disputes, and account notices can be sent to <a href="mailto:support@edu-platform.me">support@edu-platform.me</a>.</p>
      </>
    ),
  },
] as const;

export default function TermsPage() {
  return (
    <LegalPageShell
      effectiveDate="August 22, 2026"
      eyebrow="Terms · Learning covenant"
      intro={<p>These terms protect the learning environment: who may use an account, how course materials can be used, and what students and families can expect from the academy.</p>}
      sections={sections}
      title="Terms of Service"
      titleAr="شروط الاستخدام"
    />
  );
}
