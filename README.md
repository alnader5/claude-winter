# Winter — a Claude Code mod

A winter look for Claude Code: snowy-day colors in light mode and winter-night colors in dark mode, a slow snowfall behind the conversation, and Claude's pixel character in a small band above the prompt.

- **Between turns** the character, in a knitted hat and a striped scarf, chases a small orange spark along a snowy track. A snowflake lands on the spark, which shakes it off. The character runs after the spark, puffs in the cold, pounces and misses while the spark darts home trailing sparks, then slides back across the ice with its arms out and waves to a snowman on the way. Its footprints melt slowly in the snow.
- **When you send a prompt** it comes up out of the prompt box as a paper plane. The character catches it, unfolds it and reads it, then meets it by how it sounds, in English or in Arabic:
  - *thanks or praise* (thanks, great job, شكراً, ممتاز): it blushes and dances from side to side, a heart over its head;
  - *a hurry* (urgent, ASAP, عاجل, بسرعة): it starts with a `!` and a bead of sweat, and the whole band works faster for that turn, sweating on;
  - *a question*: it scratches its head under a `?` before it gets to work.
- **While Claude works** the character acts out what Claude is doing, and the spark whirls and glows beside it.
  - *Thinking or writing*: a laptop comes up out of the snow. The character types, stops to think (`...`) and glances at the spark. Now and then a robin comes down onto its hat.
  - *Editing files*: it types fast, and bits of code (`<>`) fly off the laptop to the spark, which whirls faster.
  - *Reading files*: it holds an open book, its eyes running along the lines, and turns a page now and then.
  - *Running a command*: it works the lever of a little terminal, whose screen scrolls at each pull.
  - *Searching the web*: it looks far out through binoculars, left, ahead and right.
  - Each act stays on for a moment at least, so a run of quick tools never flickers.
- **When Claude needs your answer** to a permission prompt, the laptop shuts and the character raises its hand and waves, a `?` over its head, until you answer. The spark holds still and glows.
- **For each agent Claude sends off**, a little helper in a colored hat comes out at the far end of the band, pacing with a parcel, and goes home when its agent is done. Up to three show at once.
- **When a turn ends** the laptop folds away. The character jumps for joy under a green tick when Claude has answered, wonders (`?`) when the turn ended without an answer, and just stands when you stopped it. Then the chase starts again.

- **Point at the band** and everything holds still while the character waves, its eyes on your pointer: to the left of it, to the right, or right at you over its face. **Click it** and the character jumps, a heart over its head.
- **Late at night**, after midnight with nothing asked for a few minutes, the character settles down in the snow and dozes, z's over its head, until the next piece of work wakes it.
- **The sky follows your clock**: a moon and twinkling stars at night, a low sun at dawn and at dusk.
- **Occasions**: on New Year's Eve and New Year's Day the character wears a party hat under falling confetti. Through Ramadan a lantern hangs over the band and a crescent stands in the sky.

The snowfall and the band are drawn in the Claude desktop app and the mobile app. The band runs the whole width the app gives it, up to 1200 pixels: the track, the snowman and the ice are laid out to fit it, and the character crosses a wider band faster.

## The /winter command

- `/winter calm` holds the band and the snow still, for when you want to focus.
- `/winter off` hides the band and holds the snow still.
- `/winter on` sets everything moving again.
- `/winter` on its own says how it is set.

The setting is kept for your next sessions. The character moves a whole frame at a time on a pixel grid, the band holds still where the system asks for reduced motion, and each mood has its own description for screen readers.

## Install

At the prompt of a terminal session:

```
/plugin install winter --marketplace alnader5/claude-winter
```

Answer `y` to add the marketplace, then press Enter to install at the user scope, for every session from then on.

From a shell:

```
claude plugin install winter --marketplace alnader5/claude-winter
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `alnader5/claude-winter`, then **Add plugin**.

To take a newer version later, run `claude plugin update winter` and start a new session.

## بالعربية

مود شتوي لـ Claude Code: ألوان يوم ثلجي في الوضع الفاتح وليلة شتوية في الوضع الداكن، وثلج يتساقط ببطء خلف المحادثة، وشخصية Claude البكسلية في شريط صغير فوق صندوق الكتابة. بين الأدوار تطارد الشخصية، بقبعتها الصوفية ووشاحها المخطط، الشرارة البرتقالية على طريق ثلجي: تسقط ندفة ثلج على الشرارة فتنفضها، وتنزلق الشخصية على الجليد بذراعين ممدودتين وتلوّح لرجل الثلج، وتذوب آثار أقدامها ببطء. وحين ترسل رسالتك تصعد من صندوق الكتابة طائرةً ورقية، فتلتقطها الشخصية وتفتحها وتقرأها، ثم تتفاعل معها: تحمرّ خجلاً وترقص وفوقها قلب إن شكرتها أو أثنيت عليها، وتنتفض بعلامة «!» وتتطاير منها قطرة عرق إن كانت رسالتك عاجلة فيعمل الشريط كله أسرع طوال ذلك الدور، وتحكّ رأسها تحت «؟» إن سألت سؤالاً. وبينما يعمل Claude تمثّل الشخصية ما يفعله: تكتب على حاسوب صغير وتتوقف لتفكّر حين يفكّر، ويحطّ عصفور على قبعتها أحياناً. وحين يعدّل الملفات تكتب بسرعة وتطير رموز الشيفرة `<>` من حاسوبها إلى الشرارة، وحين يقرأ تمسك كتاباً مفتوحاً وتقلّب صفحاته، وحين يشغّل أمراً تشدّ ذراع طرفية صغيرة، وحين يبحث في الويب تنظر بمنظارها بعيداً. وإن احتاج Claude إذنك تغلق حاسوبها وترفع يدها ملوّحة وفوقها «؟» حتى تجيب. ولكل وكيل يرسله Claude يظهر مساعد صغير بقبعة ملونة في آخر الشريط يحمل طرداً، ويعود حين ينتهي وكيله. ثم تقفز فرحاً تحت علامة ✓ خضراء حين يصل الرد، أو تُظهر «؟» إن انتهى الدور بلا رد.

ويمتد الشريط بعرض المساحة كلها حتى 1200 بكسل، فيتوزع الطريق ورجل الثلج والجليد على العرض، وتقطعه الشخصية أسرع كلما اتسع.

مرّر الفأرة فوق الشريط فيتوقف كل شيء وتلوّح الشخصية وعيناها تتبعان مؤشرك يميناً أو يساراً أو تنظر إليك مباشرة، وانقر عليه فتقفز ويظهر فوقها قلب. والأمر `/winter calm` يوقف الحركة وقت التركيز، و`/winter off` يخفي الشريط، و`/winter on` يعيد الحركة، ويبقى اختيارك محفوظاً لجلساتك القادمة.

وبعد منتصف الليل، إن لم تطلب شيئاً لبضع دقائق، تجلس الشخصية في الثلج وتغفو وفوقها «Zzz» حتى يوقظها العمل التالي. والسماء تتبع ساعتك: قمر ونجوم ليلاً، وشمس منخفضة عند الشروق والغروب. وفي رأس السنة تلبس الشخصية قبعة احتفال تحت قصاصات ملونة، وفي رمضان يتدلى فانوس فوق الشريط ويظهر هلال في السماء.

للتثبيت، اكتب في Claude Code داخل الطرفية:

```
/plugin install winter --marketplace alnader5/claude-winter
```

ثم اضغط `y` لإضافة السوق، وEnter للتثبيت في كل جلساتك. وفي تطبيق سطح المكتب: اضغط **+** بجانب صندوق الكتابة، ثم **Plugins**، ثم **Add marketplace** واكتب `alnader5/claude-winter`، ثم **Add plugin**.

## Development

- `hooks/register.tsx`: the hooks. The look at the session's start, the backdrop, the band, and the turn events the band follows.
- `hooks/band.ts` and `hooks/sprite.ts`: the band's reels, one per mood and one per kind of work, and the pixel sprite they are drawn from.
- `hooks/work.ts`: what the character acts out for each tool, and the band's words for screen readers while Claude works.
- `hooks/tone.ts`: how a prompt sounds (thanks, a hurry, a question), read in English and in Arabic.
- `hooks/scene.ts`: the snowfall backdrop and its skies.
- `hooks/time.ts`: the sky, the occasion and the lateness, read from this machine's clock; Ramadan by the Umm al-Qura calendar.
- `hooks/palette.ts`: the winter colors, generated by `node tools/make-palette.mjs`.
- `tests/winter.test.tsx`: run with `claude plugin test .`. Check the whole mod with `claude plugin validate .`.

## License

MIT, for everything here except `hooks/make-colors.js` and `hooks/make-colors.d.ts`. Those two come unchanged from Claude Code's mod-authoring kit, which has every mod carry them, and are not covered by this repository's license.
