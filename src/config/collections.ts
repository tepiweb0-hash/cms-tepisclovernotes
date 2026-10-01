export type CollectionMeta = {
  key: string
  label: string
  idField: string
  fields: string[]
  display: string[]
  description?: string
}

const defs: Record<string, Omit<CollectionMeta, 'key'>> = {
  site_settings:{label:'Site Settings',idField:'key',fields:['key','value','type','group','description','enabled'],display:['key','value','group','enabled']},
  ui_text:{label:'UI Text',idField:'key',fields:['key','value','description'],display:['key','value','description']},
  theme:{label:'Theme',idField:'token',fields:['token','value','usage','editable'],display:['token','value','usage','editable']},
  fonts:{label:'Fonts',idField:'font_id',fields:['font_id','label','family','google_css_url','role','enabled','sort_order'],display:['label','family','role','enabled']},
  navigation:{label:'Navigation',idField:'nav_id',fields:['nav_id','label','href','page_id','icon','sort_order','enabled','open_new_tab'],display:['label','href','sort_order','enabled']},
  socials:{label:'Socials',idField:'social_id',fields:['social_id','label','platform','url','icon','sort_order','enabled'],display:['label','platform','url','enabled']},
  message_links:{label:'Message Links',idField:'link_id',fields:['link_id','label','url','icon','sort_order','enabled'],display:['label','url','sort_order','enabled']},
  pages:{label:'Pages',idField:'page_id',fields:['page_id','slug','title','nav_label','seo_title','seo_description','status','sort_order','indexable','created_at','updated_at','hero_eyebrow','hero_title','hero_body'],display:['title','slug','status','indexable']},
  sections:{label:'Sections',idField:'section_id',fields:['section_id','page_id','template_key','eyebrow','title','body','media_id','alignment','display_mode','background_style','sort_order','enabled'],display:['page_id','template_key','title','display_mode','enabled']},
  section_items:{label:'Section Items',idField:'item_id',fields:['item_id','section_id','item_type','entity_type','entity_id','title','subtitle','body','media_id','href','button_label','sort_order','enabled'],display:['section_id','item_type','title','entity_type','enabled']},
  media:{label:'Media',idField:'media_id',fields:['media_id','title','url','secure_url','cloudinary_public_id','asset_id','source_url','source_page_url','alt_text','caption','credit','mime_type','format','width','height','bytes','is_webp','status','uploaded_at','sort_order','enabled'],display:['title','status','mime_type','width','height']},
  artists:{label:'Artists',idField:'artist_id',fields:['artist_id','slug','display_name','full_name','native_name','nickname','birth_date','nationality','agency','height_cm','weight_kg','bio','quick_info','profile_media_id','hero_media_id','instagram','x_twitter','tiktok','official_profile_url','mdl_url','status','featured','sort_order','seo_title','seo_description'],display:['display_name','full_name','agency','status','featured']},
  artist_timeline:{label:'Artist Timeline',idField:'timeline_id',fields:['timeline_id','artist_id','date','year_label','type','title','description','source_url','sort_order','enabled'],display:['artist_id','date','title','type','enabled']},
  artist_achievements:{label:'Achievements',idField:'achievement_id',fields:['achievement_id','artist_id','title','organization','date','description','source_url','sort_order','enabled'],display:['artist_id','title','organization','date','enabled']},
  series:{label:'Series',idField:'series_id',fields:['series_id','slug','title','native_title','year','status','synopsis','short_synopsis','poster_media_id','hero_media_id','network','platform','release_day','release_time','rerun_time','premiere_date','finale_date','episode_count','genre','director','official_url','trailer_url','featured','sort_order','seo_title','seo_description','timezone'],display:['title','year','status','release_day','premiere_date','featured']},
  series_cast:{label:'Series Cast',idField:'cast_id',fields:['cast_id','series_id','artist_id','character_name','character_native_name','role_type','billing_order','quick_line','enabled','actor_name','profile_media_id'],display:['series_id','actor_name','artist_id','character_name','role_type','billing_order']},
  episodes:{label:'Episodes',idField:'episode_id',fields:['episode_id','series_id','episode_number','title','slug','release_date','release_time','status','summary','thumbnail_media_id','album_display_mode','source_url','sort_order','enabled','quick_info','full_synopsis','timezone','rerun_time','rerun_platform','duration_minutes','watch_url'],display:['series_id','episode_number','title','release_date','status']},
  episode_cast:{label:'Episode Cast',idField:'episode_cast_id',fields:['episode_cast_id','episode_id','artist_id','actor_name','character_name','role_type','billing_order','profile_media_id','enabled'],display:['episode_id','actor_name','character_name','role_type','billing_order']},
  galleries:{label:'Galleries',idField:'gallery_item_id',fields:['gallery_item_id','entity_type','entity_id','media_id','caption','sort_order','enabled'],display:['entity_type','entity_id','media_id','sort_order','enabled']},
  gallery_settings:{label:'Gallery Settings',idField:'gallery_setting_id',fields:['gallery_setting_id','entity_type','entity_id','display_mode','interval_ms','transition_ms','enabled'],display:['entity_type','entity_id','display_mode','interval_ms','enabled']},
  news:{label:'News',idField:'news_id',fields:['news_id','slug','title','excerpt','body','publish_date','status','hot','hot_score','featured_media_id','source_url','author','sort_order','seo_title','seo_description','related_series_id','related_artist_id','tags'],display:['title','publish_date','status','hot','hot_score']},
  events:{label:'Events',idField:'event_id',fields:['event_id','slug','title','event_type','start_date','end_date','start_time','end_time','timezone','location','online_url','short_info','description','featured_media_id','status','source_url','sort_order','enabled','quick_info','full_info','related_series_id','related_artist_id'],display:['title','event_type','start_date','location','status']},
  notifications:{label:'Notifications',idField:'notification_id',fields:['notification_id','title','message','type','related_entity_type','related_entity_id','publish_at','expires_at','status','priority','link_url','icon','created_at','published_at','enabled','quick_info','full_info','featured_media_id','cta_label'],display:['title','type','publish_at','status','priority']},
  home_features:{label:'Home Features',idField:'feature_id',fields:['feature_id','slot','entity_type','entity_id','title_override','copy_override','media_id_override','button_label','button_href','sort_order','enabled'],display:['slot','entity_type','entity_id','title_override','enabled']},
  cms_users:{label:'CMS Users',idField:'user_id',fields:['user_id','display_name','email','role','enabled','notes'],display:['display_name','email','role','enabled']},
  redirects:{label:'Redirects',idField:'redirect_id',fields:['redirect_id','from_path','to_path','status_code','enabled','notes'],display:['from_path','to_path','status_code','enabled']},
  lookups:{label:'Lookups',idField:'value',fields:['group','value','label','sort_order'],display:['group','value','label','sort_order']},
}

