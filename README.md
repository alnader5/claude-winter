# Winter — a Claude Code mod

A winter look for Claude Code: snowy-day colors in light mode and winter-night colors in dark mode, a slow snowfall behind the conversation, and Claude's pixel character in a small band above the prompt.

- **Between turns** the character, in a knitted hat and a striped scarf, chases a small orange spark along a snowy track. A snowflake lands on the spark, which draws in, swells, and sneezes it off, spraying sparks at the character, who blinks. The character runs after the spark, puffs in the cold, pounces and misses while the spark darts home trailing sparks. While the character slides back across the ice with its arms out and waves to a snowman on the way, the spark dives into the snow and hides, stirring now and then, until it pops out as the character gets home. Its footprints melt slowly in the snow.
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
- **The longer and harder Claude works, the hotter the spark**: it whirls faster and glows brighter after 20 seconds or 5 tools, and again after a minute or 15 tools, when it starts throwing off embers; after 3 minutes or 40 tools it blazes. A hard turn that ends with an answer ends in fireworks.
- **A long turn plants a flag a minute** along the snow, up to ten, so you can count the minutes at a glance; one that ends with an answer after two minutes or more plants a big flag with a gold star where the last one stood.
- **Git**: when a commit goes through, the character waves a green flag; when a push goes through, it throws a snowball up out of the band, and a star shines where it went. Claude's own commits and pushes count, and its agents' too.
- **When Claude needs your answer** to a permission prompt, the laptop shuts and the character raises its hand and waves, a `?` over its head, until you answer. The spark holds still and glows.
- **For each agent Claude sends off**, a little helper in a colored hat comes out at the far end of the band, pacing with a parcel, and goes home when its agent is done. Up to three show at once.
- **When a turn ends** the laptop folds away. The character jumps for joy under a green tick when Claude has answered, wonders (`?`) when the turn ended without an answer, and just stands when you stopped it. Then the chase starts again.

- **The snow is a gauge of the conversation's context**: as the context fills, snow drifts up in banks along the band, a step deeper at 30%, 50%, 70% and 85%. When the conversation is compacted, the character takes up a shovel and clears it away.
- **A snowman built over days**: on the first day it is a snowball; each day you use Claude Code adds a part (its head, its face, its carrot, its stick arms that wave back, its top hat), and the answers add gifts (a scarf at 20, a broom at 60, a gold star on its hat at 150). It is kept across sessions.
- **Every move has its finish**: the pom-pom on the character's hat lags behind its moves, its body stretches as it springs up and squashes as it lands, and snow flies up about its feet.
- **Left alone a while, the band has a visitor**: two minutes into the chase, and every four minutes after, a little blue penguin waddles in from the far end, belly-slides across the ice and trades snowballs with the snowman before it waddles off. On a clear night a star shoots across the sky now and then, and every seven minutes or so the northern lights ripple over it for a while.
- **Point at the band** and everything holds still while the character waves, its eyes on your pointer: to the left of it, to the right, or right at you over its face. **Click it** and the character jumps, a heart over its head.
- **Late at night**, after midnight with nothing asked for a few minutes, the character settles down in the snow and dozes, z's over its head, until the next piece of work wakes it.
- **The sky follows your clock**: a moon and twinkling stars at night, a low sun at dawn and at dusk.
- **Occasions**: on New Year's Eve and New Year's Day the character wears a party hat under falling confetti. Through Ramadan a lantern hangs over the band and a crescent stands in the sky.

The snowfall and the band are drawn in the Claude desktop app and the mobile app. The band runs the whole width the app gives it, up to 1200 pixels: the track, the snowman and the ice are laid out to fit it, and the character crosses a wider band faster.

## The /winter command

