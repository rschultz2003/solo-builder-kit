# Forensic pre-ship audit

Run this before you ship a feature — paste it into Claude Code and point it at the relevant files. It's the prompt I use to catch what I'd otherwise find out from an angry user.

---

Do a forensic audit of **[feature / files]**. Assume it's going in front of real users tomorrow, and your job is to find everything that will embarrass me. Go surface by surface — don't summarise, inspect.

Report gaps in:

- **Functionality** — does every path actually work? Loading, empty, error and success states. What happens when the network fails, the input is weird, or the user does things in the wrong order?
- **Edge cases** — first-time user with no data, huge amounts of data, slow connection, double-taps, the back button, refreshing mid-flow.
- **State & data** — anything that can get into a broken or inconsistent state; anything irreversible that has no confirmation.
- **Security & privacy** — input validation, auth checks, anything exposing data it shouldn't, secrets in the wrong place.
- **Styling & polish** — misalignment, overflow, contrast, dark mode, small screens, anything that looks unfinished.
- **Copy** — anything confusing, placeholder text left in, inconsistent tone.

For each issue: where it is, why it matters, and how bad it is — **blocker / should-fix / polish**. Don't reassure me. Find the problems.
