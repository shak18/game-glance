# Community testing

Game Glance is maintained in spare time. Volunteer testing helps catch device-specific problems and checks whether new features behave as expected before a wider release. Testing is optional, unpaid, and open to people with different devices and operating systems.

## What this is — and what it is not

- You can use Game Glance and report bugs without joining the tester group.
- You do not need Discord, a paid membership, or a financial contribution to participate.
- Testers are not expected to test every build or respond on a fixed schedule.
- A signup does not guarantee that you will be contacted for every test round.
- Testing builds can contain regressions. Read the test call and release notes before installing them.
- Do not share private or unreleased builds outside the test group unless the maintainer explicitly says they are public.

## Join the tester pool

Use the **Volunteer as a tester** issue form: `https://github.com/michpalm/game-glance/issues/new?template=tester-interest.yml`.

Please include only details you are comfortable making public: device model, OS/distribution and version, and the types of tests you can help with. Do not include email addresses, serial numbers, credentials, or other private information in a public issue. GitHub notifications and mentions are the default way to coordinate.

The project is especially interested in coverage across device models, operating systems, screen sizes, handheld/docked use, and Steam client updates. Please describe your actual setup rather than assuming a device is supported because another device works.

## How a test round works

1. **Test call:** the maintainer posts the build/release, target feature, known limitations, instructions, and a suggested reporting deadline.
2. **Opt in:** testers who have the relevant device and time reply to the call or confirm through GitHub.
3. **Prepare:** record your device, OS version, plugin version, Steam client context where relevant, and whether you are handheld or docked.
4. **Test:** follow the test call and the project's existing `docs/device-checklist.md`. Only test the features and scenarios you are comfortable with.
5. **Report:** post a brief pass/fail result in the test call. If something fails, create a **Device test report** issue and include reproduction steps and relevant evidence.
6. **Close the loop:** the maintainer summarizes what passed, what failed, what remains untested, and whether another build is needed.

A brief **“tested on [device] / [OS] / [version] — passed”** result is useful too. Please do not create a separate issue just to report a successful test unless the test call specifically asks for one.

## What to include in a useful test result

- Exact device/model.
- Operating system/distribution and version.
- Plugin version or test-build identifier.
- Handheld/docked mode and display resolution when relevant.
- Feature and scenario tested.
- Result: passed, failed, partially working, or unable to test.
- For failures: steps to reproduce, expected result, actual result, and whether it happens consistently.
- Screenshots or logs only when helpful.

For Game Glance, the README describes the log location for relevant Spotlight Home errors. Review a log before attaching it and remove personal details or unrelated information. Never attach passwords, access tokens, Steam credentials, or private account data.

## Current coverage notes

Use the compatibility section in the main README as the current source of truth. At the time this guide was prepared, the README reported testing on a ROG Xbox Ally running Bazzite in handheld and docked 1080p-TV use, while Steam Deck and other SteamOS-like devices were not yet described as tested. Update these notes as verified coverage changes; do not mark a device as tested based only on a volunteer signup.

The existing `docs/device-checklist.md` remains the detailed technical checklist. This document explains the community workflow, not a replacement for feature-specific QA instructions.

## Maintainer habits that keep this lightweight

- Recruit for specific test rounds instead of asking everyone to test everything.
- Keep one test call per feature/build and use the same issue form for failures.
- Maintain a simple private coverage note if the public signup issues become noisy.
- Acknowledge useful reports and credit testers in release notes only with their consent.
- Do not promise fast responses, compatibility, or fixes on a particular schedule.
- Keep the stable release path separate from test builds and explain how to return to the stable version.
