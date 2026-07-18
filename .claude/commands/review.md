Review the current changes as if your job is to find what's wrong before it ships. Be direct, not reassuring.

Check for:
- Correctness — does it actually do what was intended?
- Edge cases — empty, null, huge, concurrent, and error paths.
- Silent breakage — anything elsewhere this might quietly break.
- Security — input handling, auth, secrets, injection, anything touching user data.
- Irreversible or risky steps I should do manually rather than you.

List issues by severity: blocker / should-fix / nice-to-have. If it's genuinely solid, say so plainly.
