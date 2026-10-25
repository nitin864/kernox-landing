import {
  AnimatePresence,
  MotionConfig,
  motion,
  useAnimationFrame,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

const CONFIG = {
  launchLabel: 'LAUNCHING SOON / V0.1',
  accent: '#b7f397',
  downloadPath: '/kernox-linux-preview.tar.gz',
  downloadLabel: 'download available soon',
  githubUrl: '#',
  contactUrl: '#',
  formEndpoint: '',
  waitlistEmail: 'hello@kernox.local',
  rememberIntroInSession: true,
};

const STATUS = {
  live: { label: '[LIVE]', className: 'text-phosphor border-phosphor/50' },
  building: { label: '[BUILDING]', className: 'text-amber border-amber/50' },
  soon: { label: '[SOON]', className: 'text-soft border-line' },
};

const STORY_CHAPTERS = [
  {
    number: '01',
    title: 'the machine wakes',
    body: 'You define one task once. Kernox gives it a name, a boundary, and a place to live on your Linux machine.',
    command: '$ kernox task add disk-check',
    lines: ['> name: check mounted disks', '> storage: local workspace', '> state: ready to enable'],
    badge: 'live',
  },
  {
    number: '02',
    title: 'the task learns a rhythm',
    body: 'A schedule is not a cloud promise. It is a small local ritual: a timer, a worker, and a trace you can inspect.',
    command: '$ kernox schedule preview',
    lines: ['> every weekday 09:00', '> next: Mon · Tue · Wed', '> scheduler: systemd user timer'],
    badge: 'soon',
  },
  {
    number: '03',
    title: 'the window closes',
    body: 'The app can disappear. The work does not. A headless worker keeps the task moving as your user, never as root.',
    command: '$ kernox window close',
    lines: ['> app window: CLOSED', '> kernox-worker: RUNNING', '> target: /dev/nvme0n1p2'],
    badge: 'building',
  },
  {
    number: '04',
    title: 'the log remembers',
    body: 'Every run returns with an exit code, output, and a timestamp. The machine tells the truth in plain text.',
    command: '$ kernox history --tail 3',
    lines: ['09:00  chec1     success  0.42s', 'yesterday reader87  success  0.08s', 'oct 21  autom8    failed   0.01s'],
    badge: 'live',
  },
];

const ROADMAP = [
  { mark: '[x]', name: 'create / enable / disable / delete automations', status: 'live' },
  { mark: '[x]', name: 'disk check, graph view, local-only history', status: 'live' },
  { mark: '[~]', name: 'Rust-owned storage + headless worker CLI', status: 'building' },
  { mark: '[~]', name: 'real backup / cleanup / custom commands', status: 'building' },
  { mark: '[ ]', name: 'systemd timers, script preview, retries + locks', status: 'soon' },
  { mark: '[ ]', name: 'cron fallback, triggers, import / export', status: 'soon' },
  { mark: '[ ]', name: 'AppImage and .deb distribution', status: 'soon' },
];

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return reduced;
}

function getSessionIntroSeen() {
  if (!CONFIG.rememberIntroInSession) return false;
  try {
    return window.sessionStorage.getItem('kernox-intro-seen') === '1';
  } catch {
    return false;
  }
}

function setSessionIntroSeen() {
  if (!CONFIG.rememberIntroInSession) return;
  try {
    window.sessionStorage.setItem('kernox-intro-seen', '1');
  } catch {
    // Private browsing is still a valid way to visit Kernox.
  }
}

function StatusBadge({ status, className = '' }) {
  const item = STATUS[status];
  return <span className={cx('inline-flex border px-2 py-1 text-[10px] tracking-[0.12em]', item.className, className)}>{item.label}</span>;
}

