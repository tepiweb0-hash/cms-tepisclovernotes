export const navGroups = [
  { title:'Content', items:[
    ['/dashboard','Dashboard','⌂'],
    ['/home','Homepage','⌘'],
    ['/artists','Artists','◉'],
    ['/series','Series','▶'],
    ['/episodes','Episodes','▣'],
    ['/events','Events','◫'],
    ['/news','News','✎'],
    ['/notifications','Notifications','◌'],
  ] },
  { title:'Library', items:[['/media','Media Library','▧']] },
  { title:'Website settings', items:[['/site','Header & Footer','☰'],['/theme','Theme & Fonts','Aa']] },
  { title:'Administration', items:[['/users','Users','◎'],['/migration','Migration','⇄']] },
] as const
