// ============================================================
//  SUNRISE PICKLEBALL CREW · 1ST ANNIVERSARY TOURNAMENT
//  Site configuration. Uses the same Supabase project as the
//  PYS Open site, in its own table (sunrise_kv). See README.md.
// ============================================================
window.SPC_CONFIG = {
  SUPABASE_URL: "https://pcevgjyeftlxznghdtdy.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZXZnanllZnRseHpuZ2hkdGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MzI2MDQsImV4cCI6MjExMTAwODYwNH0.uVzXHZiyFloNEd4NyWdXIk1RVVnvDk_HbZrBliy5fY0",
  TABLE: "sunrise_kv",

  EVENT: {
    name: "Sunrise Pickleball Crew",
    title: "1st Anniversary Tournament",
    tagline: "Rise. Rally. Celebrate.",
    date: "2026-11-29",                 // YYYY-MM-DD (Asia/Manila)
    dayLabel: "Sunday",
    dateLabel: "Nov 29, 2026",
    start: "08:00",
    venue: "4th Shot",
    city: "Porac, Pampanga",
    courts: 6,
    timezone: "Asia/Manila"
  },

  // Categories, in the order they play (first in, first out)
  CATEGORIES: [
    { code: "NWD", name: "Novice Women's Doubles", short: "Novice Women's", call: "07:15", first: "08:00", done: "12:00", wave: "Novice · morning" },
    { code: "NXD", name: "Novice Mixed Doubles", short: "Novice Mixed", call: "07:15", first: "08:20", done: "12:20", wave: "Novice · morning" },
    { code: "NMD", name: "Novice Men's Doubles", short: "Novice Men's", call: "07:15", first: "08:20", done: "12:20", wave: "Novice · morning" },
    { code: "IMD", name: "Intermediate Men's Doubles", short: "Intermediate Men's", call: "10:15", first: "11:00", done: "16:00", wave: "Intermediate · afternoon" },
    { code: "IXD", name: "Intermediate Mixed Doubles", short: "Intermediate Mixed", call: "11:15", first: "12:00", done: "15:40", wave: "Intermediate · afternoon" }
  ],

  // Sponsor carousel. Put each logo file next to index.html and list it here.
  // Leave "file" empty to show the name as text until the logo is uploaded.
  SPONSORS: [
    { name: "Bethany Cabin", file: "sp-bethany-cabin.png" },
    { name: "Nixx Lounge", file: "sp-nixx-lounge.png" },
    { name: "THPro Media", file: "sp-thpro-media.png" },
    { name: "iLoveWoof Veterinary Clinic", file: "sp-ilovewoof.png" },
    { name: "Vole", file: "sp-vole.png" },
    { name: "Connect2Him", file: "sp-connect2him.png" },
    { name: "Picklebear Anjo", file: "sp-picklebear.png" },
    { name: "Mizu Maccha + Coffee", file: "sp-mizu.png" },
    { name: "Lette's OlShop", file: "sp-lettes-olshop.png" },
    { name: "IT Mom Bakes", file: "sp-it-mom-bakes.png" },
    { name: "Ember Neighborhood Cafe", file: "sp-ember.png" },
    { name: "The Pickle Cave", file: "sp-pickle-cave.png" },
    { name: "Pickleball Central PH", file: "sp-pickleball-central.png" },
    { name: "Kamir", file: "sp-kamir.png" },
    { name: "The Paddle Depot", file: "" },
    { name: "4th Shot", file: "" },
    { name: "Pikol Mo Ko", file: "sp-pikol-mo-ko.png" },
    { name: "Soliman Paroli Eyecare | Optical", file: "sp-soliman-paroli.png" },
    { name: "Plain and Simple Studios", file: "sp-plain-simple.png" },
    { name: "Nearby Coffee House", file: "sp-nearby.png" }
  ]
};