function AsciiOrb({ compact = false, className = '' }) {
  const [frame, setFrame] = useState(0);
  const reduce = useReducedMotionPreference();
  const columns = compact ? 42 : 60;
  const rows = compact ? 18 : 26;

  useAnimationFrame((time) => {
    if (!reduce && document.visibilityState === 'visible') {
      setFrame(Math.floor(time / 90));
    }
  });

  const art = useMemo(() => renderOrb(columns, rows, reduce ? 0 : frame), [columns, rows, frame, reduce]);

  return (
    <motion.pre
      className={cx('ascii-orb select-none text-phosphor', className)}
      aria-hidden="true"
      animate={reduce ? undefined : { opacity: [0.78, 1, 0.78] }}
      transition={reduce ? undefined : { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      {art}
    </motion.pre>
  );
}

function renderOrb(columns, rows, frame) {
  const chars = '░▒▓█';
  const cx = (columns - 1) / 2;
  const cy = (rows - 1) / 2;
  const spin = frame * 0.13;
  const lines = [];

  for (let y = 0; y < rows; y += 1) {
    let line = '';
    for (let x = 0; x < columns; x += 1) {
      const nx = (x - cx) / (columns * 0.47);
      const ny = (y - cy) / (rows * 0.48);
      const radius = Math.sqrt(nx * nx + ny * ny);
      const angle = Math.atan2(ny, nx);
      const ring = Math.abs(radius - (0.68 + Math.sin(angle * 5 + spin) * 0.035));
      const weave = Math.sin(radius * 20 - spin * 1.6 + nx * 3) * 0.11 + Math.cos(ny * 10 + spin * 0.8) * 0.08;
      const shade = Math.max(0, 1 - ring * 21) + Math.max(0, 0.44 - radius) * 0.32 + weave;

      if (radius < 0.18 && Math.sin(spin * 1.8) > -0.25) line += '·';
      else if (shade > 0.68) line += chars[3];
      else if (shade > 0.47) line += chars[2];
      else if (shade > 0.28) line += chars[1];
      else if (shade > 0.13) line += chars[0];
      else if (Math.sin(x * 1.8 + y * 2.4 + spin) > 0.997 && radius < 1.06) line += '·';
      else line += ' ';
    }
    lines.push(line);
  }

  return lines.join('\n');
}

function SectionReveal({ children, id, className = '', ...props }) {
  return (
    <motion.section
      id={id}
      className={cx('mx-auto w-full max-w-[1240px] px-5 py-24 md:px-8 md:py-32', className)}
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.14 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.section>
  );
}

function SectionHeading({ eyebrow, title, description, status }) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-muted">{eyebrow}</div>
        <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.08em] text-ink sm:text-4xl md:text-5xl">{title}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">{description}</p>
      </div>
      {status && <StatusBadge status={status} className="self-start md:self-auto" />}
    </div>
  );
}

function TerminalFrame({ title, children, className = '', toolbar }) {
  return (
    <div className={cx('terminal-frame relative overflow-hidden border border-line bg-panel', className)}>
      <div className="terminal-title flex items-center justify-between border-b border-dashed border-line/70 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-muted">
        <span>┤ {title} ├</span>
        {toolbar}
      </div>
      <div className="p-5 md:p-7">{children}</div>
    </div>
  );
}

