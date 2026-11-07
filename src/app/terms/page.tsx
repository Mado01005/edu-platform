import { siteConfig as brandConfig } from '@/lib/siteConfig';
import type { Metadata } from 'next';
import { ArabicBlock } from '@/components/legal/arabic-block';
import { LegalPageShell, type LegalSection } from '@/components/legal/legal-page-shell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms for free trial sessions, lessons, packages, attendance and cancellation, online lesson guidelines, recordings and payments at Nudrek Learning Hub.',
};

const sections: readonly LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Accepting these terms',
    titleAr: 'الموافقة على الشروط',
    content: (
      <>
        <p>These Terms of Service govern the use of Nudrek Learning Hub websites, accounts, free trial sessions, live lessons, assignments, resources, assessments, packages and support services. By booking a free trial session, enrolling, paying for a package, or using the platform, you agree to these terms and the <a href="/privacy">Privacy Policy</a>.</p>
        <p>If the student is not legally able to accept these terms independently, a parent or legal guardian must review and accept them on the student’s behalf.</p>
      </>
    ),
  },
  {
    id: 'company',
    title: 'Who we are',
    titleAr: 'من نحن',
    content: (
      <>
        <p>Nudrek Learning Hub operates under the registered company name <strong>“{brandConfig.company.legalName.en},”</strong> a limited liability company registered in the Arab Republic of Egypt, with a commercial registration and tax card.</p>
        <ul>
          <li><strong>Commercial Registration No.:</strong> {brandConfig.company.commercialRegistration}</li>
          <li><strong>Tax Registration No.:</strong> {brandConfig.company.taxRegistration}</li>
          <li><strong>Email:</strong> <a href={`mailto:${brandConfig.support.email}`}>{brandConfig.support.email}</a></li>
        </ul>
        <ArabicBlock>
          <p>تعمل نُدرك (Nudrek Learning Hub) تحت اسم «{brandConfig.company.legalName.ar}»، وهي شركة ذات مسؤولية محدودة مسجّلة في جمهورية مصر العربية، ولديها سجل تجاري وبطاقة ضريبية.</p>
          <p>رقم السجل التجاري: {brandConfig.company.commercialRegistration}<br />رقم التسجيل الضريبي: {brandConfig.company.taxRegistration}</p>
        </ArabicBlock>
      </>
    ),
  },
  {
    id: 'getting-started',
    title: 'Getting started and the free trial session',
    titleAr: 'البداية والحصة التجريبية المجانية',
    content: (
      <>
        <p>To begin, send us the student’s grade, curriculum, required subject, learning goal and preferred lesson times. Our academic guidance team works with you to understand the student’s needs, recommends a suitable available teacher and arranges the free trial session. We then help you choose a package and complete enrollment.</p>
        <p>The first trial session is free. It lets the student meet the teacher and experience their teaching and interaction style before subscribing, and gives the teacher a clearer understanding of the student’s learning needs. Subscribing after the trial is your decision.</p>
        <ArabicBlock>
          <p>ابدأ بالتواصل معنا وأرسل بيانات الطالب: الصف الدراسي، والمنهج، والمادة المطلوبة، والهدف من الحصص، والمواعيد المناسبة. يتابع معك فريق الإرشاد الأكاديمي لفهم احتياج الطالب، وترشيح المعلم المتاح المناسب، وتنسيق الحصة التجريبية المجانية، ثم مساعدتك في اختيار الباقة واستكمال الاشتراك.</p>
          <p>أول حصة تجريبية مجانية، ليتعرّف الطالب إلى المعلم ويجرّب طريقة الشرح والتفاعل قبل الاشتراك.</p>
        </ArabicBlock>
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
        <li>Access to lessons, staff tools and administrative functions depends on assigned roles and valid enrollment. Users must not attempt to bypass those controls.</li>
      </ul>
    ),
  },
  {
    id: 'learning',
    title: 'Learning services',
    titleAr: 'الخدمات التعليمية',
    content: (
      <>
        <p>We support students from Grade 1 to Grade 12 across national and international curricula, including American and British programs, subject to teacher availability. Our academic guidance team confirms teacher availability for the student’s grade, subject and curriculum before enrollment.</p>
        <p>Lessons are live and interactive. Teachers share clear feedback after each lesson and students complete a weekly assessment so families can see what has been mastered and what needs another explanation. If progress falls short of expectations, we review the reasons with the teacher and family and adjust support.</p>
        <p>Feedback, assessments, grades and certificates support learning but do not guarantee a particular school, examination, admission, employment or professional result. Students remain responsible for participation, submitted work and external examination requirements.</p>
        <ArabicBlock>
          <p>ندعم الطلاب من الصف الأول إلى الصف الثاني عشر في المناهج الوطنية والدولية، ومنها الأمريكي والبريطاني، بحسب توفر المعلمين. يؤكد فريق الإرشاد الأكاديمي توفر المعلم المناسب للصف والمادة والمنهج قبل الاشتراك.</p>
        </ArabicBlock>
      </>
    ),
  },
  {
    id: 'packages',
    title: 'Packages and flexible hours',
    titleAr: 'الباقات ومرونة الساعات',
    content: (
      <>
        <p>A package is a balance of lesson hours that can be shared across the subjects we offer, according to the student’s needs and academic priorities. For example, a student taking Math with us who has a Science exam can have Science revision arranged from the same package, without buying another one, subject to remaining hours, teacher availability and scheduling.</p>
        <p>Our team helps you choose a suitable number of hours for the student’s goals and schedule. Package details, included hours and any price are those shown or confirmed to you at enrollment.</p>
        <ArabicBlock>
          <p>يمكن استخدام رصيد ساعات الباقة بين المواد المتاحة لدينا، بحسب احتياج الطالب وأولوياته الدراسية. يمكن تنسيق مراجعة مادة أخرى من ساعات باقته نفسها، دون شراء باقة جديدة، بحسب الرصيد المتبقي وتوفر المعلم والمواعيد. ويساعدك الفريق على اختيار عدد الساعات المناسب لهدف الطالب وجدوله.</p>
        </ArabicBlock>
      </>
    ),
  },
  {
    id: 'attendance',
    title: 'Attendance and cancellation policy',
    titleAr: 'سياسة الحضور والإلغاء',
    content: (
      <>
        <ol className="ml-5 list-decimal space-y-3">
          <li><strong>Be ready on time.</strong> Each lesson lasts 60 minutes. Please join five minutes early to check your connection, camera and microphone.</li>
          <li><strong>Late arrival.</strong> If the student joins late, the lesson ends at its original scheduled time. Missed time is not added to the lesson.</li>
          <li><strong>Cancellation or rescheduling.</strong> Please notify the Nudrek team at least 24 hours before the lesson. Replacement lessons are arranged according to availability.</li>
          <li><strong>Absence and late cancellation.</strong> If the student is absent or cancels with less than 24 hours’ notice, and the teacher is present and ready to teach, the lesson is deducted from the package.</li>
          <li><strong>Teacher absence or delay.</strong> If the teacher cannot attend, a replacement lesson is arranged without deducting the missed lesson. Any teaching time lost because of the teacher’s late arrival is made up.</li>
          <li><strong>Technical issues and emergencies.</strong> Notify the team immediately if a technical issue prevents attendance or interrupts the lesson. Management reviews each case to determine an appropriate response. Teaching time lost because of a teacher-side or academy-side technical issue is made up.</li>
          <li><strong>Confirming requests.</strong> Cancellation and rescheduling requests must be sent through Nudrek’s official channels. A new lesson time is confirmed only after the team approves it.</li>
        </ol>
        <ArabicBlock>
          <p><strong>١. الالتزام بالمواعيد.</strong> مدة الحصة ٦٠ دقيقة. يُرجى الاستعداد والدخول قبل الموعد بخمس دقائق للتأكد من عمل الاتصال والكاميرا والميكروفون.</p>
          <p><strong>٢. التأخر عن الحصة.</strong> إذا تأخر الطالب، تنتهي الحصة في موعدها الأصلي، ولا يُضاف وقت التأخير إلى نهايتها.</p>
          <p><strong>٣. الإلغاء أو تغيير الموعد.</strong> يجب إبلاغ فريق نُدرك قبل موعد الحصة بـ٢٤ ساعة على الأقل. وتُنسَّق الحصة البديلة وفق المواعيد المتاحة.</p>
          <p><strong>٤. الغياب والإلغاء المتأخر.</strong> إذا غاب الطالب أو ألغى قبل الموعد بأقل من ٢٤ ساعة، وكان المعلم حاضرًا ومستعدًا للتدريس، تُحتسب الحصة من رصيد الباقة.</p>
          <p><strong>٥. غياب المعلم أو تأخره.</strong> إذا تعذّر حضور المعلم، تُنسَّق حصة بديلة دون خصم الحصة من الرصيد. ويُعوَّض أي وقت تدريس فُقد بسبب تأخر المعلم.</p>
          <p><strong>٦. الأعطال التقنية والظروف الطارئة.</strong> يُرجى إبلاغ الفريق فورًا عند حدوث عطل يمنع الحضور أو الاستمرار. تراجع الإدارة كل حالة لتحديد الإجراء المناسب. وإذا تعذّر تقديم الحصة بسبب عطل من جانب المعلم أو الأكاديمية، يُعوَّض وقت التدريس المفقود.</p>
          <p><strong>٧. تأكيد الطلبات.</strong> تُرسل طلبات الإلغاء وتغيير المواعيد عبر قنوات نُدرك الرسمية، ويُعتمد بالموعد الجديد بعد تأكيده من الفريق.</p>
        </ArabicBlock>
      </>
    ),
  },
  {
    id: 'lesson-guidelines',
    title: 'Online lesson guidelines',
    titleAr: 'ضوابط حضور الحصص',
    content: (
      <>
        <ol className="ml-5 list-decimal space-y-3">
          <li><strong>Camera and visual interaction.</strong> Students and teachers are expected to keep their cameras on, with suitable lighting and their faces clearly visible. Visual interaction, facial expressions and body language support engagement and help the teacher notice understanding or uncertainty. Technical barriers or individual needs requiring an exception should be discussed with the team so suitable arrangements can be made.</li>
          <li><strong>Appropriate clothing.</strong> Students and teachers should wear appropriate, respectful clothing suitable for an educational setting and sit in a position that supports learning.</li>
          <li><strong>A quiet learning space.</strong> Join from a quiet, well-lit space away from television, conversations and distractions. A neutral or blurred background is recommended to protect household privacy.</li>
          <li><strong>Devices and materials.</strong> A computer or tablet with a suitable screen and a stable internet connection is recommended. Students should prepare their books, notebooks, stationery and required files before the lesson.</li>
          <li><strong>Focus and participation.</strong> Students should participate, attempt tasks and ask questions. Games, notifications and unrelated applications should be closed, and phones should not be used for unrelated activities.</li>
          <li><strong>Parent support.</strong> Parents may help with preparation and technical issues while allowing students to answer and attempt tasks independently. Additional support can be agreed according to the student’s age and needs.</li>
          <li><strong>Mutual respect.</strong> Everyone is expected to use respectful language and behave appropriately. Disruptive or inappropriate behavior will receive a reminder and may be referred to management if it continues.</li>
          <li><strong>Privacy and recordings.</strong> Academy recordings support learning and follow-up under the access arrangements explained during enrollment. Independent recording, screenshots, or sharing lesson links and recordings beyond authorized users requires prior approval from management and the people concerned.</li>
          <li><strong>Homework and assessments.</strong> Students should attempt homework and assessments independently. Any assistance should support understanding and allow the teacher to assess the student’s actual learning needs.</li>
        </ol>
        <ArabicBlock>
          <p><strong>١. الكاميرا والتفاعل البصري.</strong> يلتزم الطالب والمعلم بفتح الكاميرا أثناء الحصة، مع إضاءة مناسبة وظهور الوجه بوضوح. يساعد التواصل البصري وتعبيرات الوجه ولغة الجسد على دعم التفاعل وملاحظة الفهم أو التردد وتكييف الشرح. عند وجود عائق تقني أو احتياج فردي يستدعي استثناءً، يُرجى التنسيق مع الفريق لترتيب بديل مناسب.</p>
          <p><strong>٢. الزي المناسب.</strong> يلتزم الطالب والمعلم بملابس مناسبة ومحترمة تتوافق مع بيئة تعليمية، مع الجلوس في وضع مناسب للتعلّم.</p>
          <p><strong>٣. مكان هادئ ومهيأ.</strong> تُحضر الحصة من مكان هادئ، جيد الإضاءة، بعيد عن التلفاز والمحادثات والمشتتات. ويُفضَّل استخدام خلفية محايدة أو خاصية تمويه الخلفية لحماية خصوصية المنزل.</p>
          <p><strong>٤. الجهاز والأدوات.</strong> يُفضَّل استخدام كمبيوتر أو جهاز لوحي بشاشة مناسبة، مع اتصال مستقر بالإنترنت. ويُجهّز الطالب الكتاب والكراسة والأقلام والملفات المطلوبة قبل بداية الحصة.</p>
          <p><strong>٥. التركيز والمشاركة.</strong> يلتزم الطالب بالمشاركة والمحاولة وطرح الأسئلة، مع إغلاق الألعاب والإشعارات والتطبيقات غير المرتبطة بالحصة، وعدم استخدام الهاتف لأغراض أخرى أثناء الشرح.</p>
          <p><strong>٦. دور ولي الأمر.</strong> يساعد ولي الأمر في تجهيز الطالب وحل المشكلات التقنية عند الحاجة، مع إتاحة الفرصة له للإجابة والمحاولة بنفسه. ويمكن الاتفاق على دعم إضافي يناسب عمر الطالب واحتياجاته.</p>
          <p><strong>٧. الاحترام المتبادل.</strong> يلتزم الجميع بلغة محترمة وسلوك مناسب. وعند حدوث إساءة أو سلوك يعطّل التعلّم، يوجّه المعلم تنبيهًا، ويُحال الأمر إلى الإدارة إذا استمر.</p>
          <p><strong>٨. الخصوصية والتسجيل.</strong> تُستخدم تسجيلات الأكاديمية للتعلّم والمتابعة وفق صلاحيات الوصول الموضّحة عند الانضمام. ولا يجوز تسجيل الحصة بشكل مستقل أو تصويرها أو مشاركة رابطها أو تسجيلاتها خارج المستفيدين المصرَّح لهم دون موافقة مسبقة من الإدارة والأطراف المعنية.</p>
          <p><strong>٩. الواجبات والتقييمات.</strong> يلتزم الطالب بمحاولة أداء الواجبات والتقييمات بنفسه. وأي مساعدة يتلقّاها ينبغي أن تدعم فهمه وتسمح للمعلم بتقييم مستواه الحقيقي.</p>
        </ArabicBlock>
      </>
    ),
  },
  {
    id: 'teacher-changes',
    title: 'Teacher changes and learning support',
    titleAr: 'تغيير المعلم ومراجعة التجربة',
    content: (
      <>
        <p>If the student needs a different teaching or communication style after starting, you can request a change of teacher. We listen to your feedback, review the student’s needs and coordinate an alternative, subject to teacher and schedule availability.</p>
        <ArabicBlock>
          <p>إذا احتاج الطالب بعد البداية إلى أسلوب شرح أو تواصل مختلف، يمكن طلب تغيير المعلم. نستمع إلى الملاحظات، ونراجع احتياج الطالب، ثم ننسّق بديلًا وفق المعلمين والمواعيد المتاحة وقت الطلب.</p>
        </ArabicBlock>
      </>
    ),
  },
  {
    id: 'recording',
    title: 'Automatic lesson recording',
    titleAr: 'التسجيل التلقائي للحصص',
    content: (
      <>
        <p>Lesson recording starts automatically as soon as either the student or the teacher joins. This supports student safety and quality monitoring, and allows the recording to be reviewed for revision or to address concerns when needed, while respecting student and teacher privacy. Recordings are available to authorized users only, under the access arrangements explained during enrollment. See the <a href="/privacy">Privacy Policy</a> for how recordings are handled.</p>
        <ArabicBlock>
          <p>يبدأ تسجيل الحصة تلقائيًا فور دخول الطالب أو المعلم، دعمًا لسلامة الطالب وجودة المتابعة، وإتاحة الرجوع إلى التسجيل للمراجعة أو توضيح أي ملاحظات عند الحاجة، مع مراعاة خصوصية الطالب والمعلم.</p>
        </ArabicBlock>
      </>
    ),
  },
  {
    id: 'materials',
    title: 'Lesson materials and license',
    titleAr: 'المحتوى وحقوق الاستخدام',
    content: (
      <>
        <p>Nudrek Learning Hub and its teachers retain their rights in lessons, documents, assignments, graphics, recordings, software and other materials. A valid enrollment gives the registered student a limited, personal, non-transferable right to use those materials for learning during the permitted access period.</p>
        <p>Users may not redistribute, sell, publish, scrape, record, remove protections from, share account access to, or create unauthorized derivative products from academy materials. A download option does not transfer ownership or permit public distribution.</p>
      </>
    ),
  },
  {
    id: 'conduct',
    title: 'Conduct',
    titleAr: 'السلوك',
    content: (
      <ul>
        <li>Treat students, families, teachers and staff respectfully.</li>
        <li>Do not harass, threaten, impersonate, disrupt lessons, submit another person’s work, or share harmful or unlawful material.</li>
        <li>Do not record or publish another participant’s image, voice, messages or work without appropriate permission.</li>
        <li>Follow teacher and management directions that protect learning quality, student safety, privacy and academic integrity.</li>
      </ul>
    ),
  },
  {
    id: 'payments',
    title: 'Enrollment, payments and refunds',
    titleAr: 'الاشتراكات والمدفوعات والاسترداد',
    content: (
      <>
        <p>Prices, currencies, payment methods, installment terms, access periods and included hours are those shown or confirmed at enrollment. Access may remain pending while a manual or online payment is reviewed. Lessons are deducted from the package according to the attendance and cancellation policy above.</p>
        <p>Refund eligibility is determined by the offer, package status, lessons already delivered, applicable consumer law and any written refund terms presented at purchase. Payment questions should be sent promptly with the account email, package, amount, date and available transaction reference.</p>
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
        <li>Probing, bypassing, overloading, reverse engineering or interfering with platform security and availability.</li>
        <li>Using automated tools to extract protected content, personal data or lesson structures without written permission.</li>
        <li>Uploading malware, unsupported executable content, stolen materials or information the user has no right to share.</li>
        <li>Using the service to train, populate or operate a competing content product without written authorization.</li>
      </ul>
    ),
  },
  {
    id: 'availability',
    title: 'Availability and third-party services',
    titleAr: 'توفر الخدمة ومقدمو الخدمات',
    content: (
      <>
        <p>We work to keep the academy reliable, but maintenance, internet conditions, provider incidents, security events and circumstances beyond reasonable control can interrupt access. Technical interruptions on the academy’s side are handled under the attendance and cancellation policy above.</p>
        <p>Features may rely on third-party authentication, hosting, storage, live-lesson, messaging (including WhatsApp) or payment services. Those services may have additional terms and privacy practices. Nudrek Learning Hub is not responsible for a third party’s independent service outside our reasonable control.</p>
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
        <p>Ending access does not erase obligations or records that must survive, including payment balances, academic integrity records, intellectual-property restrictions, dispute evidence and lawful retention duties.</p>
      </>
    ),
  },
  {
    id: 'responsibility',
    title: 'Responsibility and applicable law',
    titleAr: 'المسؤولية والقانون المطبق',
    content: (
      <>
        <p>The service is provided with reasonable professional care. To the extent permitted by law, Nudrek Learning Hub is not liable for indirect or unforeseeable losses, external examination decisions, third-party outages, or losses caused by a user’s device, connection, credentials or unauthorized conduct.</p>
        <p>Nothing in these terms excludes rights or responsibilities that cannot legally be excluded. These terms are governed by the applicable laws of Egypt, without removing mandatory consumer or data-protection rights that apply in a user’s location.</p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes, feedback and contact',
    titleAr: 'التعديلات والملاحظات والتواصل',
    content: (
      <>
        <p>We may update these terms to reflect service, legal, security or operational changes. The effective date identifies the current version. Material changes may be announced through the platform or registered contact details; continued use after the effective date means the updated terms apply where permitted by law.</p>
        <p>We welcome questions, feedback and suggestions at <a href={`mailto:${brandConfig.support.email}`}>{brandConfig.support.email}</a>, or through our Facebook page, Nudrek Learning Hub. Our team follows up on feedback and coordinates with the relevant team to address concerns and improve the experience for students and families.</p>
        <ArabicBlock>
          <p>نسعد بتلقي استفساراتكم وملاحظاتكم واقتراحاتكم عبر البريد الإلكتروني الرسمي: {brandConfig.support.email}، أو عبر صفحتنا على فيسبوك: Nudrek Learning Hub. يتابع فريق نُدرك ملاحظاتكم وينسّق مع الفريق المختص لمعالجتها وتحسين تجربة الطالب والأسرة.</p>
        </ArabicBlock>
      </>
    ),
  },
] as const;

export default function TermsPage() {
  return (
    <LegalPageShell
      effectiveDate="November 7, 2026"
      eyebrow="Terms · Learning covenant"
      intro={<p>These terms protect the learning environment: how the free trial and packages work, attendance and cancellation, lesson guidelines, and what students and families can expect from the academy.</p>}
      sections={sections}
      title="Terms of Service"
      titleAr="شروط الاستخدام"
    />
  );
}
