# Phase 22E — Meditation Audio + Transcript Mapping

Phase 22E connects the canonical 27 guided practice MP3 filenames, transcript files, and UploadThing URL mapping workflow across the Meditation page, Curriculum, Micro-Learning, and the Advisor/Admin media manager.

## Canonical 27-item mapping

| Item | App area | Practice ID | Title | Expected MP3 filename | Transcript file |
|---|---|---|---|---|---|
| A1 | Meditation | `meeting-your-self` | Meeting Your Self | `01_Meeting_Your_Self.mp3` | `/docs/meeting-self.txt` |
| A2 | Meditation | `cultivating-self-qualities` | Cultivating Self Qualities | `02_Cultivating_Self_Qualities.mp3` | `/docs/self-qualities.txt` |
| A3 | Meditation | `meeting-your-inner-child` | Meeting Your Inner Child | `03_Meeting_Your_Inner_Child.mp3` | `/docs/meeting-inner-child.txt` |
| A4 | Meditation | `reparenting-meditation` | Reparenting Meditation | `04_Reparenting_Meditation.mp3` | `/docs/reparenting.txt` |
| A5 | Meditation | `inner-child-play` | Inner Child Play | `05_Inner_Child_Play.mp3` | `/docs/child-play.txt` |
| A6 | Meditation | `unblending-practice` | Unblending Practice | `06_Unblending_Practice.mp3` | `/docs/unblending.txt` |
| A7 | Meditation | `parts-council-meditation` | Parts Council Meditation | `07_Parts_Council_Meditation.mp3` | `/docs/parts-council.txt` |
| A8 | Meditation | `working-with-firefighters` | Working with Firefighters | `08_Working_with_Firefighters.mp3` | `/docs/firefighter-work.txt` |
| A9 | Meditation | `box-breathing` | Box Breathing | `09_Box_Breathing.mp3` | `/docs/box-breathing.txt` |
| A10 | Meditation | `4-7-8-breathing` | 4-7-8 Breathing | `10_4-7-8_Breathing.mp3` | `/docs/4-7-8-breathing.txt` |
| B1 | Curriculum | `cultivating-self-energy-practice` | Cultivating Self Energy Practice | `11_Cultivating_Self_Energy_Practice.mp3` | `/docs/cultivating-self-energy.txt` |
| B2 | Curriculum | `self-leadership-mastery-practice` | Self Leadership Mastery Practice | `12_Self_Leadership_Mastery_Practice.mp3` | `/docs/self-leadership-mastery.txt` |
| B3 | Curriculum | `safe-place-visualization-inner-child` | Safe Place Visualization for Your Inner Child | `13_Safe_Place_Visualization_for_Your_Inner_Child.mp3` | `/docs/safe-place-visualization.txt` |
| B4 | Curriculum | `body-based-inner-child-connection` | Body-Based Inner Child Connection | `14_Body-Based_Inner_Child_Connection.mp3` | `/docs/body-inner-child-connection.txt` |
| B5 | Curriculum | `unburdening-ceremony` | The Unburdening Ceremony | `15_The_Unburdening_Ceremony.mp3` | `/docs/unburdening-ceremony.txt` |
| B6 | Curriculum | `six-fs-protocol-mastery-practice` | 6 F’s Protocol Mastery Practice | `16_6_Fs_Protocol_Mastery_Practice.mp3` | `/docs/6-fs.txt` |
| B7 | Curriculum | `personalized-wound-healing-action-plan` | Personalized Wound Healing Action Plan | `17_Personalized_Wound_Healing_Action_Plan.mp3` | `/docs/wound-healing-plan.txt` |
| B8 | Curriculum | `reparenting-your-inner-child` | Reparenting Your Inner Child | `18_Reparenting_Your_Inner_Child.mp3` | `/docs/reparenting-inner-child.txt` |
| B9 | Curriculum | `somatic-healing-body-scan` | Somatic Healing Body Scan | `19_Somatic_Healing_Body_Scan.mp3` | `/docs/somatic-healing-body-scan.txt` |
| B10 | Curriculum | `attachment-pattern-reflection` | Attachment Pattern Reflection | `20_Attachment_Pattern_Reflection.mp3` | `/docs/attachment-pattern-reflection.txt` |
| B11 | Curriculum | `befriending-your-inner-critic` | Befriending Your Inner Critic | `21_Befriending_Your_Inner_Critic.mp3` | `/docs/befriending-inner-critic.txt` |
| C1 | Micro-Learning | `breath-anchor` | Breath Anchor | `22_Breath_Anchor.mp3` | `/docs/breath-anchor.txt` |
| C2 | Micro-Learning | `self-compassion-pause` | Self-Compassion Pause | `23_Self-Compassion_Pause.mp3` | `/docs/self-compassion-pause.txt` |
| C3 | Micro-Learning | `quick-parts-check-in` | Quick Parts Check-In | `24_Quick_Parts_Check-In.mp3` | `/docs/quick-parts-check-in.txt` |
| C4 | Micro-Learning | `morning-intention` | Morning Intention | `25_Morning_Intention.mp3` | `/docs/morning-intention.txt` |
| C5 | Micro-Learning | `evening-release` | Evening Release | `26_Evening_Release.mp3` | `/docs/evening-release.txt` |
| C6 | Micro-Learning | `mini-body-scan` | Mini Body Scan | `27_Mini_Body_Scan.mp3` | `/docs/mini-body-scan.txt` |

