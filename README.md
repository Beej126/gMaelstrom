# <img src="logo.png" width="35" style="vertical-align: text-bottom" /> gMaelstrom - gMail clone with enhanced workflows

<img src="https://github.com/user-attachments/assets/3399bff8-4de3-412b-9efb-d32ed748f21f" width="500" />

## Install 💾
1. clone the repo
1. create & paste in your [google api access credentials](readme_google_auth.md)

## Run 🚀
 - run_dev.cmd - launches via npm web dev server
 - run_build.cmd - launches via a full compile and 'caddy' web server

## Tech Stack ⚙️
Component | Notes
--- | ---
React | currently v19.1
Typescript | fan of the basic guard rails provided by strong typing
[RSBuild](https://rsbuild.rs/)  | bundler/transpiler (seems to be a great modern CRA alternative)
| <li style="margin-left: 2em">[pluginTypeCheck](https://github.com/rspack-contrib/rsbuild-plugin-type-check) | for typescript syntax checking (see in rsbuild.config.ts)
MUI component library | Copilot chose this based on my prompt. i'm not previously familiar but believe in having some UI library to standardize everything.
GMail API | using the modern google recommend approach of authentication by loading GIS (Google Identity Services) via script tag; and call the gmail api via REST returning into typed datastructers
simple Context based data store | i avoided the boilerplate complexity of redux reducers at the beginning of my react journey on a 4 year production react work project and have never run into a limitation using javascript's native data structures in tandem with react's fundamental re-render-upon-state-object-inequality paradigm

## Features ✨
Component | Notes
--- | ---
integrated calendar | TBD but the #1 feature i'm headed towards... primarily being able to drag/drop an email on a day to create a corresponding calendar entry with the email contents as the body
light/dark mode | including fair amount of regex effort to map all the various css color patterns to RGB *contrast* based equivalents in dark mode
user settings | all persisted to local storage (hidden labels, etc)
attachments | required an incredible amount of handling logic... email attachments standards are pretty loose given their evolution and the gmail api doesn't seem to provide any crutches
| PDF viewer | as part of the attachments handling

## Latest To-Do's 📝
- once a reasonable baseline is achieved i'll move into typical github issues
1. please record for all time that i don't like calling methods "handleXyz", i prefer "onXyz", please rename all of them across the app
1. google api calls have extra unecessary calls to eliminate - there's 429 errors (too many requests) when switching between inbox and trash
1. in header.tsx break each menu out into a separate .tsx file, for example the "settings  menu", "profile menu", etc
1. there's a mild read/unread transition bug... click into unread email, it should auto flip to read, but then manually flip it back to unread and return to email list, then go back into it and it will NOT auto flip to read at this point, fun =)
1. have the email detail land in the same space as the email list versus taking over the whole page
1. **resizable** column headers on the email list, which persist to local storage like everything else... 
   1. good default width of subject and snippet columns
1. the attachment icon doesn't show up for a current email in the inbox (nike registration), check that out

## Calling all Monitor Nerds 📣
if anyone out there in the monitor industry is listening, can we please please please get some big screens that finally hit the mark for programmers vs gamers:

- at least 5k2k if not more...
- given the 21:9 aspect ratio of 5k2k, then at least a **60" diagonal** for text to be readable
- IPS panel
- 120+Hz
- money is no object =) 
- the LG 45GX950A-B circa 2025 doesn't make the font size cut - too physically small to see small text **without any scaling**, and generally a gamer oriented panel, not prioritized for text/productivty
- i'm currently using the 57" Samsung Neo G9 but must run it at 150% scale for the fonts to be large enough for my old eyes... at least even with the scaling, having more horizontal pixels on this 8k2k is slighly better than the 49" 4k Samsung TV from 2017 that really spoiled my exectations this way
- the PPI on the old 4K TV worked out to ~90 which isn't stellar by current PPI expectations but there's a funny tradeoff here that i don't feel is called out well enough => **high PPI DECREASES *usable* resolution**... i understand the idea of "retina" is having more pixels to nuance the edges of text, and that makes some sense on portable devices, but on the desktop, i want all the usable READABLE real-estate i can get to sprawl all the windows required for coding.