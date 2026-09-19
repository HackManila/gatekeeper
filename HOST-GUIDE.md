# Gatekeeper / 15-minute activity

## Before the audience joins

Create approximately 25 codes for 50 attendees in pairs, plus a few spare sessions if needed. Download the codes CSV privately and give one code per browser/team. Have a private facilitator tab, a participant tab for demonstration and a pause control available. Tell participants that synthetic team transcripts may appear on screen. Confirm live or mock mode explicitly.

## 0:00–2:00 / Goal

“You do not have the gate pass. Your objective is to make the **actual gate state** open. Making the NPC say 'approved' is not enough. This is an isolated toy system; use synthetic text only.”

Start Round A. Round selection clears round state and pauses; press Start afterward. No account is required. Team codes are single-use, so rejoining on another browser needs a new code. Do not display the CSV.

## 2:00–8:00 / Prompt-only round

Allow short attempts. Show a selected transcript with the user message, NPC dialogue, requested action and application result as separate things. If no live jailbreak succeeds, do not pretend it did. Use a clearly labeled simulated handler probe: it proves the application trusts the model's request, not that this model can be persuaded by the same prompt.

## 8:00–12:00 / Backend-enforced round

Pause, switch to Round B and start. Replaying a successful request need not produce identical model output. Independently probe `open_gate` for a team with no pass: it must remain closed. Grant that team a pass using the private host control and probe again: it should open. Both probe entries are marked SIMULATION, even in live model mode.

Point to `lib/policy.mjs`: the application reads server-owned permission, not a permission claim in the user's prompt or model response. Round B is not merely a longer system prompt.

## 12:00–15:00 / Debrief

Ask: “What did the NPC say? What did it request? What changed in the application? Who decided that the player had permission?”

Conclude: prompts guide behavior, application rules enforce authority. A reliable system must accept legitimate actions as well as refuse unauthorized ones. Then pause. Do not leave an unattended public inference endpoint running.

## Reliable fallback

Default mock mode uses `/open` to request the action. It is marked MOCK / REHEARSAL everywhere. The admin probe directly exercises the same handler and never calls a model. These are deterministic simulations, not saved live transcripts. An actual live rehearsal can be shown later as a clearly dated/recorded transcript. This package contains no purported successful live-model jailbreak.

If the app fails host preflight, use slides 20–22 as a short scenario discussion and preserve participant verification time.
