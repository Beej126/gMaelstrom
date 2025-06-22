# gMail clone with enhanced workflows
[original wishlist here](https://github.com/Beej126/GmailZero)... geez, has it been 4 years!?! 


<img src="https://github.com/user-attachments/assets/3399bff8-4de3-412b-9efb-d32ed748f21f" width="500" />

<br/>
<br/>

# Install & Run
1. clone the repo
1. [generate & apply your own google credentials for gmail api access](readme_google_auth.md)
   - i don't intend to provide this as a hosted solution for the foreseeable future
   - running this project locally via your own google creds means everyone is in full control of their own security versus entrusting that to me =)
1. easy startup Windows batch files provided in root folder:
   - run_dev.cmd - launches via npm web dev server
   - run_build.cmd - launches via a full compile and 'caddy' web server


## Tech Stack
Component | Notes
--- | ---
React | currently v19.1
Typescript |
[RSBuild](https://rsbuild.rs/)  | bundler/transpiler (seems to be a great modern CRA alternative)
| - [pluginTypeCheck](https://github.com/rspack-contrib/rsbuild-plugin-type-check) | for typescript syntax checking (see in rsbuild.config.ts)
MUI component library | copilot chose this based on my prompt and it's one of the more debatable areas to me... i think it's important to have some 3rd party "standard" driving things versus doing it all in hand coded css/html but sometimes you look at these things and know that plain-jain nested divs would be easier to grok/maintain
GMail API |
simple Context based data store | i avoided the boilerplate complexity of redux reducers at the beginning of my react journey on a 4 year production react work project and have never run into a limitation using javascript's native data structures in tandem with react's fundamental re-render-upon-state-object-inequality paradigm

## Features
Component | Notes
--- | ---
integrated calendar | TBD but the #1 feature i'm headed towards... primarily being able to drag/drop an email on a day to create a corresponding calendar entry with the email contents as the body
light/dark mode | including fair amount of regex effort to map all the various css color patterns to RGB *contrast* based equivalents in dark mode
user settings | all persisted to local storage (hidden labels, etc)
attachments | required an incredible amount of handling logic... email attachments standards are pretty loose given their evolution and the gmail api doesn't seem to provide any crutches
| - PDF viewer | as part of the attachments handling

## CoPilot
generated with VSCode Copilot in `Agent` mode with `Claude 3.7 Sonnet` model

- prompt: `create a react project named "gMaelstrom" that is a gmail clone, typescript build with rsbuild, context data store (no redux), css grid for main page layout, google authentication, and populated with actual user emails from gmail cloud`
- this being my first real experience with copilot AI "vibe" style coding was a real treat...
  - created the google auth, main pages, email list & email detail components all without intervention, blew me away...
  - responses included fantastic instructions to create google auth api key which was something i was dreading
  - i had a working react app that loaded my actual emails within a couple hours (admittedly i've been coding a react project at work for 5 years now and have strong familiarity with react paradigm)
  - as i continued to expand into more complex functionality (settings menu, loading complex emails with crazy mime embeded images, dark mode) several things did need some cancel/retry loops with copilot and manual editing

## Current TBDs
1. there's a mild read/unread transition bug... click into unread email, it should auto flip to read, but then manually flip it back to unread and return to email list, then go back into it and it will NOT auto flip to read at this point, fun =)
1. next enhancement i want to make the email detail land in the same space as the email list versus taking over the whole page
1. then **resizable** column headers on the email list, which persist to local storage like everything else... 
   1. and establish a good default width of subject and snippet
1. the attachment icon doesn't show up for a current email in the inbox (nike registration), check that out

<br/>
<br/>
<hr>
PS- if anyone is out there listening, can we please please please get a big monitor that finally hits the mark for programmers:

- 50-inch
- 5k2k 21:9 aspect ratio
- IPS panel
- 120+Hz
- money is no object =) 
- and no, the new LG 45GX950A-B doesn't quite make the cut - too physically small to see small text **without any scaling**, and generally a gamer oriented panel, not prioritized for text/productivty