function ButtonLink({ children, href, download, primary = false, onClick, className = '', ...props }) {
  return (
    <a
      href={href}
      download={download}
      onClick={onClick}
      className={cx(
        'inline-flex min-h-11 items-center justify-center border px-4 py-2 text-xs font-semibold tracking-[0.04em] transition duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-phosphor focus-visible:outline-offset-4',
        primary ? 'border-phosphor bg-phosphor text-black hover:bg-ink hover:text-black' : 'border-line text-soft hover:border-phosphor hover:bg-phosphor hover:text-black',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

function VoiceButton({ onSpeak, speaking }) {
  return (
    <button
      type="button"
      onClick={onSpeak}
      className="inline-flex min-h-11 items-center gap-2 border border-line px-4 py-2 text-xs text-soft transition hover:border-phosphor hover:text-phosphor focus-visible:outline focus-visible:outline-1 focus-visible:outline-phosphor focus-visible:outline-offset-4"
    >
      <span className="text-phosphor">{speaking ? ')))' : ':::'}</span>
      {speaking ? '[ speaking ]' : '[ meet Kernox ]'}
    </button>
  );
}

function OrbitLabel({ children, className, delay = 0 }) {
  return (
    <motion.span
      className={cx('absolute border border-dashed border-line bg-black/90 px-2 py-1 text-[10px] text-soft', className)}
      animate={{ y: [0, -7, 0], opacity: [0.62, 1, 0.62] }}
      transition={{ duration: 3.6, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.span>
  );
}

function HeroLogo() {
  return (
    <div className="relative mx-auto flex min-h-[420px] w-full max-w-[640px] items-center justify-center overflow-hidden border-y border-dashed border-line/70 md:min-h-[540px] md:border-y-0">
      <div className="absolute inset-0 opacity-40" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-px w-[86%] -translate-x-1/2 bg-gradient-to-r from-transparent via-line to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-[86%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-line to-transparent" />
      </div>
      <motion.div className="pointer-events-none absolute left-1/2 top-1/2 h-[52%] w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-phosphor/20" animate={{ scale: [0.82, 1.1, 0.82], opacity: [0.12, 0.48, 0.12] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }} aria-hidden="true" />
      <motion.div className="pointer-events-none absolute left-1/2 top-1/2 h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-phosphor/15" animate={{ scale: [1.05, 0.88, 1.05], rotate: [0, 90, 180] }} transition={{ duration: 13, repeat: Infinity, ease: 'linear' }} aria-hidden="true" />
      <motion.div className="pointer-events-none absolute left-1/2 top-1/2 h-[86%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line/70" animate={{ scale: [0.95, 1.02, 0.95], opacity: [0.25, 0.7, 0.25] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} aria-hidden="true" />
      <div className="relative flex h-full w-full items-center justify-center">
        <AsciiOrb className="text-[8px] leading-[1.08] sm:text-[10px] md:text-[11px]" />
        <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 32, repeat: Infinity, ease: 'linear' }} aria-hidden="true">
          <span className="absolute left-[14%] top-[22%] text-phosphor">·</span>
          <span className="absolute right-[13%] top-[38%] text-phosphor">·</span>
          <span className="absolute bottom-[22%] left-[28%] text-phosphor">·</span>
        </motion.div>
        <motion.div className="absolute inset-0" animate={{ rotate: -360 }} transition={{ duration: 48, repeat: Infinity, ease: 'linear' }} aria-hidden="true">
          <span className="absolute left-[28%] top-[15%] text-soft">·</span>
          <span className="absolute bottom-[16%] right-[25%] text-soft">·</span>
        </motion.div>
        <OrbitLabel className="left-[4%] top-[20%]" delay={0.1}>df / disk-check</OrbitLabel>
        <OrbitLabel className="right-[2%] top-[34%]" delay={0.7}>rm~ / cleanup</OrbitLabel>
        <OrbitLabel className="bottom-[18%] left-[14%]" delay={1.2}>local / no cloud</OrbitLabel>
        <OrbitLabel className="bottom-[13%] right-[8%]" delay={1.8}>worker / alive</OrbitLabel>
        <div className="absolute bottom-6 left-0 right-0 text-center text-[10px] tracking-[0.14em] text-muted">core live · 3 tasks orbiting</div>
      </div>
      <pre className="sr-only">Animated ASCII orb representing the Kernox local automation core with orbiting disk check, cleanup, and worker tasks.</pre>
    </div>
  );
}

function Header({ onSpeak, speaking }) {
  return (
    <header className="sticky top-0 z-40 border-b border-dashed border-line/80 bg-black/90">
      <div className="mx-auto flex min-h-[64px] max-w-[1240px] items-center justify-between gap-4 px-5 md:px-8">
        <a href="#top" className="text-xl font-semibold tracking-[-0.09em] text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-phosphor focus-visible:outline-offset-4">kernox<span className="cursor-block">█</span></a>
        <nav className="hidden items-center gap-5 text-[11px] text-muted md:flex" aria-label="Primary navigation">
          <a className="transition hover:text-phosphor" href="#story">story</a>
          <a className="transition hover:text-phosphor" href="#system">system</a>
          <a className="transition hover:text-phosphor" href="#roadmap">roadmap</a>
          <a className="transition hover:text-phosphor" href="#join">join</a>
        </nav>
        <div className="flex items-center gap-2 text-[10px] text-soft sm:gap-4">
          <span className="hidden items-center gap-2 sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-phosphor" /> running locally</span>
          <button type="button" onClick={onSpeak} className="border border-line px-2 py-1 text-soft transition hover:border-phosphor hover:text-phosphor focus-visible:outline focus-visible:outline-1 focus-visible:outline-phosphor focus-visible:outline-offset-4" aria-label="Play the Kernox voice introduction">{speaking ? ')))' : 'voice'}</button>
        </div>
      </div>
    </header>
  );
}

function BootOverlay({ onDone, onSpeak, reducedMotion }) {
  const [visible, setVisible] = useState(() => !getSessionIntroSeen());
  const [lineCount, setLineCount] = useState(reducedMotion ? 5 : 0);
  const lines = [
    '$ kernox --init',
    '> probing environment... linux',
    '> local workspace... ok',
    '> checking the machine... alive',
    '> local-first mode... on',
  ];

  useEffect(() => {
    if (!visible || reducedMotion) return undefined;
    const interval = window.setInterval(() => setLineCount((count) => Math.min(count + 1, lines.length)), 470);
    return () => window.clearInterval(interval);
  }, [lines.length, reducedMotion, visible]);

  useEffect(() => {
    if (!visible || reducedMotion) return undefined;
    const timeout = window.setTimeout(() => finish(), 5200);
    return () => window.clearTimeout(timeout);
  }, [reducedMotion, visible]);

  function finish() {
    setSessionIntroSeen();
    setVisible(false);
    onDone?.();
  }

  useEffect(() => {
    if (!visible) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') finish();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible]);

  if (!visible) return null;

  return (
    <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-black px-5" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" autoFocus onClick={finish} className="absolute right-5 top-5 border border-line px-3 py-2 text-xs text-soft transition hover:border-phosphor hover:text-phosphor focus-visible:outline focus-visible:outline-1 focus-visible:outline-phosphor focus-visible:outline-offset-4">[ skip ]</button>
      <div className="w-full max-w-5xl">
        <div className="mb-5 min-h-32 text-sm leading-8 text-soft" aria-live="polite">
          {lines.slice(0, lineCount).map((line, index) => <motion.div key={line} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={index === lines.length - 1 ? 'text-phosphor' : ''}>{line}</motion.div>)}
          <span className="text-phosphor">█</span>
        </div>
        <div className="grid gap-6 md:grid-cols-[1fr_240px] md:items-center">
          <div className="flex min-h-[260px] items-center justify-center border-y border-dashed border-line/70 py-8">
            <AsciiOrb compact className="text-[7px] leading-[1.05] sm:text-[8px]" />
          </div>
          <div className="border-l border-dashed border-line pl-5 text-[11px] leading-7 text-muted">
            <div>kernel workspace / launching soon</div>
            <div className="mt-3 text-soft">boot integrity <span className="text-phosphor">[████████░░] 80%</span></div>
            <div>no cloud endpoint</div>
            <div>no account required</div>
            <div className="my-5 border-t border-dashed border-line" />
            <div className="text-phosphor">local-first mode: on</div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="text-[11px] text-muted">press <span className="border border-line px-1.5 py-0.5 text-soft">esc</span> to skip · the machine stays yours</div>
          <button type="button" onClick={onSpeak} className="self-center text-xs text-phosphor underline decoration-dashed underline-offset-4 hover:text-ink sm:self-auto">[ hear: “meet Kernox” ]</button>
        </div>
      </div>
    </motion.div>
  );
}

function LiveTerminal({ scene }) {
  return (
    <TerminalFrame title="live machine / story runtime" toolbar={<span className="text-phosphor">● running</span>} className="h-full shadow-phosphor">
      <div className="mb-5 flex items-center justify-between text-[10px] text-muted"><span>~/workspace/{scene.number}</span><span>local / no cloud</span></div>
      <div className="min-h-[230px] text-xs leading-7">
        <div className="text-phosphor">{scene.command}</div>
        {scene.lines.map((line, index) => <motion.div key={line} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.12 }} className={index === scene.lines.length - 1 ? 'text-ink' : 'text-soft'}>{line}</motion.div>)}
        <motion.div className="mt-5 text-muted" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 2, repeat: Infinity }}>&gt; tailing local signal ░▒▓█</motion.div>
      </div>
      <div className="mt-4 border-t border-dashed border-line/70 pt-4 text-[10px] text-muted"><span className="text-phosphor">[x]</span> this scene is simulated UI · Kernox itself is launching soon</div>
    </TerminalFrame>
  );
}

function Story({ motionEnabled }) {
  const [activeChapter, setActiveChapter] = useState(0);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 30%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28 });
  const barHeight = useTransform(progress, [0, 1], ['0%', '100%']);

  return (
    <SectionReveal id="story" className="pt-24 md:pt-40">
      <SectionHeading eyebrow="/ chapter log / scroll to run the story" title="A small machine story, told in four local acts." description="Scroll through the journey: a task is defined, given a rhythm, kept alive after the window closes, then returned as a plain-text memory." status="live" />
      <div ref={ref} className="relative grid gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(380px,1.08fr)]">
        <div className="relative pl-9 md:pl-12">
          <div className="absolute bottom-0 left-2 top-0 w-px bg-line/50 md:left-4" />
          <motion.div style={{ height: barHeight }} className="absolute left-2 top-0 w-px origin-top bg-phosphor shadow-[0_0_14px_rgba(183,243,151,.7)] md:left-4" />
          <div className="space-y-10">
            {STORY_CHAPTERS.map((chapter, index) => (
              <motion.article
                key={chapter.number}
                onViewportEnter={() => setActiveChapter(index)}
                viewport={{ amount: 0.5 }}
                initial={{ opacity: 0.38 }}
                whileInView={{ opacity: 1 }}
                className={cx('relative min-h-[220px] transition-colors', activeChapter === index ? 'text-ink' : 'text-muted')}
              >
                <span className={cx('absolute -left-[2.05rem] top-1 flex h-5 w-5 items-center justify-center border text-[9px] md:-left-[2.55rem]', activeChapter === index ? 'border-phosphor bg-phosphor text-black' : 'border-line bg-black text-muted')}>{chapter.number}</span>
                <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted"><span>chapter {chapter.number}</span><StatusBadge status={chapter.badge} /></div>
                <h3 className="max-w-md text-2xl font-medium tracking-[-0.06em] sm:text-3xl">{chapter.title}</h3>
                <p className="mt-4 max-w-lg text-sm leading-7 text-muted">{chapter.body}</p>
                <div className="mt-6 inline-block border border-dashed border-line px-3 py-2 text-[11px] text-soft">{chapter.command}</div>
              </motion.article>
            ))}
          </div>
        </div>
        <div className="lg:sticky lg:top-24 lg:h-[480px]">
          <AnimatePresence mode="wait">
            <motion.div key={STORY_CHAPTERS[activeChapter].number} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: motionEnabled ? 0.35 : 0 }} className="h-full">
              <LiveTerminal scene={STORY_CHAPTERS[activeChapter]} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </SectionReveal>
  );
}