export const COLLECTIONS: Record<string, CollectionMeta> = Object.fromEntries(
  Object.entries(defs).map(([key, value]) => [key, { key, ...value }]),
)

export const FIELD_LABELS: Record<string,string> = {
  display_name:'Display Name',full_name:'Full Name',native_name:'Native Name',artist_id:'Artist',series_id:'Series',episode_id:'Episode',page_id:'Page',section_id:'Section',media_id:'Media Item',profile_media_id:'Profile Photo',hero_media_id:'Hero Photo',poster_media_id:'Poster Image',featured_media_id:'Featured Image',thumbnail_media_id:'Episode Image / Thumbnail',media_id_override:'Section Photo',entity_id:'Linked Item',entity_type:'Linked Item Type',quick_info:'Quick Info',full_info:'Full Info',full_synopsis:'Full Synopsis',summary:'Short Summary',watch_url:'Official Watch Link',source_url:'Source / Reference Link',source_page_url:'Source Page URL',release_date:'Release Date',release_time:'Release Time',publish_date:'Publish Date',publish_at:'Publish Date & Time',start_date:'Start Date',end_date:'End Date',timezone:'Timezone',rerun_time:'Replay Time',rerun_platform:'Replay Platform',cta_label:'Button Label',open_new_tab:'Open In New Tab',seo_title:'SEO Title',seo_description:'SEO Description',sort_order:'Display Order',billing_order:'Billing Order',title_override:'Custom Title',copy_override:'Custom Text',status:'Status',enabled:'Show Publicly',hot:'Hot / Highlighted',indexable:'Allow Google Indexing',role_type:'Role Type',release_day:'Release Day',duration_minutes:'Duration (minutes)',href:'Link URL',url:'URL',button_label:'Button Label',button_href:'Button Link',hero_body:'Hero Description',synopsis:'Full Synopsis',short_synopsis:'Short Synopsis',official_profile_url:'Official Profile',x_twitter:'X / Twitter',instagram:'Instagram',tiktok:'TikTok',link_url:'Destination Link',quick_line:'Quick Cast Line',cloudinary_public_id:'Cloudinary Public ID'
}

