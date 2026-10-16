import { BookOpen, MessageCircleQuestion, Search } from 'lucide-react';
import { useState } from 'react';
import { routes } from '../api/routes.js';
import { DataState } from '../components/DataState.jsx';
import { Panel, Tag } from '../components/UI.jsx';
import { useApi } from '../hooks/useApi.js';

function LessonBrowser({ topic, onAskAuri }) {
  const lessons = useApi(routes.learning.lessons(topic.id));
  const questions = useApi(routes.learning.questions(topic.id));
  const [lessonId, setLessonId] = useState(null);
  const selected = lessons.data?.find((lesson) => lesson.id === lessonId) ?? lessons.data?.[0];
  const detail = useApi(selected ? routes.learning.lesson(selected.id) : null);
  return (
    <div className="read-stack">
      <Panel className="read-panel" eyebrow="PELAJARAN" title={topic.name}>
        <DataState resource={lessons} emptyMessage="Belum ada pelajaran untuk topik ini.">
          <div className="read-list">
            {lessons.data?.map((lesson) => (
              <button className={`read-card ${selected?.id === lesson.id ? 'selected' : ''}`} key={lesson.id} onClick={() => setLessonId(lesson.id)}>
                <strong>{lesson.title}</strong><span>{lesson.exp_reward} EXP · Pelajaran {lesson.lesson_order}</span>
              </button>
            ))}
          </div>
          <DataState resource={detail}>
            <article className="lesson-copy">
              <h3>{detail.data?.title}</h3>
              <div className="lesson-content">{detail.data?.content}</div>
              <button className="secondary-button lesson-ask" onClick={() => onAskAuri({
                lessonId: detail.data.id, label: detail.data.title,
                prompt: `Bantu aku memahami pelajaran ${detail.data.title}.`,
              })}><MessageCircleQuestion size={17} /> Tanya AURI tentang pelajaran ini</button>
            </article>
          </DataState>
        </DataState>
      </Panel>
      <Panel className="read-panel" eyebrow="PRATINJAU" title="Soal Topik">
        <DataState resource={questions} emptyMessage="Belum ada soal untuk topik ini.">
          {questions.data?.map((question) => (
            <article className="question-preview" key={question.id}>
              <h3>{question.question_text}</h3>
              <ol type="A">{question.options.map((option) => <li key={option.id}>{option.text}</li>)}</ol>
            </article>
          ))}
        </DataState>
        <p className="feature-note">Latihan dan penyelesaian pelajaran belum diaktifkan.</p>
      </Panel>
    </div>
  );
}

function TopicBrowser({ subject, onAskAuri }) {
  const topics = useApi(routes.learning.topics(subject.id));
  const [topicId, setTopicId] = useState(null);
  const selected = topics.data?.find((topic) => topic.id === topicId) ?? topics.data?.[0];
  return (
    <div className="read-stack">
      <Panel className="read-panel" eyebrow="TOPIK" title={subject.name}>
        <p>{subject.description}</p>
        <DataState resource={topics} emptyMessage="Belum ada topik untuk mata pelajaran ini.">
          <div className="topic-tabs">
            {topics.data?.map((topic) => (
              <button className={`read-card ${selected?.id === topic.id ? 'selected' : ''}`} key={topic.id} onClick={() => setTopicId(topic.id)}>
                <strong>{topic.name}</strong><span>Kelas {topic.grade_level} · Kesulitan {topic.difficulty}</span>
              </button>
            ))}
          </div>
        </DataState>
      </Panel>
      {selected && <LessonBrowser key={selected.id} topic={selected} onAskAuri={onAskAuri} />}
    </div>
  );
}

export default function Learn({ onAskAuri }) {
  const subjects = useApi(routes.learning.subjects);
  const [subjectId, setSubjectId] = useState(null);
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase('id-ID');
  const visible = subjects.data?.filter((subject) => `${subject.name} ${subject.description}`.toLocaleLowerCase('id-ID').includes(query)) ?? [];
  const selected = visible.find((subject) => subject.id === subjectId) ?? visible[0];
  return (
    <div className="learn-page">
      <label className="module-search">
        <Search size={18} /><input type="search" aria-label="Cari mata pelajaran" placeholder="Cari mata pelajaran…" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <DataState resource={subjects} emptyMessage="Belum ada mata pelajaran tersedia.">
        {visible.length === 0 ? <p className="data-state">Tidak ada mata pelajaran yang cocok.</p> : (
          <div className="read-layout">
            <div className="read-list subject-list">
              {visible.map((subject) => (
                <button className={`read-card ${selected?.id === subject.id ? 'selected' : ''}`} key={subject.id} onClick={() => setSubjectId(subject.id)}>
                  <Tag tone="cyan"><BookOpen size={14} /> Mata Pelajaran</Tag><strong>{subject.name}</strong><span>{subject.description}</span>
                </button>
              ))}
            </div>
            {selected && <TopicBrowser key={selected.id} subject={selected} onAskAuri={onAskAuri} />}
          </div>
        )}
      </DataState>
    </div>
  );
}
