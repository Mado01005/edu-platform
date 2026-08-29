import type {
  CurriculumId,
  LandingTestimonial,
  LocalizedText,
} from '@/lib/landing/types';

const text = (en: string, ar: string): LocalizedText => ({ en, ar });

const curriculumLabels = {
  combined: text('National & International Curricula', 'المناهج الوطنية والدولية'),
  national: text('National Curriculum', 'المنهج الوطني'),
  international: text('International Curriculum', 'المنهج الدولي'),
} as const;

export const landingContent = {
  navigation: [
    { href: '#how-it-works', label: text('How It Works', 'كيف نعمل') },
    { href: '#programs', label: text('Programs', 'البرامج') },
    { href: '#curriculum', label: text('Curriculum', 'المناهج') },
    { href: '#progress', label: text('Progress', 'متابعة التقدم') },
    { href: '#faq', label: text('FAQ', 'الأسئلة الشائعة') },
  ],
  hero: {
    eyebrow: text('Managed learning for Grades 1–12', 'تعلم مُدار للصفوف من الأول إلى الثاني عشر'),
    title: text(
      'More Than Tutoring. A Learning Journey Built Around Your Child.',
      'أكثر من مجرد دروس خصوصية… رحلة تعلم متكاملة مصممة حول احتياجات ابنك.',
    ),
    description: text(
      "Oqool identifies your child's learning gaps, creates a personalized learning plan, connects them with the right teacher, and continuously tracks their academic progress.",
      'نحدد الفجوات التعليمية، ونبني خطة تعلم مخصصة، ونختار المعلم المناسب، ثم نتابع التقدم الأكاديمي باستمرار.',
    ),
    qualifier: text(
      `Grades 1–12 • ${curriculumLabels.combined.en} • Live Online Classes • KSA & UAE`,
      `الصفوف 1–12 • ${curriculumLabels.combined.ar} • حصص مباشرة عبر الإنترنت • السعودية والإمارات`,
    ),
    primary: text('Book Your FREE Diagnostic Assessment', 'احجز التقييم التشخيصي المجاني'),
    secondary: text('Try Your First Lesson FREE', 'جرّب الحصة الأولى مجانًا'),
    tertiary: text('Explore Curriculum', 'استكشف المناهج'),
  },
  ticker: [
    text('Live Online Learning', 'تعلم مباشر عبر الإنترنت'),
    text('Free Diagnostic Assessment', 'تقييم تشخيصي مجاني'),
    text('Personalized Learning Plans', 'خطط تعلم مخصصة'),
    text('Parent Progress Visibility', 'متابعة واضحة لولي الأمر'),
    curriculumLabels.combined,
  ],
  trust: {
    label: text('Built on a clearer academic process', 'منهج أكاديمي واضح من البداية'),
    items: [
      text('Diagnostic-First Approach', 'نبدأ بالتقييم التشخيصي'),
      text('Teacher Selection & Academic Evaluation', 'اختيار المعلم وتقييمه أكاديميًا'),
      text('Personalized Learning Plans', 'خطط تعلم مخصصة'),
      text('Parent Progress Visibility', 'رؤية واضحة لتقدم الطالب'),
      curriculumLabels.combined,
      text('KSA + UAE', 'السعودية والإمارات'),
    ],
  },
  problem: {
    eyebrow: text('The real learning challenge', 'التحدي الحقيقي في التعلم'),
    title: text('More Lessons Don’t Always Mean More Progress.', 'المزيد من الحصص لا يعني دائمًا تقدمًا أكبر.'),
    description: text(
      'A student can attend tutoring every week and still struggle when nobody has identified the actual cause.',
      'قد يحضر الطالب حصصًا أسبوعية ويستمر في المعاناة إذا لم يحدد أحد السبب الحقيقي وراء التعثر.',
    ),
    items: [
      {
        title: text('More Lessons. Same Gap.', 'حصص أكثر… والفجوة كما هي.'),
        description: text(
          'Tutoring hours alone cannot solve a learning gap that has never been properly identified.',
          'ساعات التدريس وحدها لا تعالج فجوة تعليمية لم تُحدَّد بدقة من الأساس.',
        ),
      },
      {
        title: text('One Plan Doesn’t Fit Every Student.', 'خطة واحدة لا تناسب كل طالب.'),
        description: text(
          'Students learn at different levels, speeds, and starting points. Generic tutoring treats the lesson instead of the learner.',
          'يختلف الطلاب في مستوياتهم وسرعة تعلمهم ونقطة البداية؛ بينما تعالج الدروس العامة المحتوى لا احتياج الطالب.',
        ),
      },
      {
        title: text('Parents Are Left Guessing.', 'ولي الأمر لا يرى الصورة كاملة.'),
        description: text(
          'Without clear assessment and progress tracking, families may invest for months without knowing whether meaningful progress is happening.',
          'من دون تقييم واضح ومتابعة للتقدم، قد تستمر الأسرة في الحصص لأشهر من دون معرفة ما إذا كان هناك تحسن حقيقي.',
        ),
      },
    ],
    bridge: text(
      'The question is not only how much tutoring a student receives. It is whether the tutoring addresses the real gap.',
      'السؤال ليس كم حصة يحصل عليها الطالب، بل هل تعالج هذه الحصص الفجوة الحقيقية؟',
    ),
  },
  solution: {
    eyebrow: text('The Oqool managed-learning framework', 'منهج عقول لإدارة رحلة التعلم'),
    title: text('That’s Why Oqool Starts With Understanding.', 'لهذا تبدأ عقول بالفهم أولًا.'),
    description: text(
      'We don’t just teach lessons. We identify gaps, build a learning plan, and continuously measure progress.',
      'لا نكتفي بتقديم الحصص؛ نحدد الفجوات، ونبني خطة واضحة، ونقيس التقدم باستمرار.',
    ),
    steps: [
      [text('Diagnose', 'نشخّص'), text('Identify strengths and learning gaps.', 'نحدد نقاط القوة والفجوات التعليمية.')],
      [text('Plan', 'نخطط'), text('Build a personalized academic path.', 'نبني مسارًا أكاديميًا مخصصًا.')],
      [text('Match', 'نختار'), text('Connect the student with an appropriate teacher.', 'نختار المعلم الأنسب لاحتياج الطالب.')],
      [text('Teach', 'نعلّم'), text('Deliver live, interactive learning.', 'نقدم تعلمًا مباشرًا وتفاعليًا.')],
      [text('Assess', 'نقيّم'), text('Test understanding through practice and assessment.', 'نقيس الفهم عبر التدريب والتقييم.')],
      [text('Measure', 'نقيس'), text('Track academic movement over time.', 'نتابع التحسن الأكاديمي مع الوقت.')],
      [text('Report', 'نشارك'), text('Keep parents clearly informed.', 'نضع ولي الأمر في صورة التقدم.')],
      [text('Intervene', 'نتدخل'), text('Adjust the approach when progress needs support.', 'نعدّل النهج عندما يحتاج التقدم إلى دعم إضافي.')],
    ],
    conclusion: text('Because teaching a lesson is only one part of learning.', 'لأن تقديم الحصة ليس إلا جزءًا واحدًا من رحلة التعلم.'),
  },
  features: {
    eyebrow: text('A complete learning experience', 'تجربة تعلم متكاملة'),
    title: text('Every part of the journey works toward progress.', 'كل جزء في الرحلة يعمل من أجل تقدم واضح.'),
    items: [
      {
        id: 'diagnostic',
        title: text('Diagnostic Intelligence', 'فهم تشخيصي دقيق'),
        description: text('Start with what your child actually needs.', 'ابدأ من احتياج ابنك الحقيقي.'),
        detail: text('A clear baseline guides the learning recommendation.', 'خط أساس واضح يوجّه التوصية التعليمية.'),
      },
      {
        id: 'assessment',
        title: text('Assessment & Practice', 'التقييم والتدريب'),
        description: text('Turn lessons into measurable understanding.', 'حوّل الحصص إلى فهم يمكن قياسه.'),
        detail: text('Academic notation stays clear across structured practice.', 'تظهر الرموز والمعادلات الأكاديمية بوضوح أثناء التدريب المنظم.'),
      },
      {
        id: 'resources',
        title: text('Learning Resources', 'مصادر التعلم'),
        description: text('Keep important materials organized around the student’s journey.', 'نظّم المواد المهمة حول رحلة الطالب.'),
        detail: text('Lessons and resources support the plan instead of becoming a disconnected library.', 'تخدم الدروس والمواد الخطة بدل أن تتحول إلى مكتبة منفصلة.'),
      },
      {
        id: 'devices',
        title: text('Learn Across Devices', 'تعلم عبر أجهزتك'),
        description: text('A responsive experience for the devices families already use.', 'تجربة متجاوبة مع الأجهزة التي تستخدمها الأسرة يوميًا.'),
        detail: text('Move comfortably between phone, tablet, and computer.', 'انتقل بسهولة بين الهاتف والجهاز اللوحي والكمبيوتر.'),
      },
      {
        id: 'parents',
        title: text('Parent Progress Visibility', 'رؤية واضحة لولي الأمر'),
        description: text('See the learning journey, not just the lesson schedule.', 'تابع رحلة التعلم، لا جدول الحصص فقط.'),
        detail: text('Attendance, practice, assessment, feedback, and next steps belong in one clear story.', 'الحضور والتدريب والتقييم والملاحظات والخطوات التالية في صورة واحدة واضحة.'),
      },
      {
        id: 'live',
        title: text('Live Interactive Teaching', 'تعليم مباشر وتفاعلي'),
        description: text('Real teachers. Real-time interaction. Structured follow-up.', 'معلمون حقيقيون، تفاعل مباشر، ومتابعة منظمة.'),
        detail: text('The teacher delivers the lesson inside a wider academic plan.', 'يقدم المعلم الحصة ضمن خطة أكاديمية أوسع.'),
      },
    ],
  },
  howItWorks: {
    eyebrow: text('Three clear steps', 'ثلاث خطوات واضحة'),
    title: text('From uncertainty to a learning plan built for your child.', 'من الحيرة إلى خطة تعلم مصممة لابنك.'),
    steps: [
      {
        label: text('Assess', 'التقييم'),
        title: text('Discover the Gap', 'اكتشف الفجوة'),
        description: text('Start with a free diagnostic assessment to identify strengths and areas that need support.', 'ابدأ بتقييم تشخيصي مجاني يحدد نقاط القوة والجوانب التي تحتاج إلى دعم.'),
      },
      {
        label: text('Plan & Match', 'التخطيط والاختيار'),
        title: text('Build the Right Path', 'ابنِ المسار المناسب'),
        description: text('Oqool creates a learning recommendation and matches the student with the appropriate teacher and format.', 'تبني عقول توصية تعليمية وتختار للطالب المعلم ونمط التعلم الأنسب.'),
      },
      {
        label: text('Learn & Measure', 'التعلم والقياس'),
        title: text('Teach. Assess. Improve.', 'تعلّم، قيّم، وتقدّم.'),
        description: text('Students learn through live instruction while Oqool tracks progress and keeps parents informed.', 'يتعلم الطالب في حصص مباشرة بينما تتابع عقول التقدم وتبقي ولي الأمر على اطلاع.'),
      },
    ],
    cta: text('Start With a Free Assessment', 'ابدأ بتقييم مجاني'),
  },
  curriculum: {
    eyebrow: text('Curriculum & grade explorer', 'استكشف المنهج والصف الدراسي'),
    title: text('Find the right academic starting point.', 'اعثر على نقطة البداية الأكاديمية المناسبة.'),
    description: text('Explore representative learning areas across every grade. Arabic is available across both National and International curricula.', 'استكشف مجالات التعلم الرئيسية في كل صف. اللغة العربية متاحة في المنهجين الوطني والدولي.'),
    tracksLabel: curriculumLabels.combined,
    gradesLabel: text('Choose a grade', 'اختر الصف'),
    subjectsLabel: text('Learning focus', 'مجالات التعلم'),
  },
  outcomes: {
    eyebrow: text('Progress you can see', 'تقدم يمكنك رؤيته'),
    title: text('Know How Your Child Is Really Progressing.', 'اعرف كيف يتقدم ابنك فعليًا.'),
    description: text('When verified family stories are available with consent, they can appear here. Until then, Oqool shows exactly how progress is measured—without fabricated testimonials.', 'عندما تتوفر قصص موثقة بموافقة أصحابها يمكن عرضها هنا. وحتى ذلك الحين، نوضح كيف تقيس عقول التقدم من دون شهادات مصطنعة.'),
    sampleLabel: text('Sample Parent Progress View', 'نموذج توضيحي لمتابعة ولي الأمر'),
    sequence: [
      text('Baseline Assessment', 'التقييم المبدئي'),
      text('Learning Plan', 'خطة التعلم'),
      text('Teaching & Practice', 'التدريس والتدريب'),
      text('Reassessment', 'إعادة التقييم'),
      text('Parent Progress Update', 'تحديث ولي الأمر'),
    ],
    teacherTitle: text('The Right Teacher Matters. So We Don’t Leave Teacher Quality to Chance.', 'المعلم المناسب يصنع فرقًا؛ لذلك لا نترك جودة الاختيار للصدفة.'),
    teacherDescription: text('Selection → Academic Evaluation → Demo Lesson → Training → Probation → Performance Monitoring → Student Progress Review → Continuous Improvement', 'الاختيار ← التقييم الأكاديمي ← حصة تجريبية ← التدريب ← فترة التجربة ← متابعة الأداء ← مراجعة تقدم الطالب ← التحسين المستمر'),
    intervention: text('If expected progress is not happening, Oqool reviews the situation and adjusts the learning approach.', 'إذا لم يتحقق التقدم المتوقع، تراجع عقول الحالة وتعدّل النهج التعليمي.'),
  },
  pricing: {
    title: text('Every Student’s Learning Needs Are Different.', 'احتياجات التعلم تختلف من طالب لآخر.'),
    description: text('After the diagnostic assessment, our academic team recommends the learning option most suitable for your child.', 'بعد التقييم التشخيصي، يوصي فريقنا الأكاديمي بخيار التعلم الأنسب لاحتياجات ابنك.'),
    cta: text('Get My Recommendation', 'احصل على توصية مناسبة'),
  },
  faq: {
    eyebrow: text('Questions parents ask first', 'أسئلة يطرحها أولياء الأمور'),
    title: text('Clear answers before you begin.', 'إجابات واضحة قبل أن تبدأ.'),
    items: [
      [text('What is the free diagnostic assessment?', 'ما هو التقييم التشخيصي المجاني؟'), text('It is the first step in understanding the student’s current level, strengths, and learning gaps. Oqool uses it to guide the academic recommendation instead of starting with a generic package.', 'هو الخطوة الأولى لفهم مستوى الطالب الحالي ونقاط قوته والفجوات التعليمية. تستخدم عقول النتيجة لتوجيه التوصية الأكاديمية بدل البدء بباقة عامة.')],
      [text('Is the first lesson really free?', 'هل الحصة الأولى مجانية فعلًا؟'), text('Yes. After the initial assessment and teacher matching process, eligible new students can experience their first Oqool lesson before moving into the recommended learning plan.', 'نعم. بعد التقييم الأولي واختيار المعلم، يمكن للطلاب الجدد المؤهلين تجربة أول حصة في عقول قبل الانتقال إلى خطة التعلم الموصى بها.')],
      [text('How much does Oqool cost?', 'كم تبلغ تكلفة الدراسة في عقول؟'), text('Oqool offers different learning formats based on academic needs, curriculum, subject, and preferred format. After diagnosis, the academic advisor recommends the most suitable option and explains the available packages.', 'تقدم عقول أنماطًا مختلفة بحسب الاحتياج الأكاديمي والمنهج والمادة ونمط التعلم. بعد التشخيص، يوصي المستشار الأكاديمي بالخيار الأنسب ويشرح الباقات المتاحة.')],
      [text('How will I know whether my child is progressing?', 'كيف أعرف أن ابني يحقق تقدمًا؟'), text('Oqool combines live teaching with assessment and progress monitoring to give parents clear visibility into strengths, support needs, academic movement, and recommended next steps.', 'تجمع عقول بين التدريس المباشر والتقييم والمتابعة لتمنح ولي الأمر رؤية واضحة لنقاط القوة والاحتياجات والتقدم والخطوات التالية.')],
    ],
  },
  finalCta: {
    eyebrow: text('Start with understanding', 'ابدأ بالفهم'),
    title: text('Your Child’s Next Step Starts With Understanding Where They Are Today.', 'خطوة ابنك التالية تبدأ بفهم مستواه اليوم.'),
    description: text('Start with a free diagnostic assessment and discover the learning support your child actually needs.', 'ابدأ بتقييم تشخيصي مجاني واكتشف الدعم التعليمي الذي يحتاجه ابنك فعلًا.'),
    primary: text('Book Your FREE Diagnostic Assessment', 'احجز التقييم التشخيصي المجاني'),
    secondary: text('Try Your First Lesson FREE', 'جرّب الحصة الأولى مجانًا'),
    note: text('No commitment required.', 'من دون أي التزام.'),
  },
  footer: {
    description: text('More than online tutoring: a managed learning journey built around every student.', 'أكثر من دروس عبر الإنترنت: رحلة تعلم مُدارة ومصممة حول كل طالب.'),
    explore: text('Explore', 'استكشف'),
    access: text('Access', 'الدخول'),
    legal: text('Legal', 'قانوني'),
    rights: text('All rights reserved.', 'جميع الحقوق محفوظة.'),
  },
} as const;

