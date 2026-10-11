# IRYS Hackathon Pitch (2–3 minutes)

## Slide 1 — Title
**Title:** IRYS
**Subtitle:** Blind-by-design observability for privacy-first systems

**On slide (minimal):**
- IRYS
- Blind-by-design observability for privacy-first systems

**Script:**
“Everyone’s watching. Logs, traces, metrics — they see everything. That’s great for reliability, but terrible for privacy.

IRYS is blind-by-design observability for privacy-first systems. It gives you the signals you need to run production, without ever seeing the data you’re supposed to protect.”

---

## Slide 2 — The Problem
**Title:** Observability leaks private data

**On slide:**
- Logs contain secrets
- Traces expose identities
- Compliance is bolted on, not built in

**Script:**
“Today, observability is one of the biggest blind spots in privacy.

- Logs end up full of secrets: tokens, addresses, search queries.
- Traces stitch user actions into a perfect dossier.
- And most teams treat privacy and compliance as an afterthought — something you bolt on with filters and redaction rules that always drift out of date.

For organisations who actually care about privacy, this is unacceptable — but they still need deep visibility when things break.”

---

## Slide 3 — The IRYS Approach
**Title:** Blind by design

**On slide:**
- No raw PII in the pipeline
- Cryptographic tagging, not plain IDs
- Policy is code, not regex

**Script:**
“IRYS starts from a simple rule: the observability pipeline never sees raw personal data.

Instead:
- We replace sensitive fields at the edge with opaque, cryptographic tags.
- We keep the ability to correlate and debug — you can still follow a request or a user journey — but you can’t reverse those tags without the keys.
- And the rules that define what’s sensitive are treated as code, versioned and tested, not scattered regexes in five different services.

The result is visibility for operators, and plausible deniability for everyone else.”

---

## Slide 4 — What IRYS Is (Hackathon Build)
**Title:** What we built this weekend

**On slide:**
- Ingest: IRYS CLI + server
- Transform: blind identifiers & policies
- Output: privacy-respecting event stream

**Script:**
“This weekend we built the first IRYS pipeline.

- An IRYS CLI and client that developers can drop into their services with a single command.
- A server that receives events, applies a privacy policy, and transforms raw data into blind identifiers in real time.
- And an output stream that you can feed into your existing tools — logs, dashboards, or alerts — without leaking the data you’re trying to protect.

You still see errors, latency, and behaviour — but you never see the underlying secrets.”

---

## Slide 5 — Demo Flow
**Title:** Live demo

**On slide:**
- Raw events in
- Sensitive fields out
- Debuggability preserved

**Script (spoken while demoing):**
“I’ll show you three things:

1. First, we send a raw event that includes obvious PII — email, IP, maybe even a token.
2. In the IRYS UI / logs, you’ll see that those fields are never stored. Instead, they’re replaced by stable blind identifiers. You can correlate across events, but you cannot reconstruct the original.
3. Finally, when we change the policy, IRYS automatically starts treating new fields as sensitive, without touching application code.

The system stays debuggable, but the data stays private.”

---

## Slide 6 — Why It Matters
**Title:** Who this is for

**On slide:**
- Journalists & activists’ platforms
- Healthcare & finance
- Any team under real compliance pressure

**Script:**
“This matters for anyone building for people who can’t afford to be exposed.

- Platforms used by journalists, activists, or at-risk communities.
- Healthcare and finance, where a log leak is a regulatory incident.
- And any team that wants to pass a serious privacy or security review without faking their observability story.

IRYS gives them a way to say: ‘We can operate and debug this system, and we literally never store the private data you’re worried about.’”

---

## Slide 7 — Roadmap / Ask
**Title:** Where we’re going next

**On slide:**
- SDKs for major frameworks
- Policy editor & tests
- Looking for pilots & feedback

**Script:**
“From here, the roadmap is clear:

- Ship SDKs for major frameworks so IRYS is a drop-in for new and existing services.
- Build a real policy editor, with tests and static analysis, so privacy rules are as robust as your code.
- And work with early adopters — especially teams handling sensitive data — to stress-test this in real environments.

If you’re building something privacy-critical and you’re tired of pretending your logs are clean, I’d love to talk after this. 

Thank you.”
