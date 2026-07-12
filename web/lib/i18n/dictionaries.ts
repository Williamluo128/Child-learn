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
  shadeInstructionLabel: (label: string) => string;
  shadeProgress: (k: number, d: number) => string;
  shadeCheck: string;
  shadeReset: string;
  cubesInstruction: string;
  cubesHint: string;
  cubesCount: string;
  cubesShowSteps: string;
  cubesHideSteps: string;
  shadeShowSteps: string;
  shadeStepIntro: (label: string, n: number, d: number) => string;
  shadeStepCount: (k: number, d: number) => string;
  shadeStepDone: (n: number, d: number) => string;
  diagCta: string;
  diagTitle: string;
  diagIntro: string;
  diagStart: string;
  diagQuestionOf: (k: number, n: number) => string;
  diagBacktrackNote: string;
  diagPrevCorrect: string;
  diagPrevWrong: string;
  diagDoneTitle: string;
  diagMasteredLine: (n: number, inferred: number) => string;
  diagGapsTitle: string;
  diagNoGaps: string;
  diagStartHere: string;
  diagGoFix: string;
  diagBackHome: string;
  cubesStepLayer: (n: number, count: number, total: number) => string;
  cubesStepColumn: (n: number, count: number, total: number) => string;
  cubesStepDone: (total: number) => string;
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
    shadeInstructionLabel: (label) => `涂出 ${label}`,
    shadeProgress: (k, d) => `已涂 ${k}/${d}`,
    shadeCheck: "检查",
    shadeReset: "重来",
    cubesInstruction: "这个立体图形由多少个小方块搭成？",
    cubesHint: "拖动可以转一转，数数每一层",
    cubesCount: "小方块数",
    cubesShowSteps: "看数法",
    cubesHideSteps: "收起",
    shadeShowSteps: "看涂法",
    shadeStepIntro: (label, n, d) => `${label} = ${n}/${d}，要涂 ${n} 块`,
    shadeStepCount: (k, d) => `已涂 ${k}/${d}`,
    shadeStepDone: (n, d) => `涂好啦：${n}/${d}！`,
    diagCta: "测一测我在哪",
    diagTitle: "摸底小测验",
    diagIntro: "大约 10 道题。答错也没关系——我们就是想找到最适合你开始的地方。",
    diagStart: "开始测验",
    diagQuestionOf: (k, n) => `第 ${k} 题，共约 ${n} 题`,
    diagBacktrackNote: "往基础方向走一步，看看这里",
    diagPrevCorrect: "上一题答对了",
    diagPrevWrong: "上一题没答对，没关系",
    diagDoneTitle: "测完啦！",
    diagMasteredLine: (n, inferred) => `你已经掌握了约 ${n} 个知识点${inferred > 0 ? `（其中 ${inferred} 个是根据答对推断的）` : ""}`,
    diagGapsTitle: "需要补一补的地方",
    diagNoGaps: "没有发现明显缺口，太棒了！",
    diagStartHere: "建议从这里开始",
    diagGoFix: "去学第一个",
    diagBackHome: "回知识树",
    cubesStepLayer: (n, c, total) => `第 ${n} 层：${c} 块，累计 ${total} 块`,
    cubesStepColumn: (n, c, total) => `第 ${n} 列：${c} 块，累计 ${total} 块`,
    cubesStepDone: (total) => `一共 ${total} 块！`,
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
    shadeInstructionLabel: (label) => `Color ${label}`,
    shadeProgress: (k, d) => `Shaded ${k}/${d}`,
    shadeCheck: "Check",
    shadeReset: "Reset",
    cubesInstruction: "How many unit cubes build this solid?",
    cubesHint: "Drag to spin it — count layer by layer",
    cubesCount: "Unit cubes",
    cubesShowSteps: "Show me how",
    cubesHideSteps: "Hide",
    shadeShowSteps: "Show me how",
    shadeStepIntro: (label, n, d) => `${label} = ${n}/${d} — shade ${n} parts`,
    shadeStepCount: (k, d) => `${k}/${d} shaded`,
    shadeStepDone: (n, d) => `Done: ${n}/${d}!`,
    diagCta: "Find my level",
    diagTitle: "Placement check",
    diagIntro: "About 10 questions. Wrong answers are fine — we're just finding the best place for you to start.",
    diagStart: "Start the check",
    diagQuestionOf: (k, n) => `Question ${k} of ~${n}`,
    diagBacktrackNote: "Stepping toward the basics — try this one",
    diagPrevCorrect: "Last one: correct",
    diagPrevWrong: "Last one: not quite — that's okay",
    diagDoneTitle: "All done!",
    diagMasteredLine: (n, inferred) => `You already know about ${n} skills${inferred > 0 ? ` (${inferred} inferred from what you got right)` : ""}`,
    diagGapsTitle: "Places to shore up",
    diagNoGaps: "No clear gaps found — amazing!",
    diagStartHere: "Suggested starting points",
    diagGoFix: "Learn the first one",
    diagBackHome: "Back to the tree",
    cubesStepLayer: (n, c, total) => `Layer ${n}: ${c} cubes — ${total} so far`,
    cubesStepColumn: (n, c, total) => `Column ${n}: ${c} cubes — ${total} so far`,
    cubesStepDone: (total) => `${total} cubes in all!`,
    mastery: {
      mastered: "Got it",
      gap: "Practice",
      unlockable: "Ready",
      locked: "Locked",
    },
  },
};
