# TESHOW PING — Master Content Database migration report

Source workbook reviewed before building this migration module.

- Total workbook tabs: 30
- Approved migration tabs: 26
- Intentionally skipped: README, APPS_SCRIPT_SETUP, CMS_USERS, CHANGE_LOG
- Importable records detected: 455
- Duplicate IDs detected: 0
- Referential integrity issues detected across configured artist/series/episode/media links: 0

Expected importable record counts:

- SITE_SETTINGS: 18
- UI_TEXT: 30
- THEME: 15
- FONTS: 3
- NAVIGATION: 5
- SOCIALS: 4
- MESSAGE_LINKS: 3
- PAGES: 5
- SECTIONS: 2
- SECTION_ITEMS: 0
- MEDIA: 15
- ARTISTS: 2
- ARTIST_TIMELINE: 7
- ARTIST_ACHIEVEMENTS: 1
- SERIES: 5
- SERIES_CAST: 26
- EPISODES: 48
- EPISODE_CAST: 232
- GALLERIES: 0
- GALLERY_SETTINGS: 1
- NEWS: 6
- EVENTS: 2
- NOTIFICATIONS: 3
- HOME_FEATURES: 7
- REDIRECTS: 0
- LOOKUPS: 15

Notes:
- Existing media records retain their current Google Drive image URLs during database migration.
- Media file migration to Cloudinary should happen only after Firestore content has been verified.
- Blank rows without the configured legacy ID are skipped.
