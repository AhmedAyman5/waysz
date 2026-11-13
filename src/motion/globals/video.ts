import type { MotionEnv } from '../index';

/**
 * Background video (BgVideo.astro): picks the mobile/desktop + webm/mp4 file, loads it only near the
 * viewport, plays while ≥25% visible, pauses otherwise. Reduced motion or saveData → poster only.
 */
export function initVideo(env: MotionEnv) {
  const videos = document.querySelectorAll<HTMLVideoElement>('video[data-bgvideo]');
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (!videos.length || env.reduce || saveData) return;

  const small = matchMedia('(max-width: 1023px)').matches;
  const pick = (v: HTMLVideoElement) => {
    const name = (small && v.dataset.mobile) || v.dataset.bgvideo!;
    const ext = v.canPlayType('video/webm; codecs="vp9"') ? 'webm' : 'mp4';
    return `/media/video/${name}.${ext}`;
  };

  const play = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target as HTMLVideoElement;
      if (e.intersectionRatio >= 0.25) v.play().catch(() => { /* autoplay blocked → poster stays */ });
      else v.pause();
    }
  }, { threshold: [0, 0.25] });

  const near = new IntersectionObserver((entries, io) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const v = e.target as HTMLVideoElement;
      io.unobserve(v);
      v.addEventListener('playing', () => v.classList.add('is-playing'), { once: true });
      v.src = pick(v);
      v.preload = 'auto';
      play.observe(v);
    }
  }, { rootMargin: '100% 0px' });

  videos.forEach((v) => near.observe(v));
}
