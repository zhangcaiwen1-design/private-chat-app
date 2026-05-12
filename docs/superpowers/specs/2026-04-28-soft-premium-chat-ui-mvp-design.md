# Soft Premium Chat UI MVP Design

Date: 2026-04-28

## Context

The current chat UI uses a dark black-and-gold private-system style. The user noted that the main private chat targets are women, so the current tone feels too masculine, hacker-like, and less approachable. The user also noted that some top buttons sit too high and are uncomfortable to tap on a phone.

Future versions may support multiple selectable themes. For the MVP, use one fixed theme first and avoid building a theme system now.

## Goal

Replace the private chat screens with a soft premium visual direction while preserving the existing MVP behavior: calculator disguise, PIN unlock, chat list, chat window, local backend persistence, add contact, lock, text sending, and existing modal flows.

## Visual Direction

Use a warm, refined, feminine-friendly private diary aesthetic:

- Background: cream / warm ivory
- Cards: ivory white with subtle borders
- Primary accent: champagne gold
- Secondary accent: soft rose
- Main text: deep cocoa
- Muted text: taupe gray
- Danger action: soft brick red

The interface should feel private, calm, and premium, not cute, childish, hacker-like, or corporate.

## Scope

Included:

- Redesign `ChatList`, `ChatWindow`, and `MessageBubble` visual styling.
- Keep the calculator entrance believable and low-key; no major change required unless it clashes badly.
- Move top interactive controls into comfortable safe touch zones.
- Ensure top buttons are at least 44x44 points and not visually glued to the screen edge.
- Keep key actions reachable: add contact, lock/stealth, back, burn setting, send, more.
- Keep the current code structure and behavior.

Excluded:

- Building a full theme switching system.
- New onboarding, profile, cloud, or media features.
- Large navigation refactors.
- Final production polish for all secondary modals.

## Layout Plan

### Chat List

Top area:

```text
safe area
12-16px breathing room
Title row: 密谈 / add button
Local privacy status card
```

Main area:

```text
contact cards with avatar, name, recent message, time/status
soft shadows/borders
ample vertical spacing
```

Bottom area:

```text
floating bottom navigation: 密谈 / 联系人 / 隐身
lock/stealth remains reachable from bottom zone
```

### Chat Window

Top area:

```text
safe area
comfortable header with 48x48 back button and 48x48 burn button
center: contact name and short local/private subtitle
```

Main area:

```text
cream background
other messages: ivory bubbles
my messages: champagne or soft rose bubbles
avatars softened, not dark/security themed
```

Bottom area:

```text
voice button / rounded input / plus or send button
all in thumb-friendly bottom region
```

## Usability Rules

- Top tappable controls must be at least 44x44.
- Header should include enough top padding to avoid phone status bar and notch discomfort.
- Bottom controls should remain visually prominent because they are easier to tap.
- Avoid tiny symbolic-only controls where a text label is clearer.
- Do not use overly dark backgrounds on chat screens for this MVP theme.

## Verification

After implementation:

- Run lint.
- Run backend tests to ensure UI changes did not affect server behavior.
- Run Expo export for Android and Web.
- Open Expo Go and visually verify:
  - chat list is warm/light, not black-gold
  - top add/back/burn controls are comfortably lower and easy to tap
  - message bubbles are readable
  - sending a text still works
  - lock returns to calculator
