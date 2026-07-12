# Child Learn 前端设计系统 — "Sticker Book"

借鉴 Duolingo 的设计语言(白纸画布 + 扁平贴纸 + 3D 按钮),但配色独立:
珊瑚橙为主品牌色,紫罗兰为次要交互色(Duolingo 用绿 + 蓝)。

## 设计原则

1. **纸面画布**:页面背景为纯白,无渐变、无径向光晕、无玻璃拟态。
2. **贴纸式表面**:卡片 = 白底 + 2px 实线边框 + 16px 圆角,不用模糊阴影。
3. **硬边 3D 按钮**:实色填充 + `box-shadow: 0 4px 0 <深色边>`,按下时
   `translateY(4px)` 且阴影消失(Duolingo 标志性按压效果)。
4. **颜色只表达语义**:正文用中性灰;彩色只用于状态与操作。
5. **圆胖展示字体**:标题用 Baloo 2(700/800),正文 Outfit;小节标签
   大写 + 0.08em 宽字距。

## 色板

| 名称 | 值 | 用途 |
|------|-----|------|
| brand / coral | `#f45b39` (edge `#d64322`, soft `#ffe9e2`) | CTA、主标题、进度条 |
| violet | `#7c5cf4` (edge `#5f41d6`, soft `#f0ebff`) | 次要按钮、选中态、"可以学" |
| mastered / teal | `#12b284` (edge `#0a9169`, soft `#dcf7ee`) | 已掌握、答对 |
| gap / amber | `#efa11c` (edge `#c9820b`, soft `#fcf0d8`) | 需巩固、答错 |
| ink | `#443d4d` | 标题/正文强调(带李子灰调) |
| muted | `#7d7787` | 正文次要 |
| faded / locked | `#b9b3c0` | 禁用、未解锁 |
| line | `#e7e3ea` | 边框 |
| canvas / well | `#f7f5f9` | 内嵌浅色区块 |
| path | `#ddd7e5` | 关卡连线、树干 |

每个语义色都有三档:`DEFAULT`(填充)、`deep/edge`(硬底边)、`soft`(浅底)。

## 组件类(globals.css @layer components)

- `.card` — 贴纸卡片:白底、2px line 边框、16px 圆角。
- `.btn` + `.btn-primary` / `.btn-violet` — 实色 3D 按钮(白字,硬底边,按下下沉)。
- `.btn-secondary`(紫字)/ `.btn-neutral`(墨字)— 白底描边 3D 按钮。
- `.chip` — 描边胶囊标签。
- `.label-caps` — 大写宽字距小节标签。

## Tailwind 令牌(tailwind.config.ts)

- 圆角:`rounded-card` 16px、`rounded-control` 12px、`rounded-level` 圆。
- 阴影:仅硬底边 `shadow-edge`(4px 灰)、`shadow-edge-sm`(3px)、
  `shadow-edge-{brand,violet,teal,amber}`。禁止模糊阴影。
- 关卡节点(LevelPath/BranchTrail/KnowledgeTree):实色圆 +
  `0 5~6px 0 <MASTERY_META.edge>` 内联硬底边,按下 `translate-y-1` + 去阴影。

## 状态色来源

语义状态的填充色与底边色统一定义在 `lib/mastery.ts` 的 `MASTERY_META`
(`color` + `edge`),SVG/Three.js 中的硬编码色值须与本表保持一致。
