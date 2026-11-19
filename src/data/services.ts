/**
 * ONE source for the 30 services of brief §2 — read by the Services page and by the four group pages, so a
 * service's card text can never differ from one page to another.
 *   - order: the brief's order inside each area (§2.1–§2.4)
 *   - a service WITH a detail file (src/content/services/<slug>.json) takes its card name + summary from that file
 *   - a service WITHOUT one (no detail page yet) has its card text here, and only that: never invent detail copy
 * CLIENT DECISION (2026-11): every service in the brief is offered — no «مقترح», no label, no flag.
 */
import { getCollection } from 'astro:content';
import type { Lang } from '../i18n';

export type Area = 'legal' | 'travel' | 'events' | 'software';
export const AREAS: Area[] = ['legal', 'travel', 'events', 'software'];

/** the group page of each area (brief §2.1–§2.4) */
export const GROUP_PAGE: Record<Area, string> = {
  legal: '/services/legal-services/',
  travel: '/services/immigration-study-visa/',
  events: '/services/exhibitions-conferences/',
  software: '/services/software-technology/',
};

/** the intro paragraph of each area, whole (brief §2.1–§2.4) — the Services page and the group-page heroes */
export const AREA_INTRO: Record<Area, Record<Lang, string>> = {
  legal: {
    ar: 'استشارات قانونية ومتابعة للقضايا والإجراءات، نشرح لك فيها موقفك القانوني بلغة بسيطة، ونساعدك على اتخاذ القرار الصحيح في الوقت المناسب، بما يحمي مصالحك وسمعتك.',
    en: 'Legal consultations and follow-up on cases and procedures, in which we explain your legal position in plain language and help you make the right decision at the right time, in a way that protects your interests and your reputation.',
  },
  travel: {
    ar: 'سواء كنت تخطط للهجرة، أو للدراسة في جامعة بالخارج، أو تحتاج إلى تأشيرة لأي غرض؛ نرافقك في رحلتك من أول سؤال حتى تجهيز ملفك كاملًا: اختيار المسار، والمستندات، والترجمة المعتمدة، والتعامل مع متطلبات السفارات.',
    en: 'Whether you are planning to immigrate, to study at a university abroad, or need a visa for any purpose — we stay with you on your journey from the first question until your file is complete: choosing the path, the documents, certified translation and dealing with embassy requirements.',
  },
  events: {
    ar: 'ننظم معارض ومؤتمرات دولية متكاملة، من الفكرة والتخطيط حتى يوم الافتتاح وما بعده. نتولى كل التفاصيل: المكان، والتجهيزات، والوفود، والتسجيل، والترجمة الفورية؛ لتخرج فعاليتك بصورة تليق باسمك أمام جمهور محلي ودولي.',
    en: 'We organize complete international exhibitions and conferences, from the idea and the planning to opening day and beyond. We take care of every detail — the venue, the setup, the delegations, registration and simultaneous interpretation — so your event comes out in a way worthy of your name, before a local and international audience.',
  },
  software: {
    ar: 'حلول رقمية عملية تساعد مؤسستك على الظهور باحترافية، وتنظيم عملها، وتوفير الوقت والجهد.',
    en: 'Practical digital solutions that help your organization present itself professionally, organize its work, and save time and effort.',
  },
};

type Card = { name: string; summary: string };
interface Def {
  slug: string;
  area: Area;
  card?: Record<Lang, Card>;             // only for services without a detail file
  cardName?: Record<Lang, string>;       // the brief's card name, when the detail page uses a longer title
  external?: true;                       // the card goes to WaysZ Visa (site.visaSite)
}

const card = (ar: [string, string], en: [string, string]): Record<Lang, Card> => ({
  ar: { name: ar[0], summary: ar[1] },
  en: { name: en[0], summary: en[1] },
});