- `/winter calm` holds the band and the snow still, for when you want to focus.
- `/winter off` hides the band and holds the snow still.
- `/winter on` sets everything moving again.
- `/winter focus` starts a focus session of 25 minutes, or `/winter focus 50` of 50 (up to 180). The character sits still in the snow with its eyes shut, and the spark's eleven rays go out one by one until the time is up. Then a bell rings over the spark, relit, and the character stands and stretches. Claude's work still shows on the band while it runs, and the session carries on after. `/winter focus stop` ends it early.
- `/winter sound on` plays a soft chime when Claude answers, a bell when a focus session ends, and a pop for a commit or a push; `/winter sound off` stops them. They are off until you turn them on, and the chime that answers `/winter sound on` says which player played it. They play on macOS, Windows and Linux alike, with the system's own player, the first that runs, and at the same loudness with each:
  - macOS: `afplay`, part of macOS.
  - Windows: .NET's SoundPlayer through PowerShell, both part of Windows, with no window. The sound's path reaches it in a variable, so a folder name with any character in it plays.
  - Linux: PipeWire's `pw-play`, PulseAudio's `paplay` or ALSA's `aplay`, which between them cover every desktop distribution; else `ffplay`, `mpv`, `gst-play-1.0`, `cvlc`, `play` or `canberra-gtk-play`. A Claude Code started outside the desktop session is pointed at the user's own sound server.
  - WSL: a Linux player if one is installed, else Windows' own, across the border.
  - With no player at all, the mod says what would play them, and looks again every ten minutes and at the next `/winter sound on`.
- `/winter` on its own says how it is set, and how long a focus session has left.

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

مود شتوي لـ Claude Code: ألوان يوم ثلجي في الوضع الفاتح وليلة شتوية في الوضع الداكن، وثلج يتساقط ببطء خلف المحادثة، وشخصية Claude البكسلية في شريط صغير فوق صندوق الكتابة. بين الأدوار تطارد الشخصية، بقبعتها الصوفية ووشاحها المخطط، الشرارة البرتقالية على طريق ثلجي: تسقط ندفة ثلج على الشرارة فتعطس وتطيّرها فيتطاير الشرر على الشخصية فترمش، وحين تعود الشخصية إلى البيت تغوص الشرارة في الثلج وتختبئ حتى تقفز منه فجأة عند وصولها، وتنزلق الشخصية على الجليد بذراعين ممدودتين وتلوّح لرجل الثلج، وتذوب آثار أقدامها ببطء. والثلج مقياس لسياق المحادثة: كلما امتلأ السياق تراكم الثلج أكواماً على امتداد الشريط، فإذا ضُغطت المحادثة حملت الشخصية مجرفة وأزاحته. ورجل الثلج يُبنى على مدى الأيام: في اليوم الأول كرة ثلج، ثم يُضاف إليه كل يوم تستخدم فيه Claude Code جزءٌ جديد (رأسه، فوجهه، فجزرته، فذراعاه اللتان تلوّحان، فقبعته)، وتمنحه الإجابات هدايا (وشاحاً عند ٢٠ إجابة، ومكنسة عند ٦٠، ونجمة ذهبية على قبعته عند ١٥٠)، ويبقى محفوظاً بين الجلسات. وفي المهام الطويلة تُغرس راية صغيرة كل دقيقة على امتداد الثلج، فإذا انتهت مهمة طويلة بإجابة غُرست راية كبيرة بنجمة. وعند كل commit ناجح تلوّح الشخصية براية خضراء، وعند كل push ترمي كرة ثلج إلى السماء فيلمع نجم مكانها.

وحين ترسل رسالتك تصعد من صندوق الكتابة طائرةً ورقية، فتلتقطها الشخصية وتفتحها وتقرأها، ثم تتفاعل معها: تحمرّ خجلاً وترقص وفوقها قلب إن شكرتها أو أثنيت عليها، وتنتفض بعلامة «!» وتتطاير منها قطرة عرق إن كانت رسالتك عاجلة فيعمل الشريط كله أسرع طوال ذلك الدور، وتحكّ رأسها تحت «؟» إن سألت سؤالاً. وبينما يعمل Claude تمثّل الشخصية ما يفعله: تكتب على حاسوب صغير وتتوقف لتفكّر حين يفكّر، ويحطّ عصفور على قبعتها أحياناً. وحين يعدّل الملفات تكتب بسرعة وتطير رموز الشيفرة `<>` من حاسوبها إلى الشرارة، وحين يقرأ تمسك كتاباً مفتوحاً وتقلّب صفحاته، وحين يشغّل أمراً تشدّ ذراع طرفية صغيرة، وحين يبحث في الويب تنظر بمنظارها بعيداً. وإن احتاج Claude إذنك تغلق حاسوبها وترفع يدها ملوّحة وفوقها «؟» حتى تجيب. وكلما طال عمل Claude وكثرت أدواته ازدادت الشرارة حرارة: تدور أسرع وتتوهج أكثر ثم تتطاير منها الجمرات، وإذا انتهى دور شاق بإجابة أطلقت ألعاباً نارية. ولكل وكيل يرسله Claude يظهر مساعد صغير بقبعة ملونة في آخر الشريط يحمل طرداً، ويعود حين ينتهي وكيله. ثم تقفز فرحاً تحت علامة ✓ خضراء حين يصل الرد، أو تُظهر «؟» إن انتهى الدور بلا رد.

