# Reflection

The most difficult concept for me was asynchronous JavaScript — specifically,
making sure `fetch` calls, DOM updates, and error handling all happened in the
right order. Early on, I ran into bugs that were invisible just from reading the
code: a `querySelector` pointing at an id that didn't quite match the HTML, or a
`finally` block referencing a variable name I'd mistyped. These bugs didn't show
up until I actually ran the page and watched the Console, which taught me to stop
trusting code that merely "looked right" and to test every feature live before
considering it done — clicking buttons twice, deliberately breaking a URL to
check the error path, and checking DevTools for silent failures.

If I could revise part of my capstone, I'd tighten up my system design
documents earlier in the process rather than writing them last. Looking back,
the sections I understood best — like the load estimates and the reasoning
behind each architecture component — were the ones I'd worked through
carefully with real numbers, not just copied a diagram shape. I'd apply that
same rigor to the API and data model docs from the start next time, rather than
polishing them only after initial feedback.

Next, I want to build a real backend for QuickNotes using Node.js and Express,
so the API design I only wrote on paper this week can actually run. After that,
I'd like to connect it to a real PostgreSQL database instead of a mocked one,
to see how the data model holds up under real queries.