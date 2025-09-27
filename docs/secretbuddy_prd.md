# SecretBuddy Product Requirements & Design Document

## 1. Vision

SecretBuddy is a daily mystery companion experience that nudges Gen Z and younger millennials to stay curious, playful, and socially connected. Every day, each member is paired with a surprise buddy, receives whimsical prompts, and must respond with mood-setting emojis or 10-second ambient videos. A nightly reveal gives pairs one minute to decide if they want to keep chatting—only mutual interest unlocks a persistent connection. The experience blends daily rituals, scarcity, and gamified rewards to drive retention without sacrificing safety.

## 2. Goals & Success Metrics

| Horizon          | Goals                                                 | Success Indicators                                                               |
| ---------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| H1 (MVP launch)  | Validate core loop (daily prompt → response → reveal) | • D1 retention ≥ 45% • ≥ 65% of daily matched users submit at least one response |
| H2 (3–6 months)  | Grow network effects & streak retention               | • 14-day streak completion ≥ 30% • Average daily matches per active user ≥ 0.9   |
| H3 (6–12 months) | Monetize cosmetics and premium matchmaking            | • ≥ 15% of MAU engage with cosmetics store • Premium conversion ≥ 3%             |

Qualitative measures: feedback on delight, feelings of mystery, perceived safety, and low social anxiety.

## 3. Target Audience & Personas

1. **The Curious Challenger (17–22)**
   - Early adopter of social trends, loves streaks, enjoys surprise interactions.
   - Needs fast, expressive interactions without awkwardness.
2. **The Cozy Connector (23–28)**
   - Values low-commitment daily rituals, interested in new connections but selective.
   - Appreciates safe spaces, wants control over who can reach them.
3. **The Circle Keeper (16–20)**
   - Wants to keep friend group engaged through playful challenges.
   - Prefers friends-only or country-only modes, values shared streaks and badges.

Accessibility and inclusivity: ensure prompts are culturally neutral, provide captioning for video responses, and support screen readers.

## 4. Core Feature Requirements

### 4.1 Onboarding

- Collect name, age (must be ≥ 14), and country.
- Consent flow for Terms of Service and safety policies.
- Game mode selection: Friends-only, Country-only, Global.(This will be in the home mode when pairing)
- Capture friend graph via optional contact sync or invite codes (consent-based).

### 4.2 Daily Matching Loop

- Scheduler pairs users each morning according to chosen mode.
- Matches prioritize mutual availability windows and streak continuity.
- Show "Mystery Buddy" card with blurred avatar silhouette, gradient background, and countdown to nightly reveal.

### 4.3 Prompts & Responses

- Push notification and in-app banner for daily prompt at configurable time.
- Users respond with:
  - Emoji (pre-curated reactions). No text.
  - 10-second video clip captured in-app or uploaded (selfie detection applied, face blocking enforced).
- Send gentle reminders pre-reveal if no response yet.
- Prompt library curated to avoid sensitive topics (no identity exposure, no self-harm triggers).

### 4.4 Nightly Reveal & Timed Chat

- Between 21:00–22:30 local time, identity reveal animation (blur → focus, gradient flash) triggers if both buddies submitted a response.
- Countdown timer (60 seconds) for mutual choice: Continue vs. Pass.
- Chat window opens for 1 minute with ephemeral text + emoji.
- If both select Continue within window, convert to full chat room with history preserved from reveal minute onward.

### 4.5 Persistent Chat & History

- Continued chats move into **Matches** tab.
- Regular chat UI (text, emoji, optional GIFs), with safety filters.
- Allow snooze or mute from chat options.

### 4.6 Gamification & Progression

- Scoring rules: emoji = +10 pts, video = +25 pts, streak bonus +5 per consecutive day.
- Badges for streak milestones (3, 7, 14, 30 days) and prompt variety.
- Points feed leaderboards among friends, country, and global tiers.
- Cosmetic unlocks (frame gradients, badge flair) purchasable via points or future premium currency.

### 4.7 Safety Controls

- Face detection on video uploads; reject or blur if faces found.
- Report/Block options on reveal and in chats.
- Moderation queue for flagged content with escalation pipeline.
- Age gating: users under 18 restricted from Global mode unless parental consent optional? (Open policy decision).
- Community guidelines accessible from Profile.

### 4.8 Notifications

- Daily prompt notification.
- Reminder notifications before reveal.
- Reveal-time alert.
- Streak status, badge unlocks, leaderboard placements.
- All notifications respect quiet hours and user preferences.

## 5. User Journeys

1. **First-time Onboarding**
   - Install → Splash gradient → Name/Age/Country → Mode selection → Friend graph input → Tutorial overlay (primary loop explanation).
