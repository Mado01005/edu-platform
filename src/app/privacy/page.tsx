import { siteConfig as brandConfig } from '@/lib/siteConfig';
import type { Metadata } from 'next';
import { ArabicBlock } from '@/components/legal/arabic-block';
import { LegalPageShell, type LegalSection } from '@/components/legal/legal-page-shell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Nudrek Learning Hub collects, uses, protects and shares student, parent and account information, including lesson recordings and WhatsApp enquiries.',
};

const sections: readonly LegalSection[] = [
  {
    id: 'scope',
    title: 'Who this policy covers',
    titleAr: 'نطاق سياسة الخصوصية',
    content: (
      <>
        <p>Nudrek Learning Hub provides structured online learning, live interactive lessons, assignments, learning resources, assessments, parent feedback and student-support services. This policy explains how we handle personal information when students, parents, teachers and staff use our websites, WhatsApp enquiry options and learning platform.</p>
        <p>“Nudrek Learning Hub,” “we,” and “our” refer to the academy service operating through <strong>nudrek.com</strong> under the registered company name <strong>{brandConfig.company.legalName.en}</strong>, a limited liability company registered in the Arab Republic of Egypt (Commercial Registration No. {brandConfig.company.commercialRegistration}; Tax Registration No. {brandConfig.company.taxRegistration}). Questions can be sent to <a href={`mailto:${brandConfig.support.email}`}>{brandConfig.support.email}</a>.</p>
        <ArabicBlock>
          <p>تقدّم نُدرك للتعليم المتكامل حصصًا مباشرة تفاعلية وواجبات وتقييمات ومتابعة للأسرة. توضح هذه السياسة كيف نتعامل مع البيانات الشخصية للطلاب وأولياء الأمور والمعلمين عند استخدام موقعنا ومنصتنا وقنوات التواصل. تعمل نُدرك تحت اسم «{brandConfig.company.legalName.ar}»، وهي شركة ذات مسؤولية محدودة مسجّلة في جمهورية مصر العربية.</p>
        </ArabicBlock>
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
          <li><strong>Enquiry and placement details:</strong> the student’s grade, curriculum, required subject, learning goal, preferred lesson times, and the parent’s contact details when you ask about a free trial session.</li>
          <li><strong>Learning activity:</strong> enrollments, package hours, lesson attendance, progress, homework, weekly assessments, teacher feedback, class participation and certificates.</li>
          <li><strong>Lesson recordings:</strong> audio and video of lessons, as described in the next section.</li>
          <li><strong>Support and communications:</strong> messages, support requests, notification preferences, and information a user chooses to share with academy staff.</li>
          <li><strong>Enrollment and payment records:</strong> package, amount, currency, payment status, receipt, and transaction reference. We do not intentionally store full payment-card credentials.</li>
          <li><strong>Security and technical data:</strong> device and browser information, session records, IP-derived security signals, timestamps, and logs used to prevent abuse and diagnose reliability issues.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'recordings',
    title: 'Lesson recordings',
    titleAr: 'تسجيل الحصص',
    content: (
      <>
        <p>Lesson recording starts automatically as soon as either the student or the teacher joins. We record to support student safety and quality monitoring, to let students and parents review a lesson for revision, and to address concerns when needed, while respecting student and teacher privacy.</p>
        <ul>
          <li>Recordings are used for learning and follow-up under the access arrangements explained during enrollment, and are available to authorized users only.</li>
          <li>Independent recording, screenshots, or sharing lesson links and recordings beyond authorized users requires prior approval from management and the people concerned.</li>
          <li>A neutral or blurred background is recommended to protect household privacy during lessons.</li>
          <li>Recordings are kept as long as needed for these purposes, and then handled under the retention rules below.</li>
        </ul>
        <ArabicBlock>
          <p>يبدأ تسجيل الحصة تلقائيًا فور دخول الطالب أو المعلم، دعمًا لسلامة الطالب وجودة المتابعة، وإتاحة الرجوع إلى التسجيل للمراجعة أو توضيح أي ملاحظات عند الحاجة، مع مراعاة خصوصية الطالب والمعلم. تُستخدم التسجيلات للتعلّم والمتابعة وفق صلاحيات الوصول الموضّحة عند الانضمام، ولا يجوز تسجيل الحصة بشكل مستقل أو تصويرها أو مشاركة رابطها أو تسجيلاتها خارج المستفيدين المصرَّح لهم دون موافقة مسبقة من الإدارة والأطراف المعنية.</p>
        </ArabicBlock>
      </>
    ),
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp and enquiries',
    titleAr: 'واتساب والاستفسارات',
    content: (
      <>
        <p>The booking card on our website does not send the student’s details to our servers. It prepares a WhatsApp message containing the grade, curriculum, subject, goal and preferred times you chose. The message is sent only if you choose to send it in WhatsApp, and WhatsApp’s own terms and privacy policy apply to it.</p>
        <p>Our academic guidance team uses the details you send to understand the student’s needs, recommend a suitable available teacher and arrange the free trial session. We also use messages to coordinate cancellations and rescheduling, which must be sent through Nudrek’s official channels.</p>
        <ArabicBlock>
          <p>نموذج الحجز في الموقع لا يرسل بيانات الطالب إلى خوادمنا، بل يجهّز رسالة واتساب تتضمن الصف والمنهج والمادة والهدف والمواعيد التي اخترتها، ولا تُرسل إلا إذا قررت إرسالها عبر واتساب. يستخدم فريق الإرشاد الأكاديمي هذه البيانات لفهم احتياج الطالب وترشيح المعلم المناسب وتنسيق الحصة التجريبية المجانية.</p>
        </ArabicBlock>
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
        <p>You can review or revoke Nudrek Learning Hub access from your Google Account permissions. Revocation stops future Google sign-in access but does not automatically erase records we must retain for learning history, security, accounting, or legal obligations.</p>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How we use information',
    titleAr: 'كيف نستخدم البيانات',
    content: (
      <ul>
        <li>Provide authentication, lesson access, live lessons, feedback to parents after each lesson, weekly assessments, progress tracking, support and completion records.</li>
        <li>Recommend a suitable teacher, arrange free trial sessions, and help families choose and manage package hours.</li>
        <li>Maintain account security, enforce role permissions, detect misuse, and prevent unauthorized concurrent access.</li>
        <li>Process enrollments, payment approvals, receipts, refunds when applicable, package-hour balances and financial audit records.</li>
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
        <p>We share personal information only when necessary to deliver the service, follow a user’s direction, or meet a legal obligation. For example, we share the details of a student’s needs with the teacher recommended for them, and lesson feedback with the student’s parent or guardian. This may include vetted providers that supply authentication, hosting, storage, communications, live-class, analytics, or payment infrastructure.</p>
        <p>Providers receive only the information needed for their function and must handle it under contractual, technical, and legal safeguards. We may also share information with a parent or guardian where the account relationship, student safety, law, or academy service requires it.</p>
        <p>If Nudrek Learning Hub is reorganized or transferred, relevant records may move with the service subject to this policy and applicable law. We do not sell personal information.</p>
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
        <p>Nudrek Learning Hub serves school-age learners from Grade 1 to Grade 12. A parent or legal guardian should review the service and this policy when local law requires consent for a minor. Guardians should help students provide accurate information and use live classes, messages, and shared resources safely.</p>
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
        <p>Send a request from the account email to <a href={`mailto:${brandConfig.support.email}`}>{brandConfig.support.email}</a>. We may verify identity and authority before acting on a request.</p>
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
        <p>Privacy questions and requests: <a href={`mailto:${brandConfig.support.email}`}>{brandConfig.support.email}</a>, or through our Facebook page, Nudrek Learning Hub.</p>
      </>
    ),
  },
] as const;

export default function PrivacyPage() {
  return (
    <LegalPageShell
      effectiveDate="November 7, 2026"
      eyebrow="Privacy · Student trust"
      intro={<p>Clear learning begins with clear expectations. This policy describes what information enters Nudrek Learning Hub, including lesson recordings and WhatsApp enquiries, why it is needed, and the choices available to students and families.</p>}
      sections={sections}
      title="Privacy Policy"
      titleAr="سياسة الخصوصية"
    />
  );
}
