import {
  SiApple,
  SiAppleHex,
  SiAtlassian,
  SiAtlassianHex,
  SiDiscord,
  SiDiscordHex,
  SiDropbox,
  SiDropboxHex,
  SiFacebook,
  SiFacebookHex,
  SiFigma,
  SiFigmaHex,
  SiGithub,
  SiGithubHex,
  SiGitlab,
  SiGitlabHex,
  SiGoogle,
  SiGoogleHex,
  SiHuggingface,
  SiHuggingfaceHex,
  SiKakaotalk,
  SiKakaotalkHex,
  SiKick,
  SiKickHex,
  SiLine,
  SiLineHex,
  SiLinear,
  SiLinearHex,
  SiNaver,
  SiNaverHex,
  SiNotion,
  SiNotionHex,
  SiPaypal,
  SiPaypalHex,
  SiRailway,
  SiRailwayHex,
  SiReddit,
  SiRedditHex,
  SiRoblox,
  SiRobloxHex,
  SiSpotify,
  SiSpotifyHex,
  SiTiktok,
  SiTiktokHex,
  SiTwitch,
  SiTwitchHex,
  SiX,
  SiXHex,
  SiVercel,
  SiVercelHex,
  SiVk,
  SiVkHex,
  SiWechat,
  SiWechatHex,
  SiZoom,
  SiZoomHex,
} from '@icons-pack/react-simple-icons';
import { Link } from 'lucide-react';
import type { ElementType } from 'react';

export type SocialProviderType = {
  label: string;
  icon: ElementType;
  color: string | false;
};

export const socialProviderMaps: Record<string, SocialProviderType> = {
  apple: { label: 'Apple', icon: SiApple, color: SiAppleHex },
  atlassian: { label: 'Atlassian', icon: SiAtlassian, color: SiAtlassianHex },
  cognito: { label: 'Cognito', icon: Link, color: false }, // icon is not available in simple-icons
  discord: { label: 'Discord', icon: SiDiscord, color: SiDiscordHex },
  dropbox: { label: 'Dropbox', icon: SiDropbox, color: SiDropboxHex },
  facebook: { label: 'Facebook', icon: SiFacebook, color: SiFacebookHex },
  figma: { label: 'Figma', icon: SiFigma, color: SiFigmaHex },
  github: { label: 'GitHub', icon: SiGithub, color: SiGithubHex },
  gitlab: { label: 'GitLab', icon: SiGitlab, color: SiGitlabHex },
  google: { label: 'Google', icon: SiGoogle, color: SiGoogleHex },
  huggingface: { label: 'Hugging Face', icon: SiHuggingface, color: SiHuggingfaceHex },
  kakao: { label: 'Kakao', icon: SiKakaotalk, color: SiKakaotalkHex },
  kick: { label: 'Kick', icon: SiKick, color: SiKickHex },
  line: { label: 'LINE', icon: SiLine, color: SiLineHex },
  linear: { label: 'Linear', icon: SiLinear, color: SiLinearHex },
  linkedin: { label: 'LinkedIn', icon: Link, color: false }, // icon is not available in simple-icons
  microsoft: { label: 'Microsoft', icon: Link, color: false }, // icon is not available in simple-icons
  naver: { label: 'Naver', icon: SiNaver, color: SiNaverHex },
  notion: { label: 'Notion', icon: SiNotion, color: SiNotionHex },
  paybin: { label: 'Paybin', icon: Link, color: false }, // icon is not available in simple-icons
  paypal: { label: 'PayPal', icon: SiPaypal, color: SiPaypalHex },
  polar: { label: 'Polar', icon: Link, color: false }, // icon is not available in simple-icons
  railway: { label: 'Railway', icon: SiRailway, color: SiRailwayHex },
  reddit: { label: 'Reddit', icon: SiReddit, color: SiRedditHex },
  roblox: { label: 'Roblox', icon: SiRoblox, color: SiRobloxHex },
  salesforce: { label: 'Salesforce', icon: Link, color: false }, // icon is not available in simple-icons
  slack: { label: 'Slack', icon: Link, color: false }, // icon is not available in simple-icons
  spotify: { label: 'Spotify', icon: SiSpotify, color: SiSpotifyHex },
  tiktok: { label: 'TikTok', icon: SiTiktok, color: SiTiktokHex },
  twitch: { label: 'Twitch', icon: SiTwitch, color: SiTwitchHex },
  twitter: { label: 'Twitter', icon: SiX, color: SiXHex },
  vercel: { label: 'Vercel', icon: SiVercel, color: SiVercelHex },
  vk: { label: 'VK', icon: SiVk, color: SiVkHex },
  wechat: { label: 'WeChat', icon: SiWechat, color: SiWechatHex },
  zoom: { label: 'Zoom', icon: SiZoom, color: SiZoomHex },
};

