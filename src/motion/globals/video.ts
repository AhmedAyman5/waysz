/**
 * Background video (BgVideo.astro): picks the mobile/desktop + webm/mp4 file, loads it only near the
 * viewport, plays while ≥25% visible, pauses otherwise. Every visitor gets the video (quality policy: no
 * reduced-motion or saveData branch); the poster stays only if the browser blocks autoplay.
 */
export function initVideo() {
  const videos = document.querySelectorAll<HTMLVideoElement>('video[data-bgvideo]');
  if (!videos.length) return;

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