function AutomationDemo() {
  const [typed, setTyped] = useState('daily-docs-backup');
  const [running, setRunning] = useState(false);
  const words = ['daily-docs-backup', 'disk-check', 'cache-cleanup'];

  useEffect(() => {
    let wordIndex = 0;
    let position = words[0].length;
    let deleting = true;
    const interval = window.setInterval(() => {
      if (deleting) {
        position -= 1;
        setTyped(words[wordIndex].slice(0, Math.max(0, position)));
        if (position <= 0) { deleting = false; wordIndex = (wordIndex + 1) % words.length; }
      } else {
        position += 1;
        setTyped(words[wordIndex].slice(0, position));
        if (position >= words[wordIndex].length) deleting = true;
      }
    }, 125);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <TerminalFrame title="automations / local workspace" toolbar={<button type="button" onClick={() => setRunning((value) => !value)} className="text-soft transition hover:text-phosphor">[{running ? 'pause' : 'pause demo'}]</button>}>
      <div className="mb-5 flex flex-wrap gap-2 text-[11px]"><span className="border border-phosphor bg-phosphor px-2 py-1 text-black">all (3)</span><span className="border border-line px-2 py-1 text-muted">enabled (2)</span><span className="border border-line px-2 py-1 text-muted">disabled (1)</span></div>
      <div className="mb-4 min-h-7 text-xs text-muted">$ create task: <span className="text-phosphor">{running ? 'paused' : typed}</span><span className="cursor-block ml-1">█</span></div>
      {[
        ['df', 'chec1', 'Check disk usage', '[x] enabled'],
        ['df', 'autom8', 'Check disk usage', '[ ] disabled'],
        ['rm~', 'reader87', 'Clean temporary files', '[x] enabled'],
      ].map(([tag, name, description, state], index) => (
        <div key={name} className="grid gap-3 border-b border-dashed border-line/60 py-4 md:grid-cols-[40px_minmax(0,1fr)_auto] md:items-center">
          <span className="grid min-h-7 w-10 place-items-center border border-line text-xs text-soft">{tag}</span>
          <div><div className="text-sm text-ink">{name}</div><div className="text-[11px] text-muted">{description}</div></div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] md:justify-end"><span className={state.includes('x') ? 'text-phosphor' : 'text-muted'}>{state}</span><button type="button" onClick={() => setRunning(true)} className="border border-line px-2 py-1 text-soft transition hover:border-phosphor hover:text-phosphor">Run now</button><button type="button" className="border border-line px-2 py-1 text-muted transition hover:border-phosphor hover:text-phosphor">{index === 1 ? 'enable' : 'disable'}</button></div>
        </div>
      ))}
      <div className="mt-5 border border-dashed border-line p-3 text-[11px] leading-6 text-muted"><div className="text-phosphor">$ kernox run chec1</div><div>/dev/nvme0n1p2 61% /</div><div>/dev/sda1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 42% /mnt/archive</div><div className="text-phosphor">exit 0 · completed locally</div></div>
      <div className="mt-4 text-[11px] text-muted">system pulse <span className="text-phosphor">[██████░░░░] 61%</span></div>
    </TerminalFrame>
  );
}

