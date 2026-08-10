// functions/send-email.js
// Cloudflare Pages Function version of the Brevo email sender.
// One shared Brevo template, sent to both the client and the adviser.
// The email contains: a welcome message, the results-snapshot link,
// the answers-copy link, and the Clarity Session booking link.
// The client is also added to the marketing list for future newsletters.
//
// This file lives at /functions/send-email.js (Cloudflare's convention —
// no "netlify/" folder needed). Cloudflare auto-maps this file to the
// URL path /send-email, so the site's fetch() call changes from
// '/.netlify/functions/send-email' to '/send-email'.

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts';

const TEMPLATE_ID = 3; // "Assessment Result — Shared"

const ADVISER_EMAIL = 'plukferrysuzethmalit@gmail.com'; // <-- confirm this is correct
const ADVISER_NAME = 'Engr. Suzeth A. Malit';

const MARKETING_LIST_ID = 4; // "Assessment Leads"

const CLARITY_CALL_LINK = 'https://calendly.com/yourpruengineersuzethmalit/free-clarity-call'; // <-- confirm this is correct

// Cloudflare Pages Functions use onRequestPost instead of exports.handler.
// The "context" object gives access to the request and to env variables
// (env.BREVO_API_KEY instead of Netlify's process.env.BREVO_API_KEY).
export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const { name, email, resultLink, answersLink } = data;

    if (!name || !email || !resultLink || !answersLink) {
      return new Response(
        JSON.stringify({ error: 'Missing name, email, resultLink, or answersLink' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    const apiKey = context.env.BREVO_API_KEY;
    const headers = {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    };

    // Params shared by both the client's and adviser's copy of the email
    const sharedParams = {
      NAME: name,
      RESULT_LINK: resultLink,
      ANSWERS_LINK: answersLink,
      CLARITY_CALL_LINK,
    };

    // 1. Email to the client — replyTo makes sure that if they hit "Reply,"
    // it goes straight to your real Gmail inbox instead of the unmonitored
    // hello@ address, even though "From" still shows your branded domain.
    const clientPayload = {
      to: [{ email, name }],
      templateId: TEMPLATE_ID,
      params: sharedParams,
      replyTo: { email: ADVISER_EMAIL, name: ADVISER_NAME },
    };

    // 2. Same email to the adviser, plus who it's about
    const adviserPayload = {
      to: [{ email: ADVISER_EMAIL, name: ADVISER_NAME }],
      templateId: TEMPLATE_ID,
      params: { ...sharedParams, CLIENT_EMAIL: email },
      replyTo: { email: email, name: name },
    };

    // 3. Add/update the client in the marketing list
    const contactPayload = {
      email,
      attributes: { FIRSTNAME: name },
      listIds: [MARKETING_LIST_ID],
      updateEnabled: true,
    };

    const [clientRes, adviserRes, contactRes] = await Promise.all([
      fetch(BREVO_API_URL, { method: 'POST', headers, body: JSON.stringify(clientPayload) }),
      fetch(BREVO_API_URL, { method: 'POST', headers, body: JSON.stringify(adviserPayload) }),
      fetch(BREVO_CONTACTS_URL, { method: 'POST', headers, body: JSON.stringify(contactPayload) }),
    ]);

    if (!clientRes.ok || !adviserRes.ok) {
      console.error('Brevo email error:', await clientRes.text(), await adviserRes.text());
      return new Response(
        JSON.stringify({ error: 'Failed to send one or more emails' }),
        { status: 502, headers: { 'content-type': 'application/json' } }
      );
    }

    if (!contactRes.ok) {
      console.error('Brevo contact error:', await contactRes.text());
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