2. **Daily Loop**
   - Morning: Mystery Buddy card appears with prompt.
   - Day: respond via emoji or video → earn points immediately → see progress tracker.
   - Evening: identity reveals with animation → timed chat → mutual decision.
3. **Streak Recovery**
   - Missed response triggers gentle push next day; provide "streak freeze" item (future premium).
4. **Safety Escalation**
   - User reports content → immediate acknowledgment → optional block → moderation review.

## 6. Functional Requirements Summary

| Feature               | Priority | Description                                                   |
| --------------------- | -------- | ------------------------------------------------------------- |
| Account creation      | P0       | Email/Apple/Google sign-in with basic profile collection      |
| Mode selection        | P0       | Store preference to drive matching filters                    |
| Daily matching engine | P0       | Batch process to pair users per mode and scheduling slots     |
| Prompt delivery       | P0       | Manage prompt templates, send notifications, track responses  |
| Selfie detection      | P0       | Automated check on uploaded media                             |
| Reveal & timed chat   | P0       | Synchronized reveal event with countdown and decision capture |
| Persistent chat       | P1       | Full chat after mutual continue                               |
| Points & streaks      | P1       | Calculation engine, badge unlock logic                        |
| Leaderboards          | P2       | Friends/country/global rankings                               |
| Cosmetics store       | P2       | Unlockable frames, backgrounds                                |
| Moderation tooling    | P0       | Admin dashboard for reports, escalation                       |

## 7. Content & Prompt Strategy

- Curated prompt library with tags (mood, context, difficulty).
- Daily rotation ensures variety (no repeats within 14 days).
- Support localized versions per country.
- Provide fallback prompts if user joins mid-day.

## 8. Accessibility & Localization

- High contrast gradients with accessible color ratios for text overlays.
- Captions or auto-transcription for video responses.
- Localize UI and prompts for top regions (EN, ES, FR, PT-BR, DE).
- Provide haptic feedback for countdown, animations for notifications.

## 9. Analytics & Telemetry

Metrics to capture:

- Daily active users, submission rates, reveal participation.
- Funnel: prompt delivered → opened → response submitted → reveal attended → continue decision.
- Streak retention, badge acquisition, leaderboard visits.
- Safety metrics: reports per 1k sessions, false positives on selfie detection.
- Notification CTR and opt-out rates.

## 10. Open Questions & Assumptions

- Facial detection implementation choice (cloud vs. on-device) impacts latency and privacy; to be decided during technical spike.
- Should under-18 users be matched with over-21? Default assumption: restrict cross-major/minor pairing.
- Monetization timing: assume post-MVP once core retention validated.
- Legal compliance: confirm COPPA, GDPR, and regional data residency obligations.

## 11. Technical Architecture Overview

### 11.1 High-Level Component Map

- **Mobile Clients (iOS-first, Android later)**
  - SwiftUI front-end with Combine for reactive data, AVFoundation for video capture, CoreML for optional on-device face detection.
  - Local cache (SQLite/Core Data) for prompts, streak status, and offline submissions.
- **API Gateway / BFF**
  - GraphQL or REST facade (likely AWS API Gateway + Lambda or Node/Kotlin Ktor service on managed Kubernetes) to tailor payloads per client and handle auth (Cognito / Firebase Auth).
- **User & Identity Service**
  - Stores profiles, preferences, friend graph.
  - Enforces age-based mode restrictions, GDPR consent, notification settings.
- **Matching Service**
  - Batch job (AWS Step Functions or cron-triggered Lambda) generating daily pairs based on mode, availability, streak continuity.
  - Uses Redis/ElastiCache to ensure idempotency and avoid duplicate pairings.
- **Prompt Service**
  - Manages prompt templates, localization, scheduling, and A/B experiments.
- **Engagement Service**
  - Calculates points, streaks, badges.
  - Emits events to analytics pipeline.
- **Media Processing Pipeline**
  - Ingest via pre-signed S3 URLs.
  - Triggered Lambda / containerized workers run:
    - Selfie detection (Google Vision, AWS Rekognition, or on-device model fallback).
    - Transcoding to adaptive bitrates (AWS MediaConvert / FFmpeg in ECS Fargate).
    - Thumbnail generation with blur effect until reveal.
- **Real-time Chat Service**
  - WebSocket gateway (AWS AppSync, Ably, or custom using WebSockets on API Gateway).
  - Message store in DynamoDB or MongoDB with TTL for ephemeral chats.
- **Notification Service**
  - Schedules and sends push notifications (Firebase Cloud Messaging, Apple Push Notification service).
  - Integrates with engagement service for streak reminders.
- **Moderation & Safety Service**
  - Handles user reports, automated flagging, admin review tooling.
  - Integrates third-party trust & safety partners if needed.
