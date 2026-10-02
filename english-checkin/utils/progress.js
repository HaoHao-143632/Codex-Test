const DAY_MS = 24 * 60 * 60 * 1000;
const TASK_IDS = ["words", "reading", "speaking"];

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayNumber(date) {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS
  );
}

function dailyLesson(unit, date) {
  return unit.lessons[dayNumber(date) % unit.lessons.length];
}

function completedCount(done) {
  return TASK_IDS.filter(id => Boolean(done[id])).length;
}

function streak(history, now) {
  const dates = new Set(history.map(item => item.date));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!dates.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let count = 0;
  while (dates.has(dateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

module.exports = {
  TASK_IDS,
  dateKey,
  dailyLesson,
  completedCount,
  streak
};
