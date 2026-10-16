import { Sparkles } from 'lucide-react';
import { routes } from '../api/routes.js';
import { DataState, SignInPrompt } from '../components/DataState.jsx';
import { Panel, ProgressBar, Tag } from '../components/UI.jsx';
import { useApi } from '../hooks/useApi.js';

export default function Progression({ session, onSignIn, onAskAuri }) {
  const ranks = useApi(routes.ranks);
  const exams = useApi(routes.exams);
  const mastery = useApi(session.token ? routes.mastery.me : null, { token: session.token });
  const recommendations = useApi(session.token ? routes.mastery.recommendations : null, { token: session.token });
  const profile = session.profile.data;
  const rankName = (id) => ranks.data?.find((rank) => rank.id === id)?.name ?? '—';
  return (
    <div className="progression-grid">
      <Panel className="cultivation-card" eyebrow="PERJALANAN" title="Kultivasi Pengetahuan">
        {session.token ? <DataState resource={session.profile}>
          <div className="cultivation-head"><Sparkles size={50} /><div><span className="eyebrow">TINGKAT SAAT INI</span><h2>{profile?.rank ?? '—'}</h2><p>Level {profile?.level}</p></div></div>
          <div className="xp-block"><div><span>ENERGI PENGETAHUAN</span><b>{profile?.total_exp.toLocaleString('id-ID')} / {profile?.next_level_at_exp.toLocaleString('id-ID')} EXP</b></div>
            <ProgressBar value={profile ? Math.min(100, profile.total_exp / profile.next_level_at_exp * 100) : 0} tone="gold" />
          </div>
        </DataState> : <SignInPrompt onSignIn={onSignIn} />}
        <DataState resource={ranks} emptyMessage="Belum ada peringkat tersedia.">
          <div className="read-list">{ranks.data?.map((rank) => <div className="read-card" key={rank.id}>
            <strong>{rank.name} {profile?.rank_id === rank.id && <Tag tone="gold">Saat ini</Tag>}</strong>
            <span>Level minimum {rank.min_level}</span><span>{rank.description}</span>
          </div>)}</div>
        </DataState>
      </Panel>
      <Panel className="read-panel" eyebrow="PENGUASAAN" title="Pengetahuanmu">
        {session.token ? <DataState resource={mastery} emptyMessage="Belum ada riwayat penguasaan topik.">
          <div className="read-list">{mastery.data?.map((topic) => <div className="read-card" key={topic.topic_id}>
            <strong>Topik #{topic.topic_id}</strong><span>{(topic.mastery_score * 100).toLocaleString('id-ID')}% penguasaan</span>
            <ProgressBar value={topic.mastery_score * 100} tone="cyan" />
            <span>{topic.correct_attempts} jawaban benar dari {topic.total_attempts} percobaan</span>
          </div>)}</div>
        </DataState> : <SignInPrompt onSignIn={onSignIn} />}
      </Panel>
      <Panel className="read-panel" eyebrow="PILIHAN BELAJAR" title="Rekomendasi Topik">
        {session.token ? <DataState resource={recommendations} emptyMessage="Belum ada rekomendasi topik.">
          <div className="read-list">{recommendations.data?.map((topic) => <div className="read-card" key={topic.topic_id}>
            <strong>{topic.name}</strong><span>{(topic.mastery_score * 100).toLocaleString('id-ID')}% penguasaan</span>
            <button className="text-button" onClick={() => onAskAuri({
              topicId: topic.topic_id, label: topic.name, prompt: `Bantu aku mengulang materi ${topic.name}.`,
            })}>Bahas dengan AURI</button>
          </div>)}</div>
        </DataState> : <SignInPrompt onSignIn={onSignIn} />}
      </Panel>
      <Panel className="read-panel" eyebrow="UJIAN KENAIKAN" title="Daftar Ujian">
        <DataState resource={exams} emptyMessage="Belum ada ujian tersedia.">
          <div className="read-list">{exams.data?.map((exam) => <div className="read-card" key={exam.id}>
            <strong>{exam.title}</strong><span>{exam.description}</span>
            <span>{rankName(exam.required_rank_id)} → {rankName(exam.target_rank_id)}</span>
            <span>Durasi {exam.time_limit_seconds} detik · Nilai lulus {(exam.passing_score * 100).toLocaleString('id-ID')}%</span>
          </div>)}</div>
        </DataState>
        <p className="feature-note">Pelaksanaan ujian belum diaktifkan.</p>
      </Panel>
    </div>
  );
}