- **Analytics & Data Warehouse**
  - Event stream via Kinesis/Segment → Snowflake/BigQuery.
  - Real-time dashboards (Looker/Metabase) for KPIs.

### 11.2 Data Storage Choices

| Data Type                   | Store                                   | Notes                                                 |
| --------------------------- | --------------------------------------- | ----------------------------------------------------- |
| User profiles & preferences | PostgreSQL / Aurora                     | Strong consistency, relational joins for social graph |
| Friend graph edges          | Neo4j or PostgreSQL adjacency           | If complexity remains low, keep in relational DB      |
| Daily matches               | Redis (short-term) + PostgreSQL archive | Fast lookups during reveal window                     |
| Prompts & localization      | PostgreSQL / Contentful CMS             | Content tooling for non-engineers                     |
| Media assets                | Amazon S3 (separate buckets per region) | Encrypted at rest, lifecycle rules                    |
| Chat messages               | DynamoDB / MongoDB                      | TTL + auto-archival for expired chats                 |
| Telemetry events            | Kinesis → S3/Snowflake                  | Batch analytics, ML features                          |

### 11.3 Key Workflows

1. **Daily Matching Job**

   1. Scheduler fetches eligible users grouped by mode.
   2. Apply constraints (age brackets, prior pairing cooldowns, friend graph).
   3. Persist match pairings with match_id and reveal window.
   4. Publish "match_created" events to prompt service for personalized reminders.

2. **Prompt Delivery & Response Capture**

   1. Prompt service selects prompt for each user (ensuring variety and A/B experiment alignment).
   2. Notification service sends push; client fetches prompt via BFF.
   3. User submits emoji or uploads video using pre-signed URL.
   4. Media pipeline processes video; upon success, engagement service awards points and updates streak.

3. **Reveal & Timed Chat**

   1. At reveal window, matching service triggers reveal event for pairs with valid responses.
   2. Client receives WebSocket event, plays reveal animation, displays countdown.
   3. Continue/Pass decisions posted via BFF, persisted with compare-and-set to avoid duplicates.
   4. Mutual continue → chat service creates persistent room; otherwise mark match complete and queue next-day matching.

4. **Safety & Moderation**
   1. Automated detectors flag media → moderation service logs case.
   2. User reports escalate to human review via admin console.
   3. Tiered actions: warning, temporary suspension, permanent ban.

### 11.4 Non-functional Requirements

- **Scalability:** target up to 500k DAU within first year; design stateless API nodes behind auto-scaling. Use CDN for media delivery.
- **Latency:** prompt fetch < 300ms, chat message RTT < 150ms in primary regions.
- **Availability:** 99.9% for matching and chat subsystems during reveal window.
- **Compliance:** GDPR data deletion workflows, encrypted storage, audit logging for moderation actions.
- **Observability:** distributed tracing (OpenTelemetry), alerting for failure rates in matching, media processing, face detection accuracy.

## 12. UI & Experience Guidelines

### 12.1 Design Language

- **Visual Tone:** playful yet clean; lean on gradient backgrounds (purple→pink, teal→blue) with subtle noise texture. Primary brand color: `#8A46FF`; secondary accent: `#FF5DA2`; success accent: `#2EE6A9`.
- **Typography:** SF Pro / Inter bold for headings (32/24/18 pt weights), regular for body (16 pt), microcopy at 13 pt. Maintain strong hierarchy with uppercase pill labels.
- **Iconography:** rounded line icons with duotone gradient fills for mystery elements (question marks, masks, sparkles).
- **Spacing:** 8pt grid; key cards use 20pt padding, bottom sheets with 24pt top padding.

### 12.2 Navigation Structure

- **Bottom Tab Bar (4 tabs):** Home, Matches, Points, Profile. Use floating center button for quick prompt response during active window.
- **Global actions:** top-right ellipsis for settings/help. Swipe gestures to move between tabs optional but consider haptic feedback.
- **Onboarding Flow:** full-screen cards with progress dots, pinch-to-dismiss transitions disabled to enforce reading.

### 12.3 Core Screens

1. **Home (Daily Prompt)**

   - Gradient background matching prompt theme.
   - Mystery buddy card: blurred silhouette (animated shimmer), countdown chip, prompt text, response buttons.
   - Response CTA: pill buttons for emoji tray (bottom sheet) and "Record 10s" (modal recorder with circular progress ring).

2. **Reveal Screen**

   - Pre-reveal: blurred avatar with animated particles orbiting.
   - Reveal animation: blur → pixel dissolve → fade-in with name; timed countdown (TikTok style) in top-right, neon outline pulsing.
   - Continue/Pass buttons appear after 3-second reveal dwell.

