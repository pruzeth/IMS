// netlify/functions/send-email.js
// One shared Brevo template, sent to both the client and the adviser.
// The email contains: a welcome message, the results-snapshot link,
// the answers-copy link, and the Clarity Call booking link.
// The client is also added to the marketing list for future newsletters.

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts';

const TEMPLATE_ID = 3; // "Assessment Result — Shared"

const ADVISER_EMAIL = 'plukferrysuzethmalit@gmail.com'; // <-- confirm this is correct
const ADVISER_NAME = 'Engr. Suzeth A. Malit';

const MARKETING_LIST_ID = 4; // "Assessment Leads"

const CLARITY_CALL_LINK = 'https://calendly.com/yourpruengineersuzethmalit/free-clarity-call'; // <-- confirm this is correct

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, email, resultLink, answersLink } = data;

    if (!name || !email || !resultLink || !answersLink) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing name, email, resultLink, or answersLink' }) };
    }

    const apiKey = process.env.BREVO_API_KEY;
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

    // 1. Email to the client
    const clientPayload = {
      to: [{ email, name }],
      templateId: TEMPLATE_ID,
      params: sharedParams,
    };

    // 2. Same email to the adviser, plus who it's about
    const adviserPayload = {
      to: [{ email: ADVISER_EMAIL, name: ADVISER_NAME }],
      templateId: TEMPLATE_ID,
      params: { ...sharedParams, CLIENT_EMAIL: email },
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
      return { statusCode: 502, body: JSON.stringify({ error: 'Failed to send one or more emails' }) };
    }

    if (!contactRes.ok) {
      console.error('Brevo contact error:', await contactRes.text());
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
