import { useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Award, BookOpen, Bot, BrainCircuit, Check, ChevronRight,
  CircleHelp, Clock3, Coins, Compass, Crown, Flame, Gem, GraduationCap, HeartPulse, LockKeyhole,
  Map, Medal, MessageCircleQuestion, Orbit, Play, RotateCcw, Search, ShieldCheck,
  Sparkles, Star, Sword, Swords, Target, Timer, Trophy, UsersRound, WandSparkles,
  Zap,
} from 'lucide-react'
import { SideNav, TopBar } from './components/Chrome.jsx'
import { EmptyPortrait, Panel, PlaceholderArt, ProgressBar, Tag } from './components/UI.jsx'
import { characters, leaderboard, modules, quests, skillNodes } from './data/mockData.js'

const pageTitles = {
  hub: ['GERBANG UTAMA', 'Festival Grand Convergence'],
  learn: ['AKADEMI ANTARDIMENSI', 'Jalur Pembelajaran'],
  collection: ['ARSIP PARA PENANTANG', 'Koleksi Karakter'],
  battle: ['ARENA KONVERGENSI', 'Pertarungan Pengetahuan'],
  competition: ['TURNAMEN MUSIMAN', 'Peringkat Festival'],
  progression: ['JALAN SANG CENDEKIA', 'Kultivasi Pengetahuan'],
}