const SERVICES: Def[] = [
  // §2.1 Legal — the six files exist
  { slug: 'criminal-law', area: 'legal' },
  { slug: 'civil-law', area: 'legal' },
  { slug: 'family-law', area: 'legal' },
  { slug: 'corporate-law', area: 'legal' },
  { slug: 'immigration-nationality-law', area: 'legal' },
  { slug: 'dispute-resolution-arbitration', area: 'legal' },

  // §2.2 Immigration, Study & Visa
  { slug: 'immigration-residency', area: 'travel', card: card(
    ['استشارات الهجرة والإقامة', 'تقييم وضعك، ومساعدتك على اختيار الدولة والبرنامج الأنسب للهجرة أو الإقامة أو العمل بالخارج، ثم تجهيز ملفك خطوة بخطوة.'],
    ['Immigration & Residency Consultations', 'Assessing your situation and helping you choose the country and program best suited to immigrating, residing or working abroad, then preparing your file step by step.']) },
  { slug: 'study-abroad', area: 'travel' },
  { slug: 'visa-services', area: 'travel', external: true, card: card(
    ['خدمات التأشيرات', 'استشارات متخصصة لتأشيرات الدراسة والأعمال والمؤتمرات والإقامة والزيارات العائلية، عبر منصتنا WaysZ Visa.'],
    ['Visa Services', 'Specialized consultations for study, business, conference, residency and family-visit visas, through our platform WaysZ Visa.']) },
  { slug: 'certified-translation', area: 'travel', card: card(
    ['الترجمة المعتمدة', 'ترجمة الوثائق الرسمية والشخصية والقانونية إلى جميع اللغات، عبر مكاتب ترجمة معتمدة لدى الجهات الرسمية والسفارات.'],
    ['Certified Translation', 'Translation of official, personal and legal documents into all languages, through translation offices accredited by official bodies and embassies.']) },
  { slug: 'embassy-consultations', area: 'travel', card: card(
    ['استشارات السفارات', 'إرشادك إلى متطلبات السفارات وإجراءاتها، ومراجعة ملفك قبل التقديم لتفادي الأخطاء الشائعة.'],
    ['Embassy Consultations', 'Guiding you through embassy requirements and procedures, and reviewing your file before you apply to avoid common mistakes.']) },
  { slug: 'flight-booking', area: 'travel', card: card(
    ['حجز تذاكر الطيران', 'البحث عن أنسب الرحلات من حيث المواعيد والأسعار للطلاب والمهاجرين والمسافرين للعمل، ومساعدتك في إتمام الحجز.'],
    ['Flight Booking', 'Finding the most suitable flights in terms of schedules and prices for students, immigrants and those travelling for work, and helping you complete the booking.']) },
  { slug: 'document-legalization', area: 'travel', card: card(
    ['توثيق المستندات وتصديقها', 'إرشادك في إجراءات تصديق الشهادات والمستندات لدى الجهات المختصة قبل تقديمها للسفارات أو الجامعات.'],
    ['Document Authentication & Legalization', 'Guiding you through the procedures for legalizing certificates and documents with the competent authorities before submitting them to embassies or universities.']) },
  { slug: 'egyptian-citizenship-by-investment', area: 'travel', card: card(
    ['الجنسية المصرية بالاستثمار', 'إرشاد الأجانب في مسارات اكتساب الجنسية عبر الاستثمار العقاري أو التجاري أو المساهمة المالية، وتجهيز المستندات ومتابعة الإجراءات.'],
    ['Egyptian Citizenship by Investment', 'Guiding foreign nationals through the routes to acquiring citizenship via real-estate or business investment or a financial contribution, preparing the documents and following up on the procedures.']) },

  // §2.3 Exhibitions & Conferences — the ten files exist
  { slug: 'international-conferences', area: 'events' },
  { slug: 'trade-exhibitions', area: 'events' },
  { slug: 'exhibition-participation', area: 'events' },
  { slug: 'stand-design-build', area: 'events' },
  { slug: 'delegation-guest-management', area: 'events' },
  { slug: 'registration-attendance', area: 'events' },
  { slug: 'interpretation-event-technology', area: 'events' },
  { slug: 'delegation-visas', area: 'events' },
  { slug: 'event-marketing', area: 'events' },
  { slug: 'sponsor-speaker-management', area: 'events' },

  // §2.4 Software & Technology
  // §2.4 names the card «تصميم وتطوير المواقع»; its detail page (template sample د) uses the longer title
  { slug: 'website-design-development', area: 'software', cardName: { ar: 'تصميم وتطوير المواقع', en: 'Website Design & Development' } },
  { slug: 'custom-systems', area: 'software', card: card(
    ['الأنظمة المخصصة', 'أنظمة إدارة مصممة خصيصًا لطبيعة عملك، لتنظيم البيانات والعمليات في مكان واحد.'],
    ['Custom Systems', 'Management systems designed specifically for the nature of your work, to organize data and operations in one place.']) },
  { slug: 'digital-transformation', area: 'software', card: card(
    ['التحول الرقمي للإجراءات', 'تحويل الإجراءات الورقية والمتكررة إلى إجراءات رقمية منظمة، أسرع وأقل عرضة للأخطاء.'],
    ['Digital Transformation of Procedures', 'Turning paper-based and repetitive procedures into organized digital ones that are faster and less prone to errors.']) },
  { slug: 'technology-consulting', area: 'software', card: card(
    ['الاستشارات التقنية', 'مساعدتك على اختيار التقنيات والحلول المناسبة لاحتياجك وميزانيتك قبل أن تبدأ الاستثمار.'],
    ['Technology Consulting', 'Helping you choose the technologies and solutions that fit your need and budget before you start investing.']) },
  { slug: 'event-platforms', area: 'software', card: card(
    ['منصات ومواقع الفعاليات', 'مواقع للمؤتمرات والمعارض مع التسجيل الإلكتروني وجدول الجلسات وتطبيقات الحضور.'],
    ['Event Platforms & Websites', 'Websites for conferences and exhibitions with online registration, the session schedule and attendee apps.']) },
  { slug: 'support-maintenance', area: 'software', card: card(
    ['الدعم الفني والصيانة', 'متابعة مواقعك وأنظمتك بعد الإطلاق، وتحديثها وحل المشكلات الفنية أولًا بأول.'],
    ['Technical Support & Maintenance', 'Looking after your websites and systems after launch, updating them and solving technical problems as they arise.']) },
];

export interface ServiceCard {
  slug: string;
  area: Area;
  name: string;
  text: string;
  page: boolean;          // a detail page exists: /services/<slug>/
  external: boolean;      // the card goes to WaysZ Visa
}

/** The services of one area (or all 30), in the brief's order, as card text in `lang`. */
export async function serviceCards(lang: Lang, area?: Area): Promise<ServiceCard[]> {
  const files = new Map((await getCollection('services')).map((e) => [e.id, e.data]));
  return SERVICES.filter((s) => !area || s.area === area).map((s) => {
    const file = files.get(s.slug);
    const text = file ? file[lang] : s.card?.[lang];
    if (!text) throw new Error(`[services] "${s.slug}" has neither a service file nor card text`);
    return {
      slug: s.slug, area: s.area,
      name: s.cardName?.[lang] ?? text.name, text: text.summary,
      page: !!file, external: !!s.external,
    };
  });
}