3. **Timed Chat**

   - Dark translucent overlay to emphasize urgency.
   - Large countdown timer at top, message bubbles minimal with gradient outlines.
   - Show streak and points earned inline to reinforce motivation.

4. **Matches Tab**

   - Cards grouped by "Active mystery" (today), "Ongoing chats", "Expired".
   - Each card shows streak progress ring and quick action icons (mute, block).

5. **Points & Streaks**

   - Leaderboard segmented controls (Friends / Country / Global).
   - Badge shelf with locked states faded and animated unlock confetti.

6. **Profile**
   - Hero gradient with name, age, country, current streak.
   - Settings list (notifications, privacy). Include quick link to community guidelines and report history.

### 12.4 Interaction & Motion Principles

- Use 180–240ms ease-in-out transitions for screen changes; 120ms micro-interactions.
- Countdown timers should have subtle scale pulses each second and a stronger pulse last 5 seconds.
- Reveal animation should combine blur reduction, light sweep, and particle burst synchronized with haptic feedback.
- Emoji response selection triggers haptic tap + floating emoji animation toward points counter.
- Video recording UI uses circular progress ring with gradient sweep; failing face detection shows shake animation + tooltip.

### 12.5 Accessibility & Inclusivity

- Minimum tap target 48px.
- Provide text alternatives for animations; allow reduce-motion toggle that switches to fade transitions.
- Ensure color contrast ratio ≥ 4.5:1 for text over gradients by using dark overlay layers (40% black) under typography.
- Support dynamic type adjustments (iOS) and high-contrast mode color palette.

### 12.6 Branding Elements

- **Logotype:** rounded sans serif with hidden question-mark motif.
- **Mascot:** optional silhouette figure with gradient cape for onboarding and empty states.
- **Sound Design:** soft chimes for reveal, muted pops for emoji submissions (with disable option).

## 13. Development Roadmap

### 13.1 Phase Breakdown

| Phase                                   | Duration | Objectives                                             | Key Deliverables                                                                                                                    |
| --------------------------------------- | -------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Foundations (Weeks 0–4)**             | 4 weeks  | Establish core infrastructure and spike critical risks | • Auth + profile API • Face detection prototype • Prompt CMS admin • Design system tokens                                           |
| **MVP Alpha (Weeks 5–10)**              | 6 weeks  | Build daily loop end-to-end with emoji responses       | • Daily matching scheduler • Prompt notifications • Reveal countdown & decisions • Basic streak counter • Internal TestFlight build |
| **Closed Beta (Weeks 11–16)**           | 6 weeks  | Add video pipeline, moderation, expanded gamification  | • Video upload + processing • Points & badges • Safety reporting flow • Analytics dashboards • 1k user invite program               |
| **Public Launch (Weeks 17–22)**         | 6 weeks  | Polish UI, scale backend, release to App Store         | • Persistent chats • Leaderboards • App Store assets • Incident response runbooks • Marketing landing page                          |
| **Growth & Monetization (Post-launch)** | ongoing  | Optimize retention, explore cosmetics & premium        | • Cosmetic store • Streak freeze item • Advanced matchmaking • AB testing framework                                                 |

### 13.2 Workstreams & Dependencies

- **Product & Design**
  - Finalize brand kit, motion guidelines by Week 4.
  - Conduct prototype usability tests Weeks 6 and 12.
- **Engineering**
  - Backend infra (CI/CD, IaC) ready before Week 5.
  - Video pipeline gating MVP release; prioritize reliability + cost optimization.
- **Safety & Legal**
  - Draft community guidelines and moderation SOP by Week 8.
  - Privacy impact assessment prior to Closed Beta.
- **Growth & Community**
  - Recruit beta cohort, set up feedback loops (Discord, in-app surveys).
  - Plan referral incentives for launch.

### 13.3 Risks & Mitigations

- **Face Detection Accuracy**: run dual-provider tests (Google Vision + on-device) and add manual review fallback; communicate clearly if upload rejected.
- **Evening Concurrency Spikes**: performance test matching and chat services with load replay; auto-scale rules to handle reveal window surge.
- **Content Safety**: invest early in moderation tooling and keyword filters; partner with trust & safety advisors.
- **Streak Fatigue**: design streak recovery mechanics (freeze token, grace days) post-launch if drop-offs observed.

### 13.4 Team Composition Suggestion

- 1 Product Manager, 1 Product Designer (motion savvy), 2 iOS engineers (SwiftUI/Combine), 1 Android engineer (phase 2), 2 backend engineers (matching/media/chat focus), 1 ML engineer (vision pipeline), 1 QA/Automation, 0.5 DevOps/SRE, 1 Community & Safety lead.