## Transcript file locations

All transcript text files live in `public/docs`. The application loads them by public URL path (`/docs/*.txt`) through the shared `TranscriptPanel` component.

## UploadThing URL requirement

The app cannot play audio from an MP3 filename alone. Each practice needs an UploadThing file URL (`ufsUrl` / public file URL) saved as `audio_url` in `ifs_meditation_media`. The UploadThing file key, when available, is saved as `uploadthing_audio_key`.

## Accessibility by app area

- Section A is available from `/meditation` and each `/meditation/:practiceId` start page.
- Section B is available from the Curriculum page through the “Curriculum guided practices” panel.
- Section C is available from `/micro-learning`, and `/tools` links to Micro-Learning.

## Transcript display

`TranscriptPanel` shows the heading “Read the Guided Practice,” loads `/docs/*.txt` without `dangerouslySetInnerHTML`, preserves paragraph spacing, and displays “The written transcript is not available yet.” if a transcript is unavailable.

## Missing audio fallback

Audio is optional. If `audio_url` is not mapped, Meditation, Curriculum, and Micro-Learning continue to show written fallback steps and the transcript.

## `/admin/meditation-media` URL mapping

The media manager supports all Section A, B, and C practices. It shows the expected MP3 filename, transcript path, audio URL mapping status, and UploadThing key status. Advisors/Admins can map one practice manually or use “Bulk Map Uploaded Audio” with CSV rows:

```csv
mp3Filename,audioUrl,uploadThingAudioKey
01_Meeting_Your_Self.mp3,https://utfs.io/f/...,abc123
02_Cultivating_Self_Qualities.mp3,https://utfs.io/f/...,abc124
```

The bulk tool previews matched and unmatched filenames before saving records to `ifs_meditation_media`.

## Manual SQL status

No new Phase 22E SQL is required if `neon/033_create_ifs_meditation_media.sql` has already been applied. Phase 21B may still require `neon/032_add_homework_activity_response_json.sql` in environments that have not run it. Do not run `neon/999_backfill_therapist_assignments.sql`.

## Security and scope notes

- No UploadThing secrets are exposed to the frontend.
- No medication features were added.
- Authorization is unchanged: the media manager remains restricted to Advisor/Admin-style roles.
- Audio URLs are user-supplied public file URLs; secret tokens are not accepted or rendered.

## Known limitations

- The actual UploadThing `audio_url` values must be mapped through `/admin/meditation-media` before audio can play.
- The `ifs_meditation_media` table does not include a separate original filename column; filename matching is handled by the canonical source map in application code.
