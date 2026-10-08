const SITE_URL = 'https://challengegoal.app';
const SITE_LABEL = 'challengegoal.app';
const SUPPORT_ADDRESS = 'destek@challengegoal.app';
const MARK_URL = `${SITE_URL}/img/mail-mark.png`;
const MARK_SIZE = 48;
const CODE_SPACING = 10;
const DISPLAY_FONT = "'Barlow Condensed','Arial Narrow','Helvetica Neue',Arial,sans-serif";
const BODY_FONT = "-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const COLORS = {
  page: '#05070A',
  card: '#121821',
  stroke: '#2B3644',
  text: '#F6F8FB',
  body: '#D5DBE5',
  muted: '#9BA8BA',
  volt: '#C8FF2E',
} as const;
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export interface CodeMailContent {
  language: string;
  preview: string;
  title: string;
  intro: string;
  code: string;
  instructions: string;
  footnote: string;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

export function codeMailHtml(content: CodeMailContent): string {
  const text = (value: string) => escapeHtml(value);
  return [
    '<!doctype html>',
    `<html lang="${text(content.language)}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="dark">',
    '<meta name="supported-color-schemes" content="dark">',
    `<title>${text(content.title)}</title>`,
    '</head>',
    `<body style="margin:0;padding:0;background:${COLORS.page};">`,
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${text(content.preview)}</div>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.page}" style="background:${COLORS.page};">`,
    '<tr><td align="center" style="padding:32px 16px;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">',
    '<tr><td style="padding:0 4px 20px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>',
    `<td style="padding-right:10px;"><img src="${MARK_URL}" width="${MARK_SIZE}" height="${MARK_SIZE}" alt="" style="display:block;border:0;"></td>`,
    `<td style="font-family:${DISPLAY_FONT};font-style:italic;font-weight:900;font-size:28px;line-height:1;letter-spacing:0.5px;color:${COLORS.text};">CHALLENGE<span style="color:${COLORS.volt};">GOAL</span></td>`,
    '</tr></table>',
    '</td></tr>',
    `<tr><td bgcolor="${COLORS.card}" style="background:${COLORS.card};border:1px solid ${COLORS.stroke};border-radius:16px;padding:28px 24px;">`,
    `<div style="width:44px;height:4px;border-radius:2px;background:${COLORS.volt};font-size:0;line-height:0;">&nbsp;</div>`,
    `<h1 style="margin:16px 0 12px;font-family:${DISPLAY_FONT};font-style:italic;font-weight:800;font-size:32px;line-height:1.05;letter-spacing:0.5px;color:${COLORS.text};">${text(content.title)}</h1>`,
    `<p style="margin:0 0 18px;font-family:${BODY_FONT};font-size:16px;line-height:1.5;color:${COLORS.body};">${text(content.intro)}</p>`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>',
    `<td align="center" bgcolor="${COLORS.page}" style="background:${COLORS.page};border:1px solid ${COLORS.volt};border-radius:12px;padding:16px 8px 16px ${8 + CODE_SPACING}px;font-family:${DISPLAY_FONT};font-weight:800;font-size:42px;line-height:1.1;letter-spacing:${CODE_SPACING}px;color:${COLORS.volt};">${text(content.code)}</td>`,
    '</tr></table>',
    `<p style="margin:18px 0 0;font-family:${BODY_FONT};font-size:15px;line-height:1.5;color:${COLORS.body};">${text(content.instructions)}</p>`,
    `<p style="margin:18px 0 0;padding-top:16px;border-top:1px solid ${COLORS.stroke};font-family:${BODY_FONT};font-size:13px;line-height:1.5;color:${COLORS.muted};">${text(content.footnote)}</p>`,
    '</td></tr>',
    `<tr><td align="center" style="padding:20px 8px 0;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${COLORS.muted};">`,
    `ChallengeGoal &middot; <a href="${SITE_URL}" style="color:${COLORS.muted};">${SITE_LABEL}</a> &middot; <a href="mailto:${SUPPORT_ADDRESS}" style="color:${COLORS.muted};">${SUPPORT_ADDRESS}</a>`,
    '</td></tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('\n');
}