ويمتد الشريط بعرض المساحة كلها حتى 1200 بكسل، فيتوزع الطريق ورجل الثلج والجليد على العرض، وتقطعه الشخصية أسرع كلما اتسع.

ولكل حركة لمستها: تتأخر كرة القبعة خلف حركة الشخصية، ويتمطّى جسمها حين تقفز وينضغط حين تهبط ويتطاير الثلج حول قدميها. وإن تُرك الشريط لحاله دقيقتين جاءه زائر: بطريق أزرق صغير يتهادى ثم ينزلق على بطنه فوق الجليد ويتراشق بكرات الثلج مع رجل الثلج ثم يمضي، وفي الليالي الصافية يعبر السماءَ شهابٌ بين حين وآخر، ويتماوج الشفق القطبي فوقها كل سبع دقائق تقريباً. والأمر `/winter sound on` يشغّل الأصوات: رنّة حين يجيب Claude، وجرس عند نهاية جلسة التركيز، ونقرة لكل commit أو push، على الأنظمة كلها بمشغّل النظام نفسه وبالارتفاع ذاته: `afplay` على macOS، وSoundPlayer عبر PowerShell المدمج في Windows دون أي نافذة، وعلى Linux ‏`pw-play` أو `paplay` أو `aplay` التي تغطي توزيعات سطح المكتب كلها (ثم `ffplay` و`mpv` و`gst-play-1.0` وغيرها إن لم توجد)، وفي WSL مشغّل Linux إن وُجد وإلا مشغّل Windows نفسه. وتخبرك رسالة الأمر بالمشغّل الذي عزف الرنّة، وإن لم يوجد أي مشغّل أخبرتك بما يلزم وأعاد المود البحث كل عشر دقائق.

مرّر الفأرة فوق الشريط فيتوقف كل شيء وتلوّح الشخصية وعيناها تتبعان مؤشرك يميناً أو يساراً أو تنظر إليك مباشرة، وانقر عليه فتقفز ويظهر فوقها قلب. والأمر `/winter focus` يبدأ جلسة تركيز مدتها ٢٥ دقيقة (أو `/winter focus 50` لخمسين دقيقة، حتى ١٨٠): تجلس الشخصية في الثلج مغمضة العينين وتنطفئ أشعة الشرارة الإحدى عشرة واحداً تلو الآخر، ثم يرنّ جرس فوق الشرارة وتنهض الشخصية وتتمطّى، و`/winter focus stop` ينهيها مبكراً. والأمر `/winter calm` يوقف الحركة، و`/winter off` يخفي الشريط، و`/winter on` يعيد الحركة، ويبقى اختيارك محفوظاً لجلساتك القادمة.

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
- `hooks/git.ts`: which shell commands commit or push, for the band to cheer.
- `hooks/snowman.ts`: the snowman's build over days, kept in the mod's store.
- `sounds/`: the chime, the bell and the pop, made from sine waves by `node tools/make-sounds.mjs` as 16-bit mono WAV, the one format every system's player reads, at the loudness they play at.
- `hooks/sound.ts`: which player plays them on each system, found by trying each in turn, with no shell.
- `hooks/scene.ts`: the snowfall backdrop and its skies.
- `hooks/time.ts`: the sky, the occasion and the lateness, read from this machine's clock; Ramadan by the Umm al-Qura calendar.
- `hooks/palette.ts`: the winter colors, generated by `node tools/make-palette.mjs`.
- `tests/winter.test.tsx`: run with `claude plugin test .`. Check the whole mod with `claude plugin validate .`.

## License

MIT, for everything here except `hooks/make-colors.js` and `hooks/make-colors.d.ts`. Those two come unchanged from Claude Code's mod-authoring kit, which has every mod carry them, and are not covered by this repository's license.
