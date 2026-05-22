import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient.js";

const PLAN_COPY = {
  free: {
    name: "Free",
    badge: "Free Workspace",
    description: "Free caption and hashtag generators, 1 logo generation after signup, 1 Brand Workspace, and basic brand tools.",
  },
  starter: {
    name: "Starter",
    badge: "$10/mo",
    description: "Unlimited text generations, saved content history, brand workspaces, and 10 AI logo generations per month.",
  },
  pro: {
    name: "Pro",
    badge: "$20/mo",
    description: "Everything in Starter plus unlimited AI logo generations, full brand kits, and priority visual tools.",
  },
};

const tools = [
  {
    key: "logo",
    title: "AI Logo Generator",
    shortTitle: "Logos",
    desc: "Create premium logo images and modern identity directions.",
    label: "AI LOGO GENERATOR",
    platformLabel: "Logo style",
    platforms: ["Modern Minimal", "Luxury Wordmark", "Bold Monogram", "Editorial Serif", "Clean Tech", "Founder Brand", "Beauty / Wellness", "Restaurant / Hospitality", "Real Estate", "Social Media Icon"],
    placeholder: "Example: Create a black-and-white premium logo for Brandthat.ai, an AI creative studio for modern creators and brands.",
    promptGuide: "Create a modern logo image and brand identity direction. Include logo concept, typography, colors, usage notes, and visual identity guidance."
  },
  {
    key: "captions",
    title: "Free Caption Generator",
    shortTitle: "Captions",
    desc: "Choose a platform, describe the post, and get 10 clean caption options instantly.",
    label: "FREE CAPTION GENERATOR",
    platformLabel: "Social platform",
    platforms: ["Instagram", "TikTok", "Facebook", "LinkedIn", "X / Twitter", "YouTube Shorts", "Pinterest"],
    placeholder: "Example: A sunset ranch dinner with miniature cows, alpacas, and a calm luxury countryside feel.",
    promptGuide: "Generate exactly 10 useful social captions. The user chooses a social platform and describes the post. Return captions only, no long explanation. Make the captions copy-ready and relevant to what the user typed."
  },
  {
    key: "hooks",
    title: "Hook Generator",
    shortTitle: "Hooks",
    desc: "Short on-video hooks for Reels, TikTok, and Shorts.",
    label: "ON-VIDEO HOOK GENERATOR",
    platformLabel: "Video platform",
    platforms: ["Instagram Reels", "TikTok", "YouTube Shorts", "Facebook Reels", "General Short Video"],
    placeholder: "Example: A 20-second video of baby goats jumping on hay bales.",
    promptGuide: "Generate scroll-stopping 1-second, 3-second, and 5-second on-video hooks."
  },
  {
    key: "bios",
    title: "Brand Bio Generator",
    shortTitle: "Bios",
    desc: "Polished bios for Instagram, TikTok, LinkedIn, and websites.",
    label: "BRAND BIO GENERATOR",
    platformLabel: "Bio placement",
    platforms: ["Instagram", "TikTok", "LinkedIn", "Website", "X / Twitter", "Facebook", "General Brand Profile"],
    placeholder: "Example: A private luxury ranch sharing miniature animals, ranch life, and high-end gifting.",
    promptGuide: "Create polished brand bios that feel specific, premium, and useful. Include platform-specific versions."
  },
  {
    key: "hashtags",
    title: "Free Hashtag Generator",
    shortTitle: "Hashtags",
    desc: "Choose a platform, describe what you need hashtagged, and get clean hashtag sets instantly.",
    label: "FREE HASHTAG GENERATOR",
    platformLabel: "Social platform",
    platforms: ["Instagram", "TikTok", "Facebook", "LinkedIn", "X / Twitter", "YouTube Shorts", "Pinterest"],
    placeholder: "Example: Mini cows, ranch life, goats, alpacas, luxury countryside content.",
    promptGuide: "Generate useful hashtags only. The user chooses a social platform and describes what needs hashtagged. Return clean hashtag groups for niche, audience, reach, location if relevant, and brand/community. Do not over-explain. Make the hashtags copy-ready."
  },
  {
    key: "email",
    title: "Email Copy Generator",
    shortTitle: "Emails",
    desc: "Launch emails, promos, newsletters, and team updates.",
    label: "EMAIL COPY GENERATOR",
    platformLabel: "Email type",
    platforms: ["Team Update", "Product Launch", "Promo Email", "Newsletter", "Client Announcement", "Welcome Email", "Follow-up Email", "Partnership Outreach"],
    placeholder: "Example: Write an email to our team announcing the launch of a new AI logo generator.",
    promptGuide: "Generate complete email copy with subject lines, preview text, greeting, body, CTA, and sign-off."
  },
  {
    key: "strategy",
    title: "Social Strategy Generator",
    shortTitle: "Strategy",
    desc: "Content direction and growth ideas across platforms.",
    label: "SOCIAL STRATEGY GENERATOR",
    platformLabel: "Primary platform",
    platforms: ["Instagram", "TikTok", "LinkedIn", "Facebook", "X / Twitter", "YouTube Shorts", "Pinterest", "Multi-platform"],
    placeholder: "Example: We are a ranch brand trying to grow with animal videos, gifting, and high-end lifestyle content.",
    promptGuide: "Generate platform-specific social strategy, content pillars, posting ideas, hooks, cadence, growth tactics, and next steps."
  },
  {
