const units = require("../../data/units");
const {
  TASK_IDS,
  dateKey,
  dailyLesson,
  completedCount,
  streak
} = require("../../utils/progress");

const PROGRESS_KEY = "english_checkin_progress_v1";
const HISTORY_KEY = "english_checkin_history_v1";
const UNIT_KEY = "english_checkin_unit_v1";

function readHistory() {
  const value = wx.getStorageSync(HISTORY_KEY);
  return Array.isArray(value) ? value : [];
}

function readUnitIndex() {
  const value = Number(wx.getStorageSync(UNIT_KEY));
  return Number.isInteger(value) && value >= 0 && value < units.length
    ? value
    : 0;
}

Page({
  data: {
    view: "today",
    todayKey: "",
    todayLabel: "",
    unitTitles: units.map(unit => unit.title),
    unitIndex: 0,
    currentUnitTitle: units[0].title,
    currentUnitName: units[0].name,
    lesson: units[0].lessons[0],
    done: {},
    doneCount: 0,
    progressPercent: 0,
    canCheckIn: false,
    checkedIn: false,
    streak: 0,
    totalDays: 0,
    history: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const now = new Date();
    const today = dateKey(now);
    const unitIndex = readUnitIndex();
    const unit = units[unitIndex];
    const progress = wx.getStorageSync(PROGRESS_KEY) || {};
    const completedByUnit = progress.date === today ? progress.units || {} : {};
    const done = completedByUnit[unit.id] || {};
    const history = readHistory();
    const checkedIn = history.some(record => record.date === today);
    const doneCount = completedCount(done);

    this.setData({
      todayKey: today,
      todayLabel: `${now.getMonth() + 1}月${now.getDate()}日`,
      unitIndex,
      currentUnitTitle: unit.title,
      currentUnitName: unit.name,
      lesson: dailyLesson(unit, now),
      done,
      doneCount,
      progressPercent: Math.round((doneCount / TASK_IDS.length) * 100),
      canCheckIn: doneCount === TASK_IDS.length && !checkedIn,
      checkedIn,
      streak: streak(history, now),
      totalDays: history.length,
      history: history.map(record => {
        const recordUnit = units.find(item => item.id === record.unitId);
        return {
          date: record.date,
          year: record.date.slice(0, 4),
          displayDate: `${record.date.slice(5, 7)}月${record.date.slice(8, 10)}日`,
          unitName: recordUnit ? recordUnit.name : "英语练习"
        };
      })
    });
  },

  checkDate() {
    if (this.data.todayKey === dateKey(new Date())) return true;
    this.refresh();
    wx.showToast({ title: "新的一天，题目已更新", icon: "none" });
    return false;
  },

  switchView(event) {
    this.setData({ view: event.currentTarget.dataset.view });
  },

  changeUnit(event) {
    if (!this.checkDate() || this.data.checkedIn) return;
    const index = Number(event.detail.value);
    if (!Number.isInteger(index) || index < 0 || index >= units.length) return;
    wx.setStorageSync(UNIT_KEY, index);
    this.refresh();
  },

  answerWords(event) {
    this.checkAnswer(
      "words",
      Number(event.currentTarget.dataset.index),
      this.data.lesson.wordQuiz.answer
    );
  },

  answerReading(event) {
    this.checkAnswer(
      "reading",
      Number(event.currentTarget.dataset.index),
      this.data.lesson.reading.answer
    );
  },

  checkAnswer(task, selected, answer) {
    if (!this.checkDate() || this.data.checkedIn || this.data.done[task]) return;
    if (selected !== answer) {
      wx.showToast({ title: "再想一想", icon: "none" });
      return;
    }
    this.markDone(task);
    wx.showToast({ title: "答对了！", icon: "success" });
  },

  finishSpeaking() {
    if (!this.checkDate() || this.data.checkedIn || this.data.done.speaking) return;
    this.markDone("speaking");
  },

  markDone(task) {
    const today = dateKey(new Date());
    const unit = units[this.data.unitIndex];
    const saved = wx.getStorageSync(PROGRESS_KEY) || {};
    const completedByUnit = saved.date === today ? { ...(saved.units || {}) } : {};
    completedByUnit[unit.id] = {
      ...(completedByUnit[unit.id] || {}),
      [task]: true
    };
    wx.setStorageSync(PROGRESS_KEY, { date: today, units: completedByUnit });
    this.refresh();
  },

  checkIn() {
    if (!this.checkDate()) return;
    const today = dateKey(new Date());
    const unit = units[this.data.unitIndex];
    const saved = wx.getStorageSync(PROGRESS_KEY) || {};
    const done = saved.date === today ? (saved.units || {})[unit.id] || {} : {};
    const history = readHistory();

    if (completedCount(done) !== TASK_IDS.length || history.some(item => item.date === today)) {
      this.refresh();
      return;
    }

    history.unshift({ date: today, unitId: unit.id });
    wx.setStorageSync(HISTORY_KEY, history);
    this.refresh();
    wx.showToast({ title: "打卡成功！", icon: "success" });
  }
});
