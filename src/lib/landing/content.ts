import type {
  CurriculumId,
  LandingTestimonial,
  LocalizedText,
} from '@/lib/landing/types';
import { siteConfig } from '@/lib/siteConfig';

const text = (en: string, ar: string): LocalizedText => ({ en, ar });

const curriculumLabels = {
  combined: text('National & International Curricula', 'المناهج الوطنية والدولية'),
  national: text('National Curricula', 'المناهج الوطنية'),
  international: text('International Curricula', 'المناهج الدولية'),
} as const;

export const landingContent = {
  navigation: [
    { href: '#how-it-works', label: text('How It Works', 'كيف نعمل') },
    { href: '#curriculum', label: text('Curricula', 'المناهج والمواد') },
    { href: '#free-session', label: text('Free Session', 'الحصة المجانية') },
    { href: '#packages', label: text('Packages', 'الباقات') },
    { href: '#faq', label: text('FAQ', 'الأسئلة الشائعة') },
  ],
  hero: {
    eyebrow: text('Grade 1 to 12 · Gulf countries', 'من الصف الأول إلى الثاني عشر · دول الخليج'),
    title: text(
      'We understand your child first, then match them with the right teacher.',
      'نفهم مستوى ابنك أولًا، ثم نختار له المعلم المناسب.',
    ),
    description: text(
      "Live online lessons with a teacher who fits your child's personality and goals, and clear feedback after every lesson.",
      'حصص أونلاين مباشرة مع معلم يناسب شخصية الطالب وهدفه، ومتابعة واضحة تصلك بعد كل حصة.',
    ),
    qualifier: text(
      `Your first session is free. Your child meets the teacher and tries their style, and you decide with confidence. Grades 1–12 • ${curriculumLabels.combined.en} • ${siteConfig.serviceRegion.en}`,
      `أول حصة تجريبية مجانية: يتعرّف ابنك على المعلم ويجرّب طريقة الشرح، وتقرر أنت بثقة. الصفوف 1–12 • ${curriculumLabels.combined.ar} • ${siteConfig.serviceRegion.ar}`,
    ),
    primary: text('Contact an Education Advisor', 'تواصل مع مستشار تعليمي'),
    secondary: text('See How It Works', 'تعرّف على طريقة العمل'),
  },
  booking: {
    title: text('Tell us about your child. We will set up the start.', 'أخبرنا عن ابنك، ونرتّب لك البداية'),
    description: text('Five details, then a ready WhatsApp message opens.', 'خمس معلومات فقط، ثم تُفتح محادثة واتساب جاهزة.'),
    grade: text('Grade', 'الصف'),
    curriculum: text('Curriculum', 'المنهج'),
    subject: text('Subject', 'المادة'),
    goal: text('Goal', 'الهدف'),
    times: text('Preferred times', 'المواعيد المناسبة'),
    submit: text('Send on WhatsApp', 'أرسل الطلب عبر واتساب'),
    note: text(
      "We confirm teacher availability for your child's grade, subject and curriculum before enrollment.",
      'نؤكد توفر المعلم لصف ابنك ومادته ومنهجه قبل الاشتراك.',
    ),
    curricula: [text('National', 'وطني'), text('American', 'أمريكي'), text('British', 'بريطاني'), text('Other international', 'دولي آخر')],
    goals: [
      text('Build foundations and close gaps', 'تأسيس وسد الفجوات'),
      text('Keep up with schoolwork', 'متابعة المنهج وتقوية الفهم'),
      text('Revise for exams', 'مراجعة قبل الاختبارات'),
      text('Understand homework and solve independently', 'فهم الواجبات وحلّها باستقلالية'),
    ],
    timeOptions: [text('Mornings', 'صباحًا'), text('Afternoons', 'بعد الظهر'), text('Evenings', 'مساءً'), text('Weekends', 'نهاية الأسبوع')],
    subjects: [
      text('Math', 'الرياضيات'), text('Science', 'العلوم'), text('Physics', 'الفيزياء'), text('Chemistry', 'الكيمياء'),
      text('Biology', 'الأحياء'), text('Economics', 'الاقتصاد'), text('Accounting', 'المحاسبة'), text('Business', 'الإدارة'),
      text('Arabic', 'اللغة العربية'), text('English', 'اللغة الإنجليزية'), text('Social Studies', 'الدراسات الاجتماعية'),
    ],
    message: {
      en: 'Hello Nudrek, I would like to book the free first session.',
      ar: 'مرحبًا نُدرك، أود حجز أول حصة مجانية.',
    },
  },
  ticker: [
    text('Live Online Learning', 'تعلم مباشر عبر الإنترنت'),
    text('Free First Session', 'أول حصة مجانية'),
    text('Weekly Assessment', 'تقييم أسبوعي'),
    text('Feedback After Every Lesson', 'ملاحظات بعد كل حصة'),
    curriculumLabels.combined,
  ],
  trust: {
    label: text('What you get from the first lesson', 'ما تحصل عليه من أول حصة'),
    items: [
      text('Live interactive lessons', 'حصص مباشرة تفاعلية'),
      text('Specialist teachers', 'معلمون متخصصون'),
      text('Weekly assessment', 'تقييم أسبوعي'),
      text('Automatic lesson recording', 'تسجيل تلقائي للحصص'),
      text('Change teacher if needed', 'تغيير المعلم عند الحاجة'),
    ],
  },
  story: {
    eyebrow: text('Our Story', 'حكاية نُدرك'),
    title: text(
      'It started with a question every family asks: how do we know learning time is making a difference?',
      'بدأت نُدرك من سؤال يهم كل أسرة: كيف نعرف أن وقت التعلّم يصنع فرقًا؟',
    ),
    paragraphs: [
      text(
        'Behind that question is a student trying, and a family investing time, effort and hope. Yet lessons may continue while a difficulty remains unspoken, or a small learning gap makes each new topic harder. We believed the starting point was understanding: where does the student get stuck, and what approach gives them the confidence to try again?',
        'وراء هذا السؤال طالب يحاول، وأسرة تبذل وقتها وجهدها أملًا في أن تراه يفهم ويتقدّم ويثق بنفسه. لكن قد تتكرر الحصص وتبقى صعوبة لا يعبّر عنها الطالب، أو فجوة صغيرة تجعل كل ما يأتي بعدها أكثر تعقيدًا. آمنّا أن البداية هي الفهم: أين يتوقف الطالب، وأي أسلوب يمنحه الثقة ليسأل ويحاول من جديد؟',
      ),
      text(
        'That is why we chose Nudrek, an Arabic name expressing understanding and awareness. We understand a student’s needs before planning the next step, see an incorrect answer as a chance to explore their thinking, and make progress visible. We hope to see it in meaningful moments: a once-hesitant student raising their hand, explaining an idea in their own words, and beginning to recognize their ability to learn.',
        'ولهذا اخترنا اسم «نُدرك»، ليعبّر عن مسؤولية نبدأ بها كل رحلة: أن نُدرك احتياج الطالب قبل أن نرسم خطوته التالية، وأن نرى في الإجابة الخاطئة فرصة لفهم طريقة تفكيره، وأن نجعل تقدّمه واضحًا. وما نطمح إليه يظهر في تفاصيل حقيقية: طالب يرفع يده بعدما كان يتردد، ويشرح فكرة بكلماته، ويبدأ في رؤية قدرته على التعلّم.',
      ),
    ],
    quote: text(
      'We understand their needs, so they can discover their potential.',
      'نُدرِك احتياجه، ليُدرِك قدراته',
    ),
    vision: {
      label: text('Our Vision', 'رؤيتنا'),
      body: text(
        'To become a leading destination for integrated digital learning in the Arab world, where every learner can access education that fits their needs, builds confidence and abilities, and supports measurable academic progress.',
        'أن تصبح نُدرك وجهة رائدة للتعلّم الرقمي المتكامل في العالم العربي، تتيح لكل طالب تعليمًا يناسبه، وينمّي قدراته وثقته، ويدعم تقدّمًا أكاديميًا قابلًا للقياس.',
      ),
    },
    mission: {
      label: text('Our Mission', 'رسالتنا'),
      body: text(
        'To create a complete learning journey shaped around each student’s personality, needs and pace, bringing together the right teacher, interactive teaching, ongoing assessment, technology and family involvement.',
        'نبني رحلة تعليمية متكاملة تراعي شخصية الطالب واحتياجاته ووتيرة تعلّمه؛ تجمع المعلم المناسب، والتدريس التفاعلي، والتقييم المستمر، والتقنية، ومشاركة الأسرة، لدعم تطوّره خطوة بخطوة.',
      ),
    },
    closing: text(
      'Every learner is unique. Their learning journey should be too.',
      'نؤمن بالفروق الفردية… ولكل طالب رحلة تناسبه.',
    ),
  },
  solution: {
    eyebrow: text('The learning journey', 'رحلة الطالب'),
    title: text('Five clear steps from your first message.', 'خمس خطوات واضحة من أول رسالة.'),
    description: text(
      'We start by listening, then plan, teach, assess and adjust together with you.',
      'نبدأ بالاستماع إليك، ثم نخطط ونعلّم ونقيّم ونعدّل معك.',
    ),
    steps: [
      [text('Understand', 'نفهم'), text('We identify goals, strengths and areas needing support.', 'نحدد الهدف ونقاط القوة والجوانب التي تحتاج إلى دعم.')],
      [text('Plan', 'نخطط'), text('We recommend a teacher and set learning priorities.', 'نرشّح المعلم ونرتب أولويات الشرح والتدريب.')],
      [text('Learn', 'نتعلّم'), text('Interactive live lessons and purposeful homework.', 'حصص مباشرة تفاعلية وواجبات هادفة.')],
      [text('Assess', 'نقيّم'), text('We review understanding through practice and assessments.', 'نراجع الفهم والأداء من خلال التدريب والتقييمات.')],
      [text('Follow up & adjust', 'نتابع ونعدّل'), text('We share feedback with you and adapt the next steps when needed.', 'نشارك الملاحظات معك ونعدّل خطوات التعلّم عند الحاجة.')],
    ],
    conclusion: text(
      'If progress falls short of expectations, we review the reasons with the teacher and family and adjust support.',
      'إذا لم يظهر التحسّن المتوقع، نراجع الأسباب مع المعلم والأسرة ونعدّل الدعم.',
    ),
  },
  features: {
    eyebrow: text('Why Nudrek', 'لماذا نُدرك'),
    title: text('Four things every family cares about.', 'أربعة أشياء تهمّ كل أسرة.'),
    items: [
      {
        id: 'teacher',
        title: text('A teacher who fits your child', 'معلم يناسب طفلك'),
        description: text('We match on subject expertise, teaching style and personality.', 'نراعي التخصص وأسلوب الشرح وشخصية الطالب.'),
        detail: text('If your child needs a different approach later, you can request a change of teacher.', 'وإن احتاج أسلوبًا مختلفًا بعد البداية، يمكنك طلب تغيير المعلم.'),
      },
      {
        id: 'feedback',
        title: text('Feedback after every lesson', 'متابعة بعد كل حصة'),
        description: text('Understanding and participation, homework, strengths, and next steps.', 'فهم الطالب ومشاركته، والواجبات، ونقاط القوة، والخطوة التالية.'),
        detail: text('At the end of each week your child completes an assessment showing what is mastered and what needs another explanation.', 'وفي نهاية كل أسبوع يقدّم الطالب اختبارًا يوضح ما أتقنه وما يحتاج إعادة شرح.'),
      },
      {
        id: 'resources',
        title: text('The lesson ends. Resources stay.', 'الحصة تنتهي، والمصادر تبقى'),
        description: text('Lesson recordings, teaching materials, homework and questions to the teacher.', 'تسجيلات الحصص والمواد التعليمية والواجبات وإرسال الأسئلة للمعلم.'),
        detail: text('Questions can be sent through the platform at any time. Replies follow the agreed communication hours.', 'يمكن إرسال الأسئلة عبر المنصة في أي وقت، ويكون الرد وفق مواعيد التواصل المتفق عليها.'),
      },
      {
        id: 'package',
        title: text('One flexible package of hours', 'باقة ساعات واحدة ومرنة'),
        description: text('Share your package hours across available subjects.', 'وزّع ساعات الباقة بين المواد المتاحة.'),
        detail: text('Needs change during the year. Your hours can follow your child’s academic priorities.', 'تتغير احتياجات الطالب خلال العام، وتتبعها ساعات الباقة حسب أولوياته الدراسية.'),
      },
    ],
  },
  curriculum: {
    eyebrow: text('Curricula & subjects', 'المناهج والمواد'),
    title: text('Grade 1 to Grade 12', 'من الصف الأول إلى الثاني عشر'),
    description: text(
      'We support national and international curricula, including American and British programs, subject to teacher availability. Our academic guidance team confirms the right teacher before enrollment.',
      'ندعم المناهج الوطنية والدولية، ومنها الأمريكي والبريطاني، حسب توفر المعلمين. ويؤكد فريق الإرشاد الأكاديمي توفر المعلم المناسب قبل الاشتراك.',
    ),
    tracksLabel: curriculumLabels.combined,
    gradesLabel: text('Choose a grade', 'اختر الصف'),
    subjectsLabel: text('Available subjects', 'المواد المتاحة'),
  },
  freeSession: {
    eyebrow: text('Your free first session', 'أول حصة مجانية'),
    title: text('Meet the teacher. Decide with confidence.', 'جرّب المعلم… ثم قرّر بثقة.'),
    steps: [
      [text('Send your child’s details', 'أرسل بيانات ابنك'), text('Grade, curriculum, subject, goal and preferred times.', 'الصف والمنهج والمادة والهدف والمواعيد المناسبة.')],
      [text('We listen first', 'نستمع إليك أولًا'), text('Our guidance team understands the need and recommends an available teacher.', 'يفهم فريق الإرشاد احتياج ابنك ويرشّح المعلم المتاح.')],
      [text('The free trial session', 'الحصة التجريبية المجانية'), text('We arrange the time and your child meets the teacher.', 'ننسّق الموعد ويتعرّف ابنك على المعلم.')],
      [text('Choose a package and enroll', 'اختر الباقة وأكمل التسجيل'), text('We help you choose a suitable number of hours.', 'نساعدك في اختيار عدد الساعات المناسب.')],
    ],
    highlight: text('Your first trial session is free.', 'أول حصة تجريبية مجانية.'),
    points: [
      text('Your child experiences the teaching and interaction style before you subscribe.', 'يجرّب ابنك طريقة الشرح والتفاعل قبل الاشتراك.'),
      text('The session helps you judge the fit and gives the teacher a clearer picture of your child’s needs.', 'تساعدك الحصة على تقييم مدى ملاءمة التجربة، وتمنح المعلم صورة أوضح عن احتياج الطالب.'),
    ],
  },
  packages: {
    eyebrow: text('Packages', 'الباقات'),
    title: text('One package of hours, flexible across subjects.', 'باقة ساعات واحدة، ومرونة بين المواد.'),
    exampleTitle: text('Taking Math with us, but facing a Science exam?', 'يدرس الرياضيات معنا ولديه امتحان علوم؟'),
    from: text('Math hours', 'ساعات الرياضيات'),
    to: text('Science revision', 'مراجعة العلوم'),
    exampleBody: text(
      'We can arrange Science revision using the same package, without buying another one, subject to remaining hours, teacher availability and scheduling.',
      'يمكن تنسيق مراجعة العلوم من الباقة نفسها، دون شراء باقة جديدة، حسب الرصيد المتبقي وتوفر المعلم والمواعيد.',
    ),
    sizingTitle: text('Choosing the number of hours', 'اختيار عدد الساعات'),
    sizingBody: text(
      'After the free first session, our team helps you choose a suitable number of hours for your child’s goal and schedule.',
      'بعد الحصة المجانية الأولى، يساعدك الفريق على اختيار عدد الساعات المناسب لهدف ابنك وجدوله.',
    ),
    cta: text('Ask About Packages', 'اسأل عن الباقات'),
  },
  expect: {
    eyebrow: text('What to expect', 'ماذا تتوقع'),
    title: text('Simple rules that protect everyone’s time.', 'قواعد بسيطة تحفظ وقت الجميع.'),
    facts: [
      ['60', text('minutes per lesson. Please join five minutes early.', 'دقيقة لكل حصة، ويُرجى الدخول قبلها بخمس دقائق.')],
      ['24', text('hours’ notice to cancel or reschedule a lesson.', 'ساعة قبل الموعد لإلغاء الحصة أو تغييرها.')],
      ['0', text('deducted if the teacher cannot attend. A replacement lesson is arranged.', 'خصم من رصيدك إذا تعذّر حضور المعلم، وتُنسّق حصة بديلة.')],
      ['REC', text('Automatic recording for safety and revision, respecting privacy.', 'تسجيل تلقائي للحصص لسلامة الطالب ومراجعته، مع احترام الخصوصية.')],
    ],
  },
  faq: {
    eyebrow: text('Questions parents ask first', 'أسئلة يطرحها أولياء الأمور'),
    title: text('Clear answers before you begin.', 'إجابات واضحة قبل أن تبدأ.'),
    items: [
      [text('Is the first session really free?', 'هل أول حصة مجانية فعلًا؟'), text('Yes. The first trial session is free. Your child meets the teacher and tries the teaching style before any subscription.', 'نعم. أول حصة تجريبية مجانية، يتعرّف فيها ابنك على المعلم ويجرّب طريقة الشرح قبل أي اشتراك.')],
      [text('Which curricula and subjects are available?', 'ما المناهج والمواد المتاحة؟'), text('We support Grades 1 to 12 across national and international curricula, including American and British programs, subject to teacher availability. We confirm availability before enrollment.', 'ندعم الصفوف من الأول إلى الثاني عشر في المناهج الوطنية والدولية، ومنها الأمريكي والبريطاني، حسب توفر المعلمين. ونؤكد التوفر قبل الاشتراك.')],
      [text('How will I know my child is progressing?', 'كيف أعرف مستوى تقدم ابني؟'), text('The teacher sends clear feedback after every lesson, and your child takes a weekly assessment showing what is mastered and what needs another explanation.', 'يرسل المعلم ملاحظات واضحة بعد كل حصة، ويقدّم الطالب اختبارًا في نهاية كل أسبوع لقياس ما أتقنه وما يحتاج إعادة شرح.')],
      [text('Can I change the teacher?', 'هل يمكن تغيير المعلم؟'), text('Yes. We listen to your feedback, review your child’s needs and coordinate an alternative, subject to teacher and schedule availability.', 'نعم. نستمع إلى ملاحظاتك ونراجع احتياج الطالب وننسّق بديلًا حسب توفر المعلمين والمواعيد.')],
      [text('Are lessons recorded?', 'هل الحصص مسجّلة؟'), text('Yes. Recording starts automatically when the student or teacher joins, for safety, quality and revision, while respecting student and teacher privacy.', 'نعم، يبدأ التسجيل تلقائيًا عند دخول الطالب أو المعلم، لسلامة الطالب وجودة المتابعة، ويمكن الرجوع إليه للمراجعة، مع احترام خصوصية الطالب والمعلم.')],
      [text('What if my child is absent or cancels late?', 'ماذا لو غاب ابني أو ألغى متأخرًا؟'), text('If the student cancels with less than 24 hours’ notice and the teacher is ready, the lesson is deducted from the package. If the teacher cannot attend, nothing is deducted and a replacement lesson is arranged.', 'إذا كان الإلغاء قبل الموعد بأقل من 24 ساعة وكان المعلم حاضرًا، تُحتسب الحصة من الرصيد. وإذا تعذّر حضور المعلم فلا تُخصم، وتُنسّق حصة بديلة.')],
      [text('How much does it cost?', 'كم تبلغ التكلفة؟'), text('After the free first session, our team helps you choose the number of hours that suits your child’s goal and schedule, and explains the package before you subscribe.', 'بعد الحصة المجانية الأولى، يساعدك الفريق على اختيار عدد الساعات المناسب لهدف ابنك وجدوله، ويشرح لك الباقة قبل أن تشترك.')],
    ],
  },
  finalCta: {
    eyebrow: text('Start with understanding', 'ابدأ بالفهم'),
    title: text('Start with a free session. Decide with confidence.', 'ابدأ بحصة مجانية، وقرّر بثقة.'),
    description: text('Send your child’s details now and our academic guidance team will get in touch.', 'أرسل بيانات ابنك الآن، وسيتواصل معك فريق الإرشاد الأكاديمي.'),
    primary: text('Book Your Free First Session', 'احجز أول حصة مجانية'),
    secondary: text('Ask a Question on WhatsApp', 'اسأل عبر واتساب'),
    note: text('We review your details, recommend a teacher, then schedule your free session.', 'نراجع بياناتك، ونرشّح المعلم المناسب، ثم ننسّق حصتك المجانية.'),
  },
  footer: {
    description: text('Deeper understanding · Greater confidence · Progress we follow together.', 'فهم أعمق · ثقة أكبر · تقدّم نتابعه معًا.'),
    explore: text('Explore', 'استكشف'),
    access: text('Access', 'الدخول'),
    legal: text('Legal', 'قانوني'),
    rights: text('All rights reserved.', 'جميع الحقوق محفوظة.'),
    companyTitle: text('Company registration', 'بيانات الشركة'),
    companyBody: text(
      'Nudrek Learning Hub operates under the registered company name “Nudrek for Training, Qualification and Integrated Education,” a limited liability company registered in the Arab Republic of Egypt.',
      'تعمل نُدرك تحت اسم «ندرك للتدريب والتأهيل والتعليم المتكامل»، وهي شركة ذات مسؤولية محدودة مسجّلة في جمهورية مصر العربية.',
    ),
    commercialRegistration: text('Commercial Registration No.', 'رقم السجل التجاري'),
    taxRegistration: text('Tax Registration No.', 'رقم التسجيل الضريبي'),
  },
} as const;