function Hub({ navigate, notify }) {
  return (
    <div className="screen-grid hub-grid">
      <section className="hub-stage">
        <div className="stage-copy">
          <span className="eyebrow"><Sparkles size={13} /> BAB III · RETAKAN DI LANGIT</span>
          <h2>Gerbang Astravia<br />telah terbuka.</h2>
          <p>Jejak NULL ditemukan di Observatorium. Kuasai Tata Surya sebelum anomali menelan jalur festival.</p>
          <div className="stage-actions">
            <button className="primary-button" onClick={() => navigate('learn')}><Play size={17} fill="currentColor" /> Lanjutkan petualangan</button>
            <button className="icon-button" onClick={() => notify('Peta Dunia sedang dipersiapkan untuk ekspedisi berikutnya.')} aria-label="Buka peta"><Map size={20} /></button>
          </div>
        </div>
        <PlaceholderArt id="ENV_HUB_GATE_01" label="Ilustrasi Gerbang Festival" tone="indigo" className="hub-art" badge="LATAR HUB" />
        <div className="stage-progress"><span>PROGRES BAB</span><ProgressBar value={64} tone="cyan" /><b>64%</b></div>
      </section>

      <Panel className="auri-card">
        <div className="auri-row">
          <PlaceholderArt id="CHAR_AURI_BUST_01" label="Potret AURI" tone="mint" className="auri-art" />
          <div><span className="eyebrow">PESAN DARI AURI</span><h3>Selamat datang kembali, Raka.</h3><p>“Pikiran yang tekun adalah kompas terbaik di antara dunia.”</p></div>
        </div>
        <button className="text-button" onClick={() => notify('AURI: Aku siap membantu! Fitur percakapan AI akan hadir pada tahap berikutnya.')}><MessageCircleQuestion size={17} /> Tanya AURI <ChevronRight size={16} /></button>
      </Panel>

      <Panel className="daily-panel" eyebrow="RITUAL HARIAN" title="Misi Hari Ini" action={<span className="reset-timer"><Clock3 size={14} /> 08:42:16</span>}>
        <div className="quest-list">
          {quests.map((quest) => (
            <div className="quest-item" key={quest.title}>
              <div className="quest-icon"><Target size={19} /></div>
              <div className="quest-copy"><strong>{quest.title}</strong><small>{quest.detail}</small><ProgressBar value={(quest.progress / quest.total) * 100} tone="gold" /></div>
              <div className="quest-reward"><span>{quest.progress}/{quest.total}</span><b>{quest.reward}</b></div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="quick-panel" eyebrow="PILIH JALUR" title="Kegiatan Festival">
        <div className="quick-grid">
          <button className="quick-card learn" onClick={() => navigate('learn')}><BookOpen size={22} /><span><strong>Ruang Belajar</strong><small>4 materi menunggu</small></span><ChevronRight size={18} /></button>
          <button className="quick-card battle" onClick={() => navigate('battle')}><Swords size={22} /><span><strong>Arena Duel</strong><small>Bonus kemenangan aktif</small></span><ChevronRight size={18} /></button>
          <button className="quick-card rank" onClick={() => navigate('competition')}><Trophy size={22} /><span><strong>Turnamen</strong><small>Peringkat #4 divisi</small></span><ChevronRight size={18} /></button>
          <button className="quick-card collection" onClick={() => navigate('collection')}><Star size={22} /><span><strong>Panggil Tokoh</strong><small>1 tiket tersedia</small></span><ChevronRight size={18} /></button>
        </div>
      </Panel>

      <Panel className="event-panel" eyebrow="ANOMALI TERDETEKSI" title="Serbuan Data Kosong">
        <PlaceholderArt id="BOSS_NULL_RIFT_01" label="Manifestasi NULL" tone="corrupt" className="event-art" />
        <div className="event-copy"><p>Kalahkan proyeksi NULL bersama klanmu sebelum portal kolaps.</p><div className="event-meta"><span><UsersRound size={15} /> 18/24 Penantang</span><span><Timer size={15} /> 2 hari</span></div><button className="secondary-button" onClick={() => navigate('battle')}>Lihat serbuan <ArrowRight size={16} /></button></div>
      </Panel>
    </div>
  )
}

function Learn({ notify }) {
  const [selected, setSelected] = useState(modules[0])
  const [step, setStep] = useState(0)
  const quizOptions = ['8 planet', '9 planet', '7 planet', '12 planet']
  const [answer, setAnswer] = useState(null)

  if (step === 1) {
    return (
      <div className="lesson-focus">
        <button className="back-link" onClick={() => setStep(0)}><ArrowLeft size={17} /> Kembali ke jalur belajar</button>
        <div className="lesson-layout">
          <main className="lesson-main game-panel">
            <div className="lesson-heading"><div><span className="eyebrow">{selected.code} · PELAJARAN {selected.completed + 1}</span><h2>{selected.title}: Tantangan Orbit</h2></div><Tag tone="cyan">+45 EXP</Tag></div>
            <PlaceholderArt id="EDU_SOLAR_SYSTEM_DIAGRAM_01" label="Diagram Interaktif Tata Surya" tone="cyan" className="lesson-visual" />
            <article className="lesson-copy"><h3>Lintasan dalam keteraturan</h3><p>Setiap planet bergerak mengelilingi Matahari dalam lintasan yang disebut <b>orbit</b>. Semakin jauh sebuah planet dari Matahari, umumnya semakin lama periode revolusinya.</p><div className="lore-note"><Orbit size={22} /><div><strong>Catatan AURI</strong><p>Bayangkan festival sebagai Tata Surya: panggung utama adalah Matahari, sementara setiap paviliun bergerak pada jalurnya sendiri.</p></div></div></article>
          </main>
          <aside className="quiz-panel game-panel"><span className="eyebrow">UJI PEMAHAMAN</span><h3>Berapa jumlah planet dalam Tata Surya?</h3><div className="answer-list">{quizOptions.map((option, idx) => <button key={option} className={`${answer === idx ? 'selected ' : ''}${answer !== null && idx === 0 ? 'correct' : ''}`} onClick={() => setAnswer(idx)}><span>{String.fromCharCode(65 + idx)}</span>{option}{answer !== null && idx === 0 && <Check size={18} />}</button>)}</div>{answer !== null && <div className={answer === 0 ? 'feedback success' : 'feedback error'}>{answer === 0 ? 'Tepat! Delapan planet mengorbit Matahari.' : 'Belum tepat. Perhatikan kembali diagram orbit.'}</div>}<button className="primary-button wide" disabled={answer !== 0} onClick={() => { notify('Pelajaran selesai! +45 EXP ditambahkan.'); setStep(0); setAnswer(null) }}>Selesaikan pelajaran <ArrowRight size={17} /></button></aside>
        </div>
      </div>
    )
  }

  return (
    <div className="learn-layout">
      <div className="module-column">
        <div className="path-summary"><div><span className="eyebrow">JALUR AKTIF</span><h2>Semester Penjelajah</h2><p>Kuasai empat gerbang pengetahuan untuk menghadapi Ujian Konvergensi.</p></div><div className="completion-orb"><strong>37%</strong><span>SELESAI</span></div></div>
        <div className="module-list">
          {modules.map((module, idx) => (
            <button key={module.id} className={`module-card ${selected.id === module.id ? 'selected' : ''}`} onClick={() => setSelected(module)}>
              <div className={`module-emblem emblem-${module.color}`}>{idx + 1}</div>
              <div className="module-info"><div><Tag tone={module.color}>{module.code}</Tag><small>{module.world}</small></div><h3>{module.title}</h3><ProgressBar value={module.progress} tone={module.color === 'amber' ? 'gold' : module.color} /></div>
              <div className="module-count"><strong>{module.completed}/{module.lessons}</strong><span>misi</span></div>
            </button>
          ))}
          <div className="module-card locked"><div className="module-emblem"><LockKeyhole size={20} /></div><div className="module-info"><small>UJIAN KENAIKAN TINGKAT</small><h3>Sidang Inti Cendekia</h3><span>Selesaikan 70% jalur untuk membuka.</span></div></div>
        </div>
      </div>
      <Panel className="module-detail">
        <PlaceholderArt id={`ENV_${selected.id.toUpperCase()}_WORLD_01`} label={`Lingkungan ${selected.world}`} tone={selected.color} className="module-art" badge={selected.world} />
        <div className="module-detail-body"><div className="detail-top"><Tag tone={selected.color}>{selected.code}</Tag><span><Sparkles size={15} /> {selected.reward}</span></div><h2>{selected.title}</h2><p>{selected.description}</p><div className="chapter-strip"><div><span>01</span><b>Pengantar</b><Check size={16} /></div><div><span>02</span><b>Eksplorasi</b><Check size={16} /></div><div className="current"><span>03</span><b>Tantangan</b><Play size={15} /></div><div className="locked"><span>04</span><b>Ujian</b><LockKeyhole size={14} /></div></div><button className="primary-button wide" onClick={() => setStep(1)}><Play size={17} fill="currentColor" /> {selected.status}</button></div>
      </Panel>
    </div>
  )
}

function Collection({ notify }) {
  const [filter, setFilter] = useState('Semua')
  const [selected, setSelected] = useState(characters[0])
  const filters = ['Semua', 'Milikku', 'Legendaris', 'Epik']
  const visible = characters.filter((c) => filter === 'Semua' || (filter === 'Milikku' ? c.owned : c.rarity === filter))
  return (
    <div className="collection-layout">
      <section className="collection-browser game-panel">
        <div className="browser-toolbar"><div className="filter-tabs">{filters.map((f) => <button className={filter === f ? 'active' : ''} onClick={() => setFilter(f)} key={f}>{f}</button>)}</div><label className="search-field"><Search size={17} /><input aria-label="Cari karakter" placeholder="Cari tokoh..." /></label></div>
        <div className="collection-count"><span><b>4</b> / 24 tokoh ditemukan</span><span>Daya tim <b>4.425</b></span></div>
        <div className="character-grid">{visible.map((character) => <button key={character.id} className={`character-card ${selected.id === character.id ? 'selected' : ''} ${!character.owned ? 'unowned' : ''}`} onClick={() => setSelected(character)}><PlaceholderArt id={`CHAR_${character.id.toUpperCase()}_CARD_01`} label={character.name} tone={character.color} className="character-art" badge={character.rarity} />{!character.owned && <span className="lock-overlay"><LockKeyhole size={20} /> BELUM DIMILIKI</span>}<div className="character-summary"><div><span>{character.universe}</span><h3>{character.name}</h3><small>{character.title}</small></div><b>Lv. {character.level}</b></div></button>)}</div>
      </section>
      <Panel className="character-detail">
        <div className="detail-character-head"><EmptyPortrait name={selected.name} tone={selected.color} /><div><span className="eyebrow">{selected.rarity}</span><h2>{selected.name}</h2><p>{selected.title}</p></div></div>
        <div className="stat-power"><span>DAYA PENGETAHUAN</span><strong>{selected.power.toLocaleString('id-ID')}</strong></div>
        <div className="stat-grid"><div><span>PERAN</span><b>{selected.role}</b></div><div><span>TINGKAT</span><b>{selected.level} / 30</b></div><div><span>AFINITAS</span><b>Logika</b></div><div><span>IKATAN</span><b>{selected.owned ? '68%' : 'Terkunci'}</b></div></div>
        <div className="ability-card"><WandSparkles size={21} /><div><span>KEMAMPUAN KHUSUS</span><strong>Cahaya Penuntun</strong><p>Meningkatkan ketepatan jawaban tim pada ronde analisis.</p></div></div>
        <button className={selected.owned ? 'primary-button wide' : 'secondary-button wide'} onClick={() => notify(selected.owned ? `${selected.name} dipilih sebagai wakil utama.` : `Temukan Fragmen ${selected.name} di Gerbang Pemanggilan.`)}>{selected.owned ? 'Pilih sebagai wakil' : 'Lihat cara mendapatkan'}</button>
      </Panel>
    </div>
  )
}

const battleActions = [
  { id: 'basic', name: 'Serangan Dasar', short: 'Basic Attack', detail: '18 kerusakan', cooldown: 0, icon: Sword, tone: 'basic' },
  { id: 'regen', name: 'Regenerasi Aether', short: 'Regen', detail: 'Pulihkan 24 HP', cooldown: 2, icon: HeartPulse, tone: 'regen' },
  { id: 'special', name: 'Retakan Wawasan', short: 'Special Attack', detail: '30 kerusakan', cooldown: 2, icon: WandSparkles, tone: 'special' },
  { id: 'ultimate', name: 'Konvergensi Agung', short: 'Ultimate', detail: '45 kerusakan', cooldown: 3, icon: Flame, tone: 'ultimate' },
]

const battleQuestions = [
  { subject: 'Matematika', question: 'Sebuah artefak memiliki 3/4 energi. Jika 1/4 digunakan, berapa bagian energi yang tersisa?', options: ['1/4', '1/2', '2/3', '3/4'], answer: 1, insight: '3/4 − 1/4 = 2/4, lalu disederhanakan menjadi 1/2.' },
  { subject: 'IPA', question: 'Planet manakah yang memiliki waktu revolusi paling singkat mengelilingi Matahari?', options: ['Bumi', 'Mars', 'Merkurius', 'Saturnus'], answer: 2, insight: 'Merkurius adalah planet terdekat dari Matahari dan berevolusi sekitar 88 hari.' },
  { subject: 'Bahasa Indonesia', question: 'Kalimat manakah yang merupakan pendapat?', options: ['Air membeku pada 0°C.', 'Menurutku, membaca adalah perjalanan terbaik.', 'Indonesia memiliki ribuan pulau.', 'Matahari terbit dari timur.'], answer: 1, insight: 'Kata “menurutku” menandai gagasan atau penilaian pribadi.' },
  { subject: 'IPS', question: 'Apa tujuan utama bangsa Eropa mencari jalur laut baru menuju Nusantara?', options: ['Mencari rempah-rempah', 'Mempelajari gunung api', 'Membangun observatorium', 'Menghindari musim dingin'], answer: 0, insight: 'Rempah-rempah sangat bernilai dan menjadi pendorong utama penjelajahan samudra.' },
]

function Battle({ notify }) {
  const roster = characters.filter((character) => character.owned).slice(0, 4)
  const [phase, setPhase] = useState('select')
  const [fighterId, setFighterId] = useState(roster[0].id)
  const [playerHp, setPlayerHp] = useState(100)
  const [enemyHp, setEnemyHp] = useState(100)
  const [round, setRound] = useState(1)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAction, setSelectedAction] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [cooldowns, setCooldowns] = useState({ basic: 0, regen: 0, special: 0, ultimate: 0 })
  const [result, setResult] = useState(null)
  const fighter = roster.find((character) => character.id === fighterId) ?? roster[0]
  const question = battleQuestions[questionIndex]

  const startBattle = () => {
    setPlayerHp(100)
    setEnemyHp(100)
    setRound(1)
    setQuestionIndex(0)
    setCooldowns({ basic: 0, regen: 0, special: 0, ultimate: 0 })
    setSelectedAction(null)
    setSelectedAnswer(null)
    setResult(null)
    setPhase('action')
  }

  const resetBattle = () => {
    startBattle()
    setPhase('select')
  }

  const chooseAction = (action) => {
    if (cooldowns[action.id] > 0) return
    setSelectedAction(action)
    setSelectedAnswer(null)
    setResult(null)
    setPhase('question')
  }

  const resolveAnswer = () => {
    if (selectedAnswer === null || !selectedAction) return
    const correct = selectedAnswer === question.answer
    let nextPlayerHp = playerHp
    let nextEnemyHp = enemyHp
    let message

    if (correct) {
      if (selectedAction.id === 'regen') {
        const healed = Math.min(24, 100 - playerHp)
        nextPlayerHp = Math.min(100, playerHp + 24)
        message = `${selectedAction.name} berhasil. ${fighter.name} memulihkan ${healed} HP.`
      } else {
        const damage = selectedAction.id === 'ultimate' ? 45 : selectedAction.id === 'special' ? 30 : 18
        nextEnemyHp = Math.max(0, enemyHp - damage)
        message = `${selectedAction.name} aktif dan memberikan ${damage} kerusakan.`
      }
    } else {
      message = `${selectedAction.name} gagal diaktifkan karena jawaban belum tepat.`
    }

    const counterDamage = nextEnemyHp === 0 ? 0 : correct ? 8 : 16
    nextPlayerHp = Math.max(0, nextPlayerHp - counterDamage)
    if (counterDamage) message += ` NULL membalas dengan ${counterDamage} kerusakan.`

    setPlayerHp(nextPlayerHp)
    setEnemyHp(nextEnemyHp)
    setCooldowns((current) => {
      const next = Object.fromEntries(Object.entries(current).map(([key, value]) => [key, Math.max(0, value - 1)]))
      if (correct && selectedAction.cooldown) next[selectedAction.id] = selectedAction.cooldown
      return next
    })
    setResult({ correct, message, playerHp: nextPlayerHp, enemyHp: nextEnemyHp })
    setPhase('result')
  }

  const continueRound = () => {
    if (result.enemyHp === 0) {
      setPhase('victory')
      notify('Kemenangan! +120 EXP dan 45 Koin Festival diperoleh.')
      return
    }
    if (result.playerHp === 0) {
      setPhase('defeat')
      return
    }
    setRound((value) => value + 1)
    setQuestionIndex((value) => (value + 1) % battleQuestions.length)
    setSelectedAction(null)
    setSelectedAnswer(null)
    setResult(null)
    setPhase('action')
  }

  if (phase === 'select') {
    return (
      <div className="arena-select-page">
        <Panel className="fighter-select-panel" eyebrow="LANGKAH 1 DARI 1" title="Pilih penantangmu">
          <p className="select-intro">Pilih satu karakter untuk mewakilimu di Arena Konvergensi. Lawan masih berupa simulasi NULL untuk versi prototipe ini.</p>
          <div className="fighter-select-grid">
            {roster.map((character) => (
              <button key={character.id} className={`fighter-select-card ${fighterId === character.id ? 'selected' : ''}`} onClick={() => setFighterId(character.id)}>
                <PlaceholderArt id={`CHAR_${character.id.toUpperCase()}_BATTLE_01`} label={`Sprite ${character.name}`} tone={character.color} className="select-character-art" badge={character.rarity} />
                <div className="select-character-copy"><span>{character.role}</span><strong>{character.name}</strong><small>{character.title}</small></div>
                <div className="select-character-level">Lv. {character.level}</div>
                {fighterId === character.id && <span className="selected-check"><Check size={15} /> Dipilih</span>}
              </button>
            ))}
          </div>
        </Panel>
        <button className="battle-start-button" onClick={startBattle}><Swords size={25} /><span><small>PENANTANG TERPILIH · {fighter.name.toUpperCase()}</small>MULAI BATTLE</span><ArrowRight size={22} /></button>
      </div>
    )
  }

  return (
    <div className="battle-page">
      <div className="battle-topline">
        <Tag tone="rose">SIMULASI DUEL · 1V1</Tag>
        <div className="round-counter"><span>RONDE</span><strong>{String(round).padStart(2, '0')}</strong><i /> <span>SOAL</span><strong>{questionIndex + 1}/{battleQuestions.length}</strong></div>
        <button className="text-button" onClick={resetBattle}><RotateCcw size={16} /> Ganti karakter</button>
      </div>

      <section className={`combat-stage game-panel phase-${phase}`}>
        <PlaceholderArt id="ENV_ARENA_RIFT_01" label="Placeholder Background Arena" tone="arena" className="combat-background" badge="GANTI DENGAN BACKGROUND 16:9" />
        <div className="combat-hud player-hud"><div className="hud-name"><span>RAKA · Lv. {fighter.level}</span><strong>{fighter.name}</strong></div><ProgressBar value={playerHp} tone="cyan" /><small>{playerHp} / 100 HP</small></div>
        <div className="combat-hud enemy-hud"><div className="hud-name"><span>MANIFESTASI · Lv. 20</span><strong>NULL//ECHO</strong></div><ProgressBar value={enemyHp} tone="rose" /><small>{enemyHp} / 100 HP</small></div>
        <div className="combatant combatant-player"><PlaceholderArt id={`CHAR_${fighter.id.toUpperCase()}_BATTLE_01`} label={`Sprite ${fighter.name}`} tone={fighter.color} className="combatant-art" /></div>
        <div className="combatant combatant-enemy"><PlaceholderArt id="BOSS_NULL_ECHO_BATTLE_01" label="Sprite NULL//ECHO" tone="corrupt" className="combatant-art" /></div>
        <div className="round-seal"><span>RONDE {round}</span><b>VS</b></div>
        {(phase === 'victory' || phase === 'defeat') && <div className={`battle-end-banner ${phase}`}><Crown size={30} /><span>{phase === 'victory' ? 'KEMENANGAN' : 'DUEL BERAKHIR'}</span><strong>{phase === 'victory' ? 'Pengetahuanmu menstabilkan retakan.' : 'Perkuat pengetahuanmu dan coba lagi.'}</strong><button className="primary-button" onClick={startBattle}>Battle ulang</button></div>}
      </section>

      {phase === 'action' && (
        <section className="turn-panel game-panel">
          <div className="turn-heading"><div><span className="eyebrow">PILIH AKSI</span><h2>Langkahmu, {fighter.name}</h2><p>Setelah memilih aksi, jawab soal dengan benar untuk mengaktifkannya.</p></div><div className="turn-tip"><Zap size={17} /><span><small>ALUR RONDE</small>Aksi → Soal → Eksekusi</span></div></div>
          <div className="combat-actions">
            {battleActions.map((action) => {
              const Icon = action.icon
              const cooldown = cooldowns[action.id]
              return <button key={action.id} className={`combat-action action-${action.tone}`} disabled={cooldown > 0} onClick={() => chooseAction(action)}><span className="action-icon"><Icon size={23} /></span><span className="action-copy"><small>{action.short}</small><strong>{action.name}</strong><b>{action.detail}</b></span><span className="action-cooldown">{cooldown > 0 ? <><Clock3 size={14} /> {cooldown} ronde</> : action.cooldown ? `CD ${action.cooldown}` : 'Tanpa CD'}</span></button>
            })}
          </div>
        </section>
      )}

      {(phase === 'question' || phase === 'result') && (
        <section className="question-turn-panel game-panel">
          <div className="question-topline"><div><Tag tone="cyan">{question.subject}</Tag><span>Soal {questionIndex + 1} dari {battleQuestions.length}</span></div><div className={`queued-action action-${selectedAction.tone}`}><selectedAction.icon size={17} /><span><small>AKSI DISIAPKAN</small><b>{selectedAction.name}</b></span></div></div>
          <h2>{question.question}</h2>
          <div className="battle-answer-grid">
            {question.options.map((option, index) => {
              const revealed = phase === 'result'
              const state = revealed && index === question.answer ? 'correct' : revealed && index === selectedAnswer ? 'wrong' : selectedAnswer === index ? 'selected' : ''
              return <button key={option} className={state} disabled={revealed} onClick={() => setSelectedAnswer(index)}><span>{String.fromCharCode(65 + index)}</span><b>{option}</b>{revealed && index === question.answer && <Check size={18} />}</button>
            })}
          </div>
          {phase === 'question' ? <button className="primary-button answer-confirm" disabled={selectedAnswer === null} onClick={resolveAnswer}>Kunci jawaban & aktifkan aksi <ArrowRight size={17} /></button> : <div className={`answer-result ${result.correct ? 'correct' : 'wrong'}`}><div>{result.correct ? <Check size={22} /> : <CircleHelp size={22} />}<span><strong>{result.correct ? 'Jawaban benar—aksi berhasil!' : 'Jawaban belum tepat—aksi gagal.'}</strong><p>{result.message}</p><small>{question.insight}</small></span></div><button className="secondary-button" onClick={continueRound}>{result.enemyHp === 0 || result.playerHp === 0 ? 'Lihat hasil duel' : 'Lanjut ke ronde berikutnya'} <ArrowRight size={16} /></button></div>}
        </section>
      )}
    </div>
  )
}

function Competition({ notify }) {
  const [tab, setTab] = useState('Divisiku')
  return (
    <div className="competition-grid">
      <section className="league-hero game-panel"><div className="league-copy"><span className="eyebrow">MUSIM I · PEKAN 3</span><h2>Liga Inti Cendekia</h2><p>Bersainglah dalam duel pengetahuan dan capai 1.720 rating untuk promosi.</p><div className="rating-row"><div><span>RATINGMU</span><strong>1.648</strong></div><div><span>REKOR</span><strong>12 <small>M</small> · 5 <small>K</small></strong></div></div><button className="primary-button" onClick={() => notify('Pencarian lawan dimulai… simulasi matchmaking selesai!')}><Swords size={17} /> Cari lawan</button></div><PlaceholderArt id="ICON_LEAGUE_CORE_01" label="Lambang Liga" tone="violet" className="league-art" badge="#4 DIVISI" /></section>
      <Panel className="leaderboard-panel" title="Papan Peringkat" action={<div className="mini-tabs">{['Divisiku', 'Global'].map((t) => <button className={tab === t ? 'active' : ''} key={t} onClick={() => setTab(t)}>{t}</button>)}</div>}>
        <div className="leader-list">{leaderboard.map((player) => <div className={`leader-row ${player.current ? 'current' : ''}`} key={player.name}><span className={`rank-num rank-${player.rank}`}>{player.rank}</span><EmptyPortrait name={player.name} tone={player.color} /><div className="leader-name"><strong>{player.name}</strong><small>{player.tier}</small></div><b>{tab === 'Global' ? player.rating + 820 : player.rating}</b></div>)}</div>
      </Panel>
      <Panel className="reward-track" eyebrow="JEJAK KEMENANGAN" title="Hadiah Musiman">
        <div className="reward-line"><span className="reward-progress" style={{ width: '61%' }} />{[{ n: 5, icon: Coins, label: '300' }, { n: 10, icon: Gem, label: '5' }, { n: 15, icon: Award, label: 'Lencana' }, { n: 20, icon: Crown, label: 'Peti Agung' }].map(({ n, icon: Icon, label }, i) => <div className={`reward-node ${n <= 10 ? 'claimed' : ''} ${i === 2 ? 'next' : ''}`} key={n}><span>{n}</span><div><Icon size={20} /></div><small>{label}</small></div>)}</div>
      </Panel>
      <Panel className="competition-rules" eyebrow="ATURAN ARENA" title="Hukum Konvergensi"><ul><li><ShieldCheck /> Peringkat menentukan tingkat lawan.</li><li><Clock3 /> Setiap ronde berlangsung 90 detik.</li><li><GraduationCap /> Soal menyesuaikan jenjang belajarmu.</li></ul></Panel>
    </div>
  )
}

function Progression({ notify }) {
  const [selectedSkill, setSelectedSkill] = useState(skillNodes[2])
  return (
    <div className="progression-grid">
      <Panel className="cultivation-card"><div className="cultivation-head"><PlaceholderArt id="ICON_RANK_CORE_04" label="Segel Inti Cendekia" tone="gold" className="rank-art" /><div><span className="eyebrow">TINGKAT SAAT INI</span><h2>Inti Cendekia IV</h2><p>Pikiranmu mulai menyatukan pengetahuan dari berbagai dunia.</p></div></div><div className="xp-block"><div><span>ENERGI PENGETAHUAN</span><b>2.720 / 4.000 EXP</b></div><ProgressBar value={68} tone="gold" /></div><div className="rank-road"><span className="done"><Check /> Pondasi</span><i /><span className="done"><Check /> Pembentuk</span><i /><span className="current"><Sparkles /> Inti</span><i /><span><LockKeyhole /> Roh Astral</span></div></Panel>
      <Panel className="skill-tree-panel" eyebrow="POHON PENGETAHUAN" title="Konstelasi Pikiran" action={<Tag tone="violet">3 Poin tersedia</Tag>}>
        <div className="skill-tree"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 85 L24 47 M50 85 L50 47 M50 85 L76 47 M24 47 L36 14 M50 47 L36 14 M50 47 L64 14 M76 47 L64 14" /></svg>{skillNodes.map((node) => <button key={node.id} style={{ left: `${node.x}%`, top: `${node.y}%` }} className={`skill-node ${node.state} ${selectedSkill.id === node.id ? 'selected' : ''}`} onClick={() => setSelectedSkill(node)}><span>{node.state === 'done' ? <Check size={20} /> : node.state === 'locked' ? <LockKeyhole size={18} /> : <BrainCircuit size={21} />}</span><small>{node.label}</small></button>)}</div>
        <div className="skill-detail"><div><span className="eyebrow">SIMPUL TERPILIH</span><h3>{selectedSkill.label}</h3><p>{selectedSkill.state === 'locked' ? 'Buka simpul sebelumnya untuk mengakses kemampuan ini.' : 'Tambahkan +5% ketepatan pada tantangan analisis dan penalaran.'}</p></div><button className="secondary-button" disabled={selectedSkill.state !== 'active'} onClick={() => notify('Analisis ditingkatkan! 1 Poin Pengetahuan digunakan.')}>Tingkatkan · 1 Poin</button></div>
      </Panel>
      <Panel className="exam-card" eyebrow="UJIAN BERIKUTNYA" title="Gerbang Roh Astral"><PlaceholderArt id="BOSS_NULL_EXAM_01" label="Pengawas NULL" tone="corrupt" className="exam-art" /><div><p>Ujian final dijaga oleh anomali NULL. Persiapkan tiga disiplin utama.</p><ul><li><Check /> Matematika dasar</li><li><Check /> Ilmu Pengetahuan Alam</li><li><CircleHelp /> Bahasa & penalaran</li></ul><button className="primary-button wide" disabled>Terbuka pada 4.000 EXP</button></div></Panel>
      <Panel className="achievements" eyebrow="RELIK PENCAPAIAN" title="Lencana Terbaru"><div className="badge-row"><div><Medal /><span>Api Tekun</span></div><div><Compass /><span>Penjelajah</span></div><div><Flame /><span>7 Hari</span></div><div className="locked"><LockKeyhole /><span>Rahasia</span></div></div></Panel>
    </div>
  )
}

function App() {
  const requestedPage = new URLSearchParams(window.location.search).get('screen')
  const [page, setPage] = useState(pageTitles[requestedPage] ? requestedPage : 'hub')
  const [navOpen, setNavOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const pageMeta = useMemo(() => pageTitles[page], [page])
  const notify = (message) => { setToast(message); window.clearTimeout(window.__gcToast); window.__gcToast = window.setTimeout(() => setToast(''), 3500) }
  const navigate = (next) => {
    setPage(next)
    window.history.replaceState({}, '', `?screen=${next}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <TopBar onMenu={() => setNavOpen(true)} />
      <SideNav current={page} onNavigate={navigate} open={navOpen} onClose={() => setNavOpen(false)} />
      <main className="main-content">
        <header className="page-header"><div><span className="eyebrow">{pageMeta[0]}</span><h1>{pageMeta[1]}</h1></div><div className="world-status"><i /><span><small>STABILITAS DUNIA</small><b>87% · Stabil</b></span></div></header>
        {page === 'hub' && <Hub navigate={navigate} notify={notify} />}
        {page === 'learn' && <Learn notify={notify} />}
        {page === 'collection' && <Collection notify={notify} />}
        {page === 'battle' && <Battle notify={notify} />}
        {page === 'competition' && <Competition notify={notify} />}
        {page === 'progression' && <Progression notify={notify} />}
      </main>
      <button className="auri-fab" onClick={() => setHelpOpen(!helpOpen)} aria-label="Buka bantuan AURI"><Bot size={23} /><span>AURI</span></button>
      {helpOpen && <div className="auri-popover"><div><EmptyPortrait name="AURI" tone="mint" /><span><b>AURI</b><small>Pemandu Festival</small></span><button onClick={() => setHelpOpen(false)}>×</button></div><p>Butuh petunjuk? Pilih <b>Belajar</b> untuk melanjutkan misi utama, atau uji timmu di <b>Arena</b>.</p><button className="secondary-button" onClick={() => { navigate('learn'); setHelpOpen(false) }}>Buka jalur belajar</button></div>}
      {toast && <div className="toast"><Sparkles size={18} />{toast}</div>}
    </div>
  )
}

export default App
