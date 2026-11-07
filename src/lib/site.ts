/**
 * Site-wide facts. Fill the TODOs with real data from the client — never invent them.
 * Components render a contact item only when its value is not empty.
 */
export const site = {
  name: 'WaysZ',
  url: 'https://waysz.org',
  visaSite: 'https://waysz-visa.com',     // sister site — built later, separate repo/domain

  email: 'info@waysz.org',                // TODO(client): confirm the public email
  phone: '',                              // TODO(client): e.g. '+20 1X XXXX XXXX'
  whatsapp: '',                           // TODO(client): digits only, e.g. '2010XXXXXXXX'
  address: { ar: '', en: '' },            // TODO(client)
  hours:   { ar: '', en: '' },            // TODO(client): e.g. 'السبت إلى الخميس، 10 ص – 6 م'
} as const;

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
export const waHref = (digits: string, text = '') =>
  `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
