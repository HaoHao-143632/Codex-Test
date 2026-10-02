const test = require("node:test");
const assert = require("node:assert/strict");

const units = require("../data/units");
const { dateKey, dailyLesson, streak } = require("../utils/progress");

test("六个新版单元各有两套可完成的练习", () => {
  assert.equal(units.length, 6);
  assert.deepEqual(units.map(unit => unit.title), [
    "Unit 1 · Amazing places",
    "Unit 2 · Getting together",
    "Unit 3 · Healthy life",
    "Unit 4 · Managing money well",
    "Unit 5 · Exploring space",
    "Unit 6 · Energy, nature and us"
  ]);

  for (const unit of units) {
    assert.equal(unit.lessons.length, 2);
    for (const lesson of unit.lessons) {
      assert.equal(lesson.words.length, 5);
      assert.ok(lesson.speaking.length > 0);
      for (const quiz of [lesson.wordQuiz, lesson.reading]) {
        assert.ok(quiz.question.length > 0);
        assert.equal(quiz.options.length, 3);
        assert.ok(Number.isInteger(quiz.answer));
        assert.ok(quiz.answer >= 0 && quiz.answer < quiz.options.length);
      }
    }
  }
});

test("每天轮换同一单元的练习", () => {
  const first = dailyLesson(units[0], new Date(2026, 9, 2));
  const next = dailyLesson(units[0], new Date(2026, 9, 3));
  assert.notEqual(first, next);
  assert.equal(dailyLesson(units[0], new Date(2026, 9, 4)), first);
});

test("连续天数允许今天还未打卡，跨月也正确", () => {
  const history = [
    { date: "2026-09-30" },
    { date: "2026-10-01" }
  ];
  assert.equal(dateKey(new Date(2026, 9, 2)), "2026-10-02");
  assert.equal(streak(history, new Date(2026, 9, 2)), 2);
  assert.equal(streak([{ date: "2026-10-02" }, ...history], new Date(2026, 9, 2)), 3);
  assert.equal(streak(history, new Date(2026, 9, 4)), 0);
});

test("答对三项后每天只能打卡一次，换单元保留当日进度", () => {
  const storage = new Map();
  const toasts = [];
  global.wx = {
    getStorageSync: key => storage.get(key) || "",
    setStorageSync: (key, value) => storage.set(key, value),
    showToast: toast => toasts.push(toast)
  };
  global.Page = options => {
    global.testPage = options;
    options.setData = function (patch) {
      this.data = { ...this.data, ...patch };
    };
  };
  require("../pages/index/index.js");
  const page = global.testPage;
  page.onShow();

  const firstAnswer = page.data.lesson.wordQuiz.answer;
  page.answerWords({ currentTarget: { dataset: { index: firstAnswer } } });
  assert.equal(page.data.done.words, true);

  page.changeUnit({ detail: { value: 1 } });
  assert.equal(page.data.doneCount, 0);
  page.changeUnit({ detail: { value: 0 } });
  assert.equal(page.data.done.words, true);

  page.answerReading({ currentTarget: { dataset: { index: page.data.lesson.reading.answer } } });
  page.finishSpeaking();
  assert.equal(page.data.canCheckIn, true);
  page.checkIn();
  page.checkIn();

  assert.equal(page.data.totalDays, 1);
  assert.equal(page.data.checkedIn, true);
  assert.equal(storage.get("english_checkin_history_v1").length, 1);
  assert.ok(toasts.some(toast => toast.title === "打卡成功！"));

  delete global.wx;
  delete global.Page;
  delete global.testPage;
});