const arabicSubject = text('Arabic', 'اللغة العربية');

export const curriculumAvailability = {
  saudi: {
    id: 'saudi',
    label: curriculumLabels.national,
    grades: [
      { id: 'saudi-1-3', label: text('Grades 1–3', 'الصفوف 1–3'), subjects: [text('Math', 'الرياضيات'), text('Science', 'العلوم'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'saudi-4-6', label: text('Grades 4–6', 'الصفوف 4–6'), subjects: [text('Math', 'الرياضيات'), text('Science', 'العلوم'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'saudi-7-9', label: text('Grades 7–9', 'الصفوف 7–9'), subjects: [text('Math', 'الرياضيات'), text('Science', 'العلوم'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'saudi-secondary-1', label: text('1st Secondary', 'الأول الثانوي'), subjects: [text('Math', 'الرياضيات'), text('Physics', 'الفيزياء'), text('Chemistry', 'الكيمياء'), text('Biology', 'الأحياء'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'saudi-secondary-2', label: text('2nd Secondary', 'الثاني الثانوي'), subjects: [text('Math', 'الرياضيات'), text('Physics', 'الفيزياء'), text('Chemistry', 'الكيمياء'), text('Biology', 'الأحياء'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'saudi-secondary-3', label: text('3rd Secondary', 'الثالث الثانوي'), subjects: [text('Math', 'الرياضيات'), text('Physics', 'الفيزياء'), text('Chemistry', 'الكيمياء'), text('Biology', 'الأحياء'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
    ],
  },
  american: {
    id: 'american',
    label: curriculumLabels.international,
    grades: [
      { id: 'american-1-3', label: text('Grades 1–3', 'الصفوف 1–3'), subjects: [text('Math', 'الرياضيات'), text('Science', 'العلوم'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'american-4-6', label: text('Grades 4–6', 'الصفوف 4–6'), subjects: [text('Math', 'الرياضيات'), text('Science', 'العلوم'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'american-7-9', label: text('Grades 7–9', 'الصفوف 7–9'), subjects: [text('Math', 'الرياضيات'), text('Science', 'العلوم'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'american-10', label: text('Grade 10', 'الصف العاشر'), subjects: [text('Math', 'الرياضيات'), text('Physics', 'الفيزياء'), text('Chemistry', 'الكيمياء'), text('Biology', 'الأحياء'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'american-11', label: text('Grade 11', 'الصف الحادي عشر'), subjects: [text('Math', 'الرياضيات'), text('Physics', 'الفيزياء'), text('Chemistry', 'الكيمياء'), text('Biology', 'الأحياء'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
      { id: 'american-12', label: text('Grade 12', 'الصف الثاني عشر'), subjects: [text('Math', 'الرياضيات'), text('Physics', 'الفيزياء'), text('Chemistry', 'الكيمياء'), text('Biology', 'الأحياء'), text('English', 'اللغة الإنجليزية'), arabicSubject] },
    ],
  },
} as const satisfies Record<CurriculumId, { id: CurriculumId; label: LocalizedText; grades: readonly { id: string; label: LocalizedText; subjects: readonly LocalizedText[] }[] }>;

export const verifiedTestimonials: readonly LandingTestimonial[] = [];
