import type { Locale } from "./config";
import type { MasteryStatus } from "../types";

// UI chrome strings (not content). Content strings live with the mock data.
type Dict = {
  appTitle: string;
  homeTitle: string;
  homeSubtitle: string;
  recommended: string;
  startPractice: string;
  learningPath: string;
  viewMap: string;
  mapTitle: string;
  mapHint: string;
  mapTrunkHint: string;
  domainLabel: string;
  treeCrown: string;
  exploreBranch: string;
  branchProgress: (done: number, total: number) => string;
  branchCleared: string;
  enterBranch: string;
  viewNet: string;
  viewTrail: string;
  masteredOf: (done: number, total: number) => string;
  subjectMath: string;
  back: string;
  backToTree: string;
  loading: string;
  next: string;
  keepGoing: string;
  correct: string;
  tryAgain: string;
  shoreUpBasics: string;
  backToPrefix: string;
  backToSuffix: string;
  streak: (n: number, of: number) => string;
  pathShowAll: string;
  pathShowLess: string;
  tapToPractice: string;
  levelStart: string;
  levelOf: (n: number, total: number) => string;
  learnConcept: string;
  learnGoals: string;
  learnExample: string;
  exampleAnswer: string;
  learnStandards: string;
  startQuestions: string;
  learnFirst: string;
  shadeInstruction: (n: number, d: number) => string;
  shadeProgress: (k: number, d: number) => string;
  shadeCheck: string;
  shadeReset: string;
  mastery: Record<MasteryStatus, string>;
};

export const DICT: Record<Locale, Dict> = {
  zh: {
    appTitle: "知识树",
    homeTitle: "知识树",
    homeSubtitle: "从主干出发，点开一条分叉去探险",
    recommended: "这一关",
    startPractice: "开始",
    learningPath: "知识树",
    viewMap: "地图",
    mapTitle: "学习地图",
    mapHint: "亮的可以点，灰的还没开",
    mapTrunkHint: "先选一个大类，再走进它的概念小路",
    domainLabel: "领域",
    treeCrown: "五年级数学",
    exploreBranch: "去探险",
    branchProgress: (d, tot) => `${d} / ${tot} 点亮`,
    branchCleared: "这条分叉已掌握",
    enterBranch: "进入分叉",
    viewNet: "看关系网",
    viewTrail: "看小路",
    masteredOf: (d, tot) => `通关 ${d} / ${tot}`,
    subjectMath: "五年级数学",
    back: "返回",
    backToTree: "回知识树",
    loading: "稍等一下…",
    next: "下一题",
    keepGoing: "再试一次",
    correct: "答对了",
    tryAgain: "再想想",
    shoreUpBasics: "先补一补：",
    backToPrefix: "我们先回到「",
    backToSuffix: "」",
    streak: (n, of) => `${n}/${of}`,
    pathShowAll: "看全部",
    pathShowLess: "收起",
    tapToPractice: "点一下开始",
    levelStart: "开始",
    levelOf: (n, tot) => `第 ${n} 关`,
    learnConcept: "这是什么",
    learnGoals: "学会以后你能",
    learnExample: "看个例子",
    exampleAnswer: "答案",
    learnStandards: "对应课程标准",
    startQuestions: "开始做题",
    learnFirst: "先学一下",
    shadeInstruction: (n, d) => `涂出 ${n}/${d}`,
    shadeProgress: (k, d) => `已涂 ${k}/${d}`,
    shadeCheck: "检查",
    shadeReset: "重来",
    mastery: {
      mastered: "会了",
      gap: "再练",
      unlockable: "可以学",
      locked: "还没开",
    },
  },
  en: {
    appTitle: "Knowledge tree",
    homeTitle: "Knowledge tree",
    homeSubtitle: "Start from the trunk, then explore a branch",
    recommended: "This one",
    startPractice: "Start",
    learningPath: "Knowledge tree",
    viewMap: "Map",
    mapTitle: "Learning map",
    mapHint: "Bright ones are ready. Gray ones are locked.",
    mapTrunkHint: "Pick a big topic, then walk its concept trail",
    domainLabel: "Domain",
    treeCrown: "Grade 5 Math",
    exploreBranch: "Explore",
    branchProgress: (d, tot) => `${d} / ${tot} lit`,
    branchCleared: "Branch mastered",
    enterBranch: "Enter branch",
    viewNet: "Concept net",
    viewTrail: "Trail",
    masteredOf: (d, tot) => `${d} of ${tot} cleared`,
    subjectMath: "Grade 5 Math",
    back: "Back",
    backToTree: "Back to tree",
    loading: "One moment…",
    next: "Next",
    keepGoing: "Try again",
    correct: "You got it",
    tryAgain: "Not yet",
    shoreUpBasics: "Let's review: ",
    backToPrefix: "Back to “",
    backToSuffix: "”",
    streak: (n, of) => `${n}/${of}`,
    pathShowAll: "See all",
    pathShowLess: "Show less",
    tapToPractice: "Tap to start",
    levelStart: "Start",
    levelOf: (n) => `Level ${n}`,
    learnConcept: "What's this",
    learnGoals: "After this you can",
    learnExample: "See an example",
    exampleAnswer: "Answer",
    learnStandards: "Curriculum standards",
    startQuestions: "Start questions",
    learnFirst: "Learn it first",
    shadeInstruction: (n, d) => `Color ${n}/${d}`,
    shadeProgress: (k, d) => `Shaded ${k}/${d}`,
    shadeCheck: "Check",
    shadeReset: "Reset",
    mastery: {
      mastered: "Got it",
      gap: "Practice",
      unlockable: "Ready",
      locked: "Locked",
    },
  },
};
