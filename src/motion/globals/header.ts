import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Hide the header while scrolling down, show it on the way up; solid background after 80px. */
export function initHeader() {
  const header = document.querySelector<HTMLElement>('.site-header');
  if (!header) return;
  ScrollTrigger.create({
    start: 'top -80',
    end: 'max',
    onUpdate: (self) => {
      const menuOpen = header.dataset.open === 'true';
      header.classList.toggle('is-hidden', self.direction === 1 && !menuOpen);
    },
    onToggle: (self) => header.classList.toggle('is-solid', self.isActive),
  });
}
