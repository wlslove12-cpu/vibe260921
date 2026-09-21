(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 프로젝트 데이터 (여기에 항목을 추가하면 카드가 늘어난다) ----------
  const PROJECTS = [
    {
      id: 'tetris',
      title: 'Tetris',
      desc: '캔버스로 만든 브라우저 테트리스. 홀드, 착지 미리보기, 레벨, 터치 조작을 지원합니다.',
      tags: ['HTML5', 'CSS3', 'JavaScript'],
      thumb: {
        bg: '#141a33',
        palette: { I: '#22d3ee', O: '#facc15', T: '#a855f7', S: '#4ade80', Z: '#f87171', J: '#60a5fa', L: '#fb923c' },
        rows: [
          '................',
          '.....T..........',
          '....TTT.........',
          '................',
          '................',
          '...........L....',
          '..I....SS..LLL..',
          '..I..SSJJ..OO...',
          'ZZ.JJJTTTOOSS.ZZ',
        ],
      },
      links: [{ label: '실행해 보기', href: 'projects/tetris.html', primary: true, newTab: true }],
    },
    {
      id: 'snake',
      title: 'Snake: You vs AI',
      desc: 'AI 뱀과 사람이 사과를 두고 경쟁하는 뱀게임. BFS로 경로를 찾는 AI와 대결합니다.',
      tags: ['Python', 'tkinter', 'BFS'],
      thumb: {
        bg: '#10261d',
        palette: { G: '#22c55e', g: '#4ade80', B: '#2563eb', b: '#60a5fa', R: '#f87171' },
        rows: [
          '................',
          '....R...........',
          '.gggggG.........',
          '.g..............',
          '.ggg.......R....',
          '........bbbbbB..',
          '........b.......',
          '.....R..bbb.....',
          '................',
        ],
      },
      // 브라우저에서 실행할 수 없으므로 실행 방법 안내 + 소스 코드를 제공한다
      howto: {
        title: 'Snake: You vs AI 실행 방법',
        steps: [
          'Python 3를 설치합니다. Windows/macOS 공식 설치본에는 tkinter가 포함되어 있습니다.',
          '아래 버튼으로 <code>snake.py</code>를 내려받습니다.',
          '터미널에서 <code>python snake.py</code>를 실행합니다.',
          '방향키 또는 W/A/S/D로 초록 뱀을 조작해 사과 10개를 먼저 먹으세요.',
        ],
        note: 'Linux에서는 tkinter를 별도로 설치해야 할 수 있습니다 (예: python3-tk 패키지).',
        download: { label: 'snake.py 내려받기', href: 'projects/snake.py' },
      },
      links: [{ label: '소스 코드', href: 'projects/snake.py', newTab: true }],
    },
  ];

  // ---------- 썸네일: 글자 그리드를 SVG 픽셀 아트로 변환 ----------
  function thumbSvg({ bg, palette, rows }) {
    const cell = 20;
    let rects = '';
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (palette[ch]) {
        rects += `<rect x="${x * cell + 1}" y="${y * cell + 1}" width="${cell - 2}" height="${cell - 2}" rx="4" fill="${palette[ch]}"/>`;
      }
    }));
    return `<svg class="thumb" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">` +
      `<rect width="320" height="180" fill="${bg}"/>${rects}</svg>`;
  }

  // ---------- 프로젝트 카드 렌더링 ----------
  function renderProjects() {
    const grid = $('#projectGrid');
    if (!grid) return;

    const cards = PROJECTS.map((p, i) => {
      const links = p.links.map(l =>
        `<a class="btn ${l.primary ? 'btn-primary' : 'btn-ghost'} btn-sm" href="${l.href}"` +
        `${l.newTab ? ' target="_blank" rel="noopener"' : ''}>${l.label}${l.newTab ? '<span class="sr-only"> (새 탭)</span>' : ''}</a>`
      ).join('');
      const howto = p.howto
        ? `<button class="btn btn-primary btn-sm" type="button" data-howto="${p.id}">실행 방법 보기</button>` : '';
      return `
        <article class="card project" id="project-${p.id}" data-reveal style="--i:${i}">
          ${thumbSvg(p.thumb)}
          <div class="project-body">
            <h3>${p.title}</h3>
            <p>${p.desc}</p>
            <ul class="chips" aria-label="사용 기술">${p.tags.map(t => `<li>${t}</li>`).join('')}</ul>
            <div class="project-actions">${howto}${links}</div>
          </div>
        </article>`;
    });

    cards.push(`
      <article class="card project soon" data-reveal style="--i:${PROJECTS.length}">
        <div><strong>다음 프로젝트 준비 중</strong>새로운 결과물이 곧 추가됩니다.</div>
      </article>`);

    grid.innerHTML = cards.join('');
  }

  // ---------- 테마 (저장된 선택 > 시스템 설정 > 다크) ----------
  const root = document.documentElement;
  const themeBtn = $('#themeBtn');
  const themeMeta = $('meta[name="theme-color"]');

  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    themeBtn.setAttribute('aria-label', theme === 'dark' ? '라이트 테마로 전환' : '다크 테마로 전환');
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#0e1117' : '#f7f8fc');
    if (persist) { try { localStorage.setItem('theme', theme); } catch (e) {} }
  }

  function initTheme() {
    applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);
    themeBtn.addEventListener('click', () => {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
    // 직접 고른 적이 없으면 시스템 설정 변경을 따라간다
    if (window.matchMedia) {
      matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
        let saved = null;
        try { saved = localStorage.getItem('theme'); } catch (err) {}
        if (!saved) applyTheme(e.matches ? 'light' : 'dark', false);
      });
    }
  }

  // ---------- 모바일 메뉴 ----------
  function initMenu() {
    const btn = $('#menuBtn');
    const menu = $('#menu');

    function setOpen(open) {
      menu.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    }
    btn.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.classList.contains('open')) { setOpen(false); btn.focus(); }
    });
    matchMedia('(min-width: 768px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
  }

  // ---------- 현재 섹션 강조 ----------
  function initActiveNav() {
    if (!('IntersectionObserver' in window)) return;
    const links = $$('#menu a');
    const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(a => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
        const a = byId.get(en.target.id);
        if (a) { a.classList.add('active'); a.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['hero', ...byId.keys()].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  // ---------- 스크롤 등장 효과 ----------
  function initReveal() {
    const els = $$('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  }

  // ---------- 실행 방법 대화상자 ----------
  function initHowto() {
    const dlg = $('#howto');
    const grid = $('#projectGrid');
    if (!dlg || !grid) return;

    grid.addEventListener('click', e => {
      const btn = e.target.closest('[data-howto]');
      if (!btn) return;
      const project = PROJECTS.find(p => p.id === btn.dataset.howto);
      const h = project && project.howto;
      if (!h) return;
      $('#howtoTitle').textContent = h.title;
      $('#howtoBody').innerHTML =
        `<ol>${h.steps.map(s => `<li>${s}</li>`).join('')}</ol>` +
        (h.note ? `<p class="note">${h.note}</p>` : '') +
        `<div class="cta"><a class="btn btn-primary btn-sm" href="${h.download.href}" download>${h.download.label}</a></div>`;
      dlg.showModal();
    });
    // 바깥(배경)을 누르면 닫는다
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  }

  // ---------- 이메일 복사 ----------
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) {}
      ta.remove();
      return ok;
    }
  }

  function initCopy() {
    const btn = $('#copyBtn');
    const msg = $('#copyMsg');
    let timer;
    btn.addEventListener('click', async () => {
      const ok = await copyText('wlslove12@naver.com');
      msg.textContent = ok ? '이메일 주소를 복사했습니다.' : '복사하지 못했습니다. 주소를 직접 선택해 복사해 주세요.';
      clearTimeout(timer);
      timer = setTimeout(() => { msg.textContent = ''; }, 2500);
    });
  }

  // ---------- 시작 ----------
  renderProjects();          // 등장 효과보다 먼저: 카드도 효과 대상이 되도록
  initTheme();
  initMenu();
  initActiveNav();
  initReveal();
  initHowto();
  initCopy();
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