export const FIELD_HELP: Record<string,string> = {
  artist_id:'Choose which artist this belongs to.',series_id:'Choose which series this belongs to.',episode_id:'Choose which episode this belongs to.',media_id:'Choose an item from the Media Library.',profile_media_id:'Main profile image used on artist pages.',hero_media_id:'Large image used in the hero section.',poster_media_id:'Main poster used for series cards and pages.',featured_media_id:'Featured image shown in cards or popups.',thumbnail_media_id:'Main image shown on the episode card.',quick_info:'Short text used in cards, previews or quick info sections.',full_info:'Full details after the visitor opens the item.',full_synopsis:'Longer episode summary.',watch_url:'Leave blank if no watch button is needed.',source_url:'Optional source/reference link.',title_override:'Optional custom title instead of the linked item title.',copy_override:'Optional custom text.',enabled:'Turn off to hide this item publicly.',publish_at:'When this notification should start appearing.',timezone:'Example: Asia/Bangkok',sort_order:'Smaller number appears earlier.',button_href:'Leave blank to hide the public button.'
}

export function labelize(field:string){
  return FIELD_LABELS[field] || field.replace(/_/g,' ').replace(/\b\w/g,(c)=>c.toUpperCase())
}

export const PAGE_CONFIG = {
  home:{title:'Home',eyebrow:'Website flow',description:'Edit homepage copy, features, sections and linked items.',collections:['pages','home_features','sections','section_items']},
  artists:{title:'Artists',eyebrow:'Website flow',description:'Profiles, timelines and achievements grouped around your artists.',collections:['artists','artist_timeline','artist_achievements']},
  series:{title:'Series',eyebrow:'Website flow',description:'Series information and cast records.',collections:['series','series_cast']},
  episodes:{title:'Episodes',eyebrow:'Website flow',description:'Episode details, episode cast and galleries.',collections:['episodes','episode_cast','galleries','gallery_settings']},
  events:{title:'Events',eyebrow:'Website flow',description:'Public events, schedules, locations and related content.',collections:['events']},
  news:{title:'News',eyebrow:'Website flow',description:'Stories, publish dates, highlights and related content.',collections:['news']},
  notifications:{title:'Notifications',eyebrow:'Website flow',description:'Public notices, release reminders and scheduled notifications.',collections:['notifications']},
  site:{title:'Header & Footer',eyebrow:'Site settings',description:'Navigation, socials, message links, site settings and UI text.',collections:['navigation','socials','message_links','site_settings','ui_text','redirects']},
  theme:{title:'Theme & Fonts',eyebrow:'Site settings',description:'Site-wide colors, tokens and typography.',collections:['theme','fonts']},
  users:{title:'CMS Users',eyebrow:'Administration',description:'CMS access profiles and roles.',collections:['cms_users']},
} as const