const arabicSubject = text('Arabic', 'اللغة العربية');
const socialStudiesSubject = text('Social Studies', 'الدراسات الاجتماعية');

export const curriculumAvailability = {
  saudi: {
    id: 'saudi',
    label: curriculumLabels.national,
    grades: [
      { id: 'saudi-1-3', label: text('Grades 1–3', 'الصفوف 1–3'), subjects: [text('Math', 'الرياضيات'), text('Science', 'العلوم'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'saudi-4-6', label: text('Grades 4–6', 'الصفوف 4–6'), subjects: [text('Math', 'الرياضيات'), text('Science', 'العلوم'), text('English', 'اللغة الإنجليزية'), arabicSubject, socialStudiesSubject] },
      { id: 'saudi-7-9', label: text('Grades 7–9', 'الصفوف 7–9'), subjects: [text('Math', 'الرياضيات'), text('Science', 'العلوم'), text('English', 'اللغة الإنجليزية'), arabicSubject, socialStudiesSubject] },
      { id: 'saudi-secondary-1', label: text('1st Secondary', 'الأول الثانوي'), subjects: [text('Math', 'الرياضيات'), text('Physics', 'الفيزياء'), text('Chemistry', 'الكيمياء'), text('Biology', 'الأحياء'), text('Economics', 'الاقتصاد'), text('Accounting', 'المحاسبة'), text('Business', 'الإدارة'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'saudi-secondary-2', label: text('2nd Secondary', 'الثاني الثانوي'), subjects: [text('Math', 'الرياضيات'), text('Physics', 'الفيزياء'), text('Chemistry', 'الكيمياء'), text('Biology', 'الأحياء'), text('Economics', 'الاقتصاد'), text('Accounting', 'المحاسبة'), text('Business', 'الإدارة'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'saudi-secondary-3', label: text('3rd Secondary', 'الثالث الثانوي'), subjects: [text('Math', 'الرياضيات'), text('Physics', 'الفيزياء'), text('Chemistry', 'الكيمياء'), text('Biology', 'الأحياء'), text('Economics', 'الاقتصاد'), text('Accounting', 'المحاسبة'), text('Business', 'الإدارة'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
    ],
  },
  american: {
    id: 'american',
    label: curriculumLabels.international,
    grades: [
      { id: 'american-1-3', label: text('Grades 1–3', 'الصفوف 1–3'), subjects: [text('Math', 'الرياضيات'), text('Science', 'العلوم'), text('English', 'اللغة الإنجليزية'), arabicSubject, socialStudiesSubject] },
      { id: 'american-4-6', label: text('Grades 4–6', 'الصفوف 4–6'), subjects: [text('Math', 'الرياضيات'), text('Science', 'العلوم'), text('English', 'اللغة الإنجليزية'), arabicSubject, socialStudiesSubject] },
      { id: 'american-7-9', label: text('Grades 7–9', 'الصفوف 7–9'), subjects: [text('Math', 'الرياضيات'), text('Science', 'العلوم'), text('English', 'اللغة الإنجليزية'), arabicSubject, socialStudiesSubject] },
      { id: 'american-10', label: text('Grade 10', 'الصف العاشر'), subjects: [text('Math', 'الرياضيات'), text('Physics', 'الفيزياء'), text('Chemistry', 'الكيمياء'), text('Biology', 'الأحياء'), text('Economics', 'الاقتصاد'), text('Accounting', 'المحاسبة'), text('Business', 'الإدارة'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'american-11', label: text('Grade 11', 'الصف الحادي عشر'), subjects: [text('Math', 'الرياضيات'), text('Physics', 'الفيزياء'), text('Chemistry', 'الكيمياء'), text('Biology', 'الأحياء'), text('Economics', 'الاقتصاد'), text('Accounting', 'المحاسبة'), text('Business', 'الإدارة'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'american-12', label: text('Grade 12', 'الصف الثاني عشر'), subjects: [text('Math', 'الرياضيات'), text('Physics', 'الفيزياء'), text('Chemistry', 'الكيمياء'), text('Biology', 'الأحياء'), text('Economics', 'الاقتصاد'), text('Accounting', 'المحاسبة'), text('Business', 'الإدارة'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
    ],
  },
} as const satisfies Record<CurriculumId, { id: CurriculumId; label: LocalizedText; grades: readonly { id: string; label: LocalizedText; subjects: readonly LocalizedText[] }[] }>;

export const verifiedTestimonials: readonly LandingTestimonial[] = [];
