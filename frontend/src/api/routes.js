const id = (value) => encodeURIComponent(String(value));

// Paths are relative to the backend's existing /api/v1 prefix.
export const routes = {
  account: { login: '/account/login', me: '/account/me' },
  player: {
    me: '/player/me',
    characters: '/player/me/characters',
    character: (characterId) => `/player/me/characters/${id(characterId)}`,
  },
  characters: {
    list: '/characters',
    detail: (characterId) => `/characters/${id(characterId)}`,
  },
  learning: {
    subjects: '/learning/subjects',
    topics: (subjectId) => `/learning/subjects/${id(subjectId)}/topics`,
    lessons: (topicId) => `/learning/topics/${id(topicId)}/lessons`,
    lesson: (lessonId) => `/learning/lessons/${id(lessonId)}`,
    questions: (topicId) => `/learning/topics/${id(topicId)}/questions`,
  },
  competitions: {
    list: '/competitions',
    leaderboard: (competitionId) => `/competitions/${id(competitionId)}/leaderboard`,
  },
  leaderboard: '/leaderboard/global',
  ranks: '/progression/ranks',
  exams: '/exams',
  mastery: {
    me: '/mastery/me',
    recommendations: '/mastery/recommendations',
    prerequisites: (topicId) => `/mastery/topics/${id(topicId)}/prerequisites`,
  },
  heartDemons: '/heart-demons',
};

export function withQuery(path, parameters = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }
  return query.size ? `${path}?${query}` : path;
}
