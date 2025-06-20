# gMail clone with enhanced workflows
[original wishlist here](https://github.com/Beej126/GmailZero)... geez, has it been 4 years!?! 


<img src="https://github.com/user-attachments/assets/3399bff8-4de3-412b-9efb-d32ed748f21f" width="500" />

<br/>
<br/>

# Install & Run
1. clone the repo
1. [generate & apply your own google credentials for gmail api access](google_auth_readme.md)
1. easy startup Windows batch files provided in root folder:
   - run_dev.cmd
   - run_build.cmd

*this will not be bundled up as a full fledged standalone application for the foreseeable future*

<br/>

# Tech Stack
- React (v19.1 currently)
- Typescript
- [RSBuild](https://rsbuild.rs/)  as the bundler/transpiler (seems to be a great modern CRA alternative)
  - [pluginTypeCheck](https://github.com/rspack-contrib/rsbuild-plugin-type-check) for typescript syntax checking (see in rsbuild.config.ts)
- MUI component library
- GMail API
- simple Context based data store

<br/>

# Features
- light/dark mode
- all user settings saved to local storage
- fair amount of regex effort on mapping css color patterns to contrast equivalents in dark mode =)
- working attachments handling
- including built-in PDF viewer

<br/>

<hr>
generated with VSCode Copilot in `Agent` mode with `Claude 3.7 Sonnet` model
- prompt: `create a react project named "gMaelstrom" that is a gmail clone, typescript build with rsbuild, context data store (no redux), css grid for main page layout, google authentication, and populated with actual user emails from gmail cloud`

- this being my first real experience with copilot AI "vibe" style coding was a real treat...
  - created the google auth, main pages, email list & email detail components all without intervention, blew me away...
  - responses included fantastic instructions to create google auth api key which was something i was dreading
  - i had a working react app that loaded my actual emails within a couple hours (admittedly i've been coding a react project at work for 5 years now and have strong familiarity with react paradigm)
  - as i continued to expand into more complex functionality (settings menu, loading complex emails with crazy mime embeded images, dark mode) several things did need some cancel/retry loops with copilot and manual editing

<br/>

# Current TBDs
1. there's a mild read/unread transition bug... click into unread email, it should auto flip to read, but then manually flip it back to unread and return to email list, then go back into it and it will NOT auto flip to read at this point, fun =)
1. next enhancement i want to make the email detail land in the same space as the email list versus taking over the whole page
1. then **resizable** column headers on the email list, which persist to local storage like everything else... 
1. the attachment icon doesn't show up for a current email in the inbox (nike registration), check that out
1. and establish a good default width of subject and snippet

<br/>
<br/>
<hr>
PS- if anyone is out there listening, can we please please please get a big monitor that finally really hits the mark for programmers:
# 50-inch 5k2k 21:9 IPS 120+Hz

money is no object =) and no, the new LG 49gx950A-B doesn't quite make the cut, too small and not a good panel for text