function GraphDemo() {
  const [selected, setSelected] = useState('chec1');
  const columns = [
    { title: 'core', nodes: ['kernox', 'scheduler'] },
    { title: 'automations', nodes: ['[x] chec1', '[ ] autom8', '[x] reader87'] },
    { title: 'task types', nodes: ['df disk-check', 'rm~ cleanup'] },
    { title: 'targets', nodes: ['mounted disks', '/tmp', '~/.cache'] },
  ];

  return (
    <TerminalFrame title="workspace graph" toolbar={<span className="text-muted"># hover or focus a node</span>}>
      <div className="overflow-x-auto pb-2">
        <div className="relative grid min-w-[720px] grid-cols-4 gap-5">
          <div className="pointer-events-none absolute left-[6%] right-[3%] top-[76px] z-0 text-[11px] leading-[4.2] text-line"><pre className="ascii">───────┐           ┌──────  ─────┐           ┌──────
        └───────────┘           └───────────┘</pre><motion.span className="absolute left-0 top-2 text-phosphor" animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: 'linear' }}>●</motion.span></div>
          {columns.map((column) => (
            <div key={column.title} className="relative z-10">
              <div className="mb-7 border-b border-dashed border-line pb-3 text-[10px] uppercase tracking-[0.18em] text-muted">{column.title}</div>
              <div className="space-y-4">
                {column.nodes.map((node) => {
                  const isDisabled = node.includes('autom8') || node === 'scheduler';
                  const isSelected = node.toLowerCase().includes(selected.toLowerCase()) || (selected === 'chec1' && node === 'kernox');
                  return <button type="button" key={node} onClick={() => setSelected(node.split(' ').pop())} className={cx('block min-h-12 w-full border px-3 py-2 text-left text-xs transition', isSelected ? 'border-phosphor bg-phosphor text-black' : 'border-line bg-panel text-soft hover:border-phosphor hover:text-phosphor', isDisabled && 'border-dashed opacity-70')}><span>{node}</span><small className={cx('mt-1 block text-[10px]', isSelected ? 'text-black/70' : 'text-muted')}>{isDisabled ? 'disabled / planned' : 'enabled / local'}</small></button>;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-4 text-[10px] text-muted"><span>──── enabled</span><span>- - - disabled</span><span className="text-phosphor">● packet tracing: {selected}</span></div>
    </TerminalFrame>
  );
}

function SyncDemo() {
  const steps = [
    ['●', 'Kernox UI', 'define once'],
    ['│', 'automations.json', '~/.config/kernox'],
    ['│', 'generated .sh', 'safe script, inspectable'],
    ['│', 'systemd user timer', 'kernox-<id>.timer'],
    ['│', 'kernox-worker', 'runs as your user · app window closed'],
    ['●', 'history.jsonl + journald', '~/.local/share/kernox'],
  ];
  const [clock, setClock] = useState('09:00:00');

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date().toLocaleTimeString([], { hour12: false })), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <TerminalFrame title="how it syncs with Linux" toolbar={<span className="text-phosphor">{clock}</span>}>
      <div className="space-y-2">
        {steps.map(([marker, title, detail], index) => <motion.div key={title} initial={{ opacity: 0.35, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false }} transition={{ delay: index * 0.1 }} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3"><span className="text-phosphor">{marker}</span><div className="border border-line px-3 py-2 text-xs text-soft"><div className="text-ink">{title}</div><small className="text-[10px] text-muted">{detail}</small></div>{title.includes('systemd') ? <StatusBadge status="soon" /> : title.includes('worker') ? <StatusBadge status="building" /> : <span className="text-[10px] text-muted">→</span>}</motion.div>)}
      </div>
      <div className="mt-5 border border-dashed border-line px-3 py-2 text-[11px] text-muted">╎ cron fallback · <StatusBadge status="soon" className="ml-1" /> · alternate path, still local</div>
      <motion.div className="mt-4 border border-dashed border-line px-3 py-2 text-[11px] text-muted" animate={{ borderColor: ['rgba(69,69,65,.8)', 'rgba(183,243,151,.8)', 'rgba(69,69,65,.8)'] }} transition={{ duration: 2.4, repeat: Infinity }}>[ window: CLOSED ] &nbsp; worker alive &nbsp; → &nbsp; new history row</motion.div>
    </TerminalFrame>
  );
}

function HistoryDemo() {
  const [open, setOpen] = useState(null);
  const rows = [
    ['today 09:00', 'chec1', 'Success', '0.42s', '/dev/nvme0n1p2 61% /'],
    ['yesterday 09:00', 'reader87', 'Success', '0.08s', 'removed 14 cache entries'],
    ['oct 21 09:00', 'autom8', 'Failed', '0.01s', 'disabled task skipped'],
  ];

  return (
    <TerminalFrame title="execution history" toolbar={<span className="text-muted">3 runs</span>}>
      <div className="mb-4 flex items-center justify-between text-[11px] text-muted"><span>success rate / last 7 runs</span><span className="text-phosphor">86%</span></div>
      <div className="mb-4 text-phosphor">▁▃▅▅▇▆█</div>
      {rows.map(([time, name, status, duration, output], index) => <div key={name} className="border-t border-dashed border-line/60 py-4"><div className="grid gap-2 md:grid-cols-[120px_1fr_auto] md:items-start"><span className="text-[11px] text-muted">{time}</span><div><div className="text-sm text-ink">{name}</div><div className={cx('text-[11px]', status === 'Success' ? 'text-phosphor' : 'text-danger')}>Status: {status} · {duration}</div></div><button type="button" onClick={() => setOpen(open === index ? null : index)} className="text-left text-[11px] text-soft transition hover:text-phosphor">{open === index ? '▼ Hide output' : '▶ View output'}</button></div><AnimatePresence>{open === index && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 border-l border-line pl-3 text-[11px] leading-6 text-muted">{output}<br /><span className="text-phosphor">exit {status === 'Success' ? '0' : '78'} · local log retained</span></motion.div>}</AnimatePresence></div>)}
    </TerminalFrame>
  );
}

function SafetyDemo() {
  return (
    <TerminalFrame title="safety / input boundary" toolbar={<StatusBadge status="live" />}>
      <div className="grid gap-3 text-xs leading-7">
        <div className="border border-danger/50 px-3 py-3 text-danger">$ task name: ; rm -rf ~</div>
        <motion.div className="border border-phosphor/60 px-3 py-3 text-phosphor" animate={{ opacity: [0.65, 1, 0.65] }} transition={{ duration: 2.2, repeat: Infinity }}>&gt; quoted data: '; rm -rf ~'<br />&gt; command boundary preserved<br />&gt; runs as your user, never root</motion.div>
        <div className="border-t border-dashed border-line pt-3 text-[11px] text-muted">script preview before install <StatusBadge status="soon" className="ml-1" /></div>
      </div>
    </TerminalFrame>
  );
}

function ScheduleDemo() {
  return (
    <TerminalFrame title="next 5 runs" toolbar={<StatusBadge status="soon" />}>
      <div className="text-center text-sm text-soft">every weekday 09:00 → <span className="text-phosphor">Mon · Tue · Wed · Thu · Fri</span></div>
      <div className="mx-auto my-6 grid max-w-md grid-cols-7 gap-1 text-center text-[10px]">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S', '09:00', '09:00', '09:00', '09:00', '09:00', '—', '—'].map((item, index) => <span key={`${item}-${index}`} className={cx('border border-line/60 px-1 py-2', index < 7 ? 'border-transparent text-muted' : index < 12 ? 'border-phosphor bg-phosphor text-black' : 'text-muted')}>{item}</span>)}
      </div>
      <div className="text-center text-[11px] text-muted">schedule picker + next-5-runs preview is planned, not installed yet</div>
    </TerminalFrame>
  );
}

function RoadmapSection() {
  return (
    <SectionReveal id="roadmap">
      <SectionHeading eyebrow="/ status board / no vaporware" title="The honest roadmap." description="Kernox is launching soon. The labels are part of the product: you should know what works today, what is being built, and what is still a future door." status="building" />
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ['now / working today', 'live'],
          ['under construction', 'building'],
          ['planned / soon', 'soon'],
        ].map(([title, status]) => <TerminalFrame key={status} title={title} toolbar={<StatusBadge status={status} />}><div className="space-y-4">{ROADMAP.filter((item) => item.status === status).map((item) => <div key={item.name} className="grid grid-cols-[28px_1fr] gap-3 border-b border-dashed border-line/60 pb-3 text-xs"><span className={status === 'live' ? 'text-phosphor' : status === 'building' ? 'text-amber' : 'text-muted'}>{item.mark}</span><span className="text-soft">{item.name}</span></div>)}</div></TerminalFrame>)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <TerminalFrame title="templates in orbit"><div className="space-y-2 text-xs text-soft">{['backup', 'cleanup', 'disk alert', 'git pull', 'docker prune'].map((item, index) => <div key={item} className={cx('flex justify-between border border-dashed px-3 py-2', index === 0 ? 'border-phosphor text-phosphor' : 'border-line')}>{item}<span className="text-[10px]">[SOON]</span></div>)}</div></TerminalFrame>
        <TerminalFrame title="triggers preview"><div className="space-y-2 text-xs text-soft">{['on login', 'on file change', 'disk > 85%'].map((item) => <div key={item} className="flex justify-between border border-dashed border-line px-3 py-2">{item}<span className="text-muted">[ ]</span></div>)}</div></TerminalFrame>
        <TerminalFrame title="linux distro strip"><div className="flex flex-wrap items-end gap-5 text-center text-[10px] text-muted">{['arch', 'debian', 'fedora', 'ubuntu'].map((item) => <div key={item}><pre aria-hidden="true" className="ascii text-soft"> .--.\n|o_o |\n|:_/ |\n//   \\ \\\n+(|     | )\n/\\_   _/\\\n\\_)-(-_/</pre><span>{item}</span></div>)}</div></TerminalFrame>
      </div>
    </SectionReveal>
  );
}

function JoinSection() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setMessage('error: enter a valid email address');
      return;
    }
    if (!CONFIG.formEndpoint) {
      setMessage('endpoint not configured — opening a mailto fallback; nothing is claimed as sent.');
      window.location.href = `mailto:${CONFIG.waitlistEmail}?subject=Kernox waitlist&body=${encodeURIComponent(email)}`;
      return;
    }
    setMessage('connecting locally...');
    try {
      const response = await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      if (!response.ok) throw new Error('request failed');
      setMessage('ok: waitlist request accepted');
      setEmail('');
    } catch {
      setMessage('could not reach endpoint — nothing was sent.');
    }
  }

  return (
    <SectionReveal id="join" className="pb-20">
      <div className="border-y border-dashed border-line py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(360px,0.85fr)] lg:items-center">
          <div><div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-muted">/ launching soon transmission /</div><h2 className="text-4xl font-semibold tracking-[-0.08em] text-ink md:text-6xl">Keep a terminal open.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-muted">Join the list for a note when Kernox is ready to run on your machine. No fake launch date. No cloud account.</p><div className="mt-4 text-2xl font-semibold tracking-[0.12em] text-phosphor md:text-4xl">{CONFIG.launchLabel}</div></div>
          <div><form onSubmit={submit} className="border border-line p-2"><label className="sr-only" htmlFor="waitlist-email">Email address</label><div className="flex items-center gap-2 border border-dashed border-line/60 px-3"><span className="text-phosphor">$ notify --email</span><input id="waitlist-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="_" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-ink outline-none placeholder:text-muted" /></div><button type="submit" className="mt-2 min-h-11 w-full border border-phosphor bg-phosphor px-4 py-2 text-xs font-semibold text-black transition hover:bg-ink">join waitlist</button></form><div className="min-h-6 pt-2 text-[11px] text-muted" aria-live="polite">{message}</div></div>
        </div>
      </div>
    </SectionReveal>
  );
}

function App() {
  const prefersReduced = useReducedMotionPreference();
  const [motionEnabled, setMotionEnabled] = useState(!prefersReduced);
  const [crt, setCrt] = useState(true);
  const [mono, setMono] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });
  const width = useTransform(progress, [0, 1], ['0%', '100%']);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', mono ? '#ffffff' : CONFIG.accent);
  }, [mono]);

  function speakIntro() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('Meet Kernox. Your local-first Linux automation manager. Linux tasks, on a schedule.');
    utterance.rate = 0.92;
    utterance.pitch = 0.78;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'}>
      <div className={cx('min-h-screen bg-black text-ink', crt && 'crt-on', mono && 'mono')}>
        <motion.div className="fixed left-0 right-0 top-0 z-[90] h-px origin-left bg-phosphor shadow-[0_0_12px_rgba(183,243,151,.7)]" style={{ width }} />
        <BootOverlay onDone={() => {}} onSpeak={speakIntro} reducedMotion={prefersReduced} />
        <Header onSpeak={speakIntro} speaking={speaking} />

        <main id="top">
          <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1240px] items-center gap-10 px-5 py-16 md:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] md:px-8 md:py-20">
            <div className="relative z-10 p-5 md:p-7">
              <div className="mb-6 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-muted"><span className="text-phosphor">● running locally</span><span>~/workspace/dashboard</span></div>
              <div className="mb-6 text-xl font-semibold tracking-[0.12em] text-phosphor sm:text-3xl md:text-4xl">{CONFIG.launchLabel}</div>
              <div className="mb-4 text-xs text-muted">$ kernox status</div>
              <h1 className="max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.09em] text-ink sm:text-6xl md:text-[4.8rem]">Linux tasks,<br /><span className="text-phosphor">on a schedule.</span></h1>
              <p className="mt-7 max-w-xl text-sm leading-7 text-muted md:text-base">Define a task once, then enable it when you want it to run. Everything stays on this machine. Kernox is the quiet little process that keeps Linux in rhythm.</p>
              <div className="mt-8 flex flex-wrap gap-3"><ButtonLink href={CONFIG.downloadPath} download primary>[ {CONFIG.downloadLabel} ]</ButtonLink><VoiceButton onSpeak={speakIntro} speaking={speaking} /><a href="#story" className="inline-flex min-h-11 items-center px-2 text-xs text-muted transition hover:text-phosphor">[ scroll the story ↓ ]</a></div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted"><span>local-first</span><span>no account</span><span>no cloud</span><span>runs as your user</span></div>
              <div className="mt-8 border-l border-phosphor/60 pl-4 text-[11px] leading-6 text-muted">The full desktop package is launching soon. This link opens a real, inspectable Linux preview bundle instead of pretending the finished app is already released.</div>
            </div>
            <div className="relative"><HeroLogo /><div className="mt-4 text-center text-[10px] uppercase tracking-[0.18em] text-muted">ascii core / communicating with the machine</div></div>
          </section>

          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 border-y border-dashed border-line/70 px-5 py-3 text-[10px] text-muted md:px-8"><span>[ crt {crt ? 'on' : 'off'} ]</span><span>[ mono {mono ? 'on' : 'accent'} ]</span><span>[ motion {motionEnabled ? 'on' : 'off'} ]</span><button type="button" onClick={() => setCrt((value) => !value)} className="transition hover:text-phosphor">toggle display layer</button><button type="button" onClick={() => setMotionEnabled((value) => !value)} className="transition hover:text-phosphor">toggle motion</button><button type="button" onClick={() => setMono((value) => !value)} className="transition hover:text-phosphor">toggle color</button></div>

          <Story motionEnabled={motionEnabled} />

          <SectionReveal id="system">
            <SectionHeading eyebrow="/ live modules / the core in pieces" title="Everything has a trace." description="The interface keeps the same promise as the app: local storage, visible state, and text you can read at a glance." status="live" />
            <div className="grid gap-4 lg:grid-cols-2">
              <AutomationDemo />
              <GraphDemo />
              <SyncDemo />
              <HistoryDemo />
              <SafetyDemo />
              <ScheduleDemo />
            </div>
          </SectionReveal>

          <RoadmapSection />
          <JoinSection />
        </main>

        <footer className="mx-auto max-w-[1240px] px-5 pb-12 text-center md:px-8">
          <div className="border-t border-dashed border-line pt-16">
            <motion.pre className="heart-breathe ascii mx-auto max-w-md text-phosphor" aria-hidden="true" animate={motionEnabled ? { scale: [0.68, 1.12, 0.82, 1.18, 0.68], opacity: [0.52, 1, 0.68, 1, 0.52], filter: ['blur(0px)', 'blur(.5px)', 'blur(0px)', 'blur(.5px)', 'blur(0px)'] } : undefined} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}>  ▄████▄   ▄████▄  {'\n'} ████████ ████████ {'\n'}██████████████████{'\n'}██████████████████{'\n'} ████████████████ {'\n'}  ██████████████  {'\n'}   ████████████   {'\n'}    ██████████    {'\n'}     ████████     {'\n'}      ██████      {'\n'}       ████       {'\n'}        ██        </motion.pre>
            <div className="mt-8 text-base text-ink">developed with ♥ by Nitin · India</div>
            <div className="mt-2 text-[11px] text-muted">(c) 2026 Kernox · Local-first Linux automation</div>
            <div className="mt-5 flex justify-center gap-5 text-[11px] text-muted"><a href={CONFIG.githubUrl} className="transition hover:text-phosphor">github placeholder</a><a href={CONFIG.contactUrl} className="transition hover:text-phosphor">contact placeholder</a></div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}

export default App;
