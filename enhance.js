/* ============================================================
   Shared enhancements: dark/light mode toggle + scroll reveal
   ============================================================ */
(function(){
  // ---- Dark mode ----
  const saved = localStorage.getItem('ims-theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

  document.addEventListener('DOMContentLoaded', function(){
    const btn = document.getElementById('themeToggle');
    if (btn){
      btn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
      btn.addEventListener('click', function(){
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark){
          document.documentElement.removeAttribute('data-theme');
          localStorage.setItem('ims-theme', 'light');
          btn.textContent = '🌙';
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('ims-theme', 'dark');
          btn.textContent = '☀️';
        }
      });
    }

    // ---- Scroll reveal: auto-tag top-level sections, then observe ----
    const sections = document.querySelectorAll('section.section, section.marquee-section, header.hero');
    sections.forEach(s => s.classList.add('reveal'));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  });
})();
