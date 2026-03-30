import { logger } from "../lib/logger.js";

const TWILIO_ACCOUNT_SID = process.env["TWILIO_ACCOUNT_SID"];
const TWILIO_AUTH_TOKEN = process.env["TWILIO_AUTH_TOKEN"];
const TWILIO_PHONE_NUMBER = process.env["TWILIO_PHONE_NUMBER"];
const APP_BASE_URL = process.env["APP_BASE_URL"] ?? process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim() ?? "";

const callRegistry = new Map<string, { logId: string; patientId: string; medicineName: string }>();

export function registerCall(
  callSid: string,
  info: { logId: string; patientId: string; medicineName: string },
): void {
  callRegistry.set(callSid, info);
}

export function getCallInfo(callSid: string) {
  return callRegistry.get(callSid);
}

export function removeCallInfo(callSid: string): void {
  callRegistry.delete(callSid);
}

export async function makeReminderCall(
  phone: string,
  patientName: string,
  medicineName: string,
  dosage: string,
  language: string,
): Promise<string | null> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    logger.warn("Twilio not configured - skipping call");
    return null;
  }

  const webhookUrl = `https://${APP_BASE_URL}/api/twilio/voice`;

  const messageMap: Record<string, string> = {
    hindi: `${patientName} ji, aapka dawai ${medicineName} ki ${dosage} lene ka time ho gaya hai.`,
    english: `Hello ${patientName}, it is time to take your ${medicineName} ${dosage}. Please take it now.`,
    gujarati: `Namaste ${patientName}, aapni ${medicineName} ${dosage} leva no samay thayi gayo chhe.`,
    tamil: `Vanakkam ${patientName}, ungalukkaga ${medicineName} ${dosage} edukka neram aachi.`,
    telugu: `Namaskaram ${patientName}, mee ${medicineName} ${dosage} teesukune samayam aindi.`,
    marathi: `Namaskar ${patientName}, tumchi ${medicineName} ${dosage} ghenyachi vel zali aahe.`,
  };

  const message = messageMap[language] ?? messageMap["english"]!;
  const isHindi = language === "hindi";

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${webhookUrl}" method="POST" timeout="10">
    <Say voice="Polly.Aditi" language="hi-IN">${message}</Say>
    <Say voice="Polly.Aditi" language="hi-IN">Dawai le li hai to ek dabaye, yadi nahi li hai to do dabaye.</Say>
  </Gather>
  <Say voice="Polly.Aditi" language="hi-IN">Koi javab nahi mila. Kripya apni dawai le lijiye. Alvida.</Say>
</Response>`;

  try {
    const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: TWILIO_PHONE_NUMBER,
          Twiml: twiml,
          StatusCallback: `https://${APP_BASE_URL}/api/twilio/status`,
          StatusCallbackMethod: "POST",
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      logger.error({ err }, "Twilio call failed");
      return null;
    }

    const data = (await response.json()) as { sid: string };
    logger.info({ callSid: data.sid, phone }, "Twilio call initiated");
    return data.sid;
  } catch (err) {
    logger.error({ err }, "Error making Twilio call");
    return null;
  }
}

export async function sendSms(
  phone: string,
  message: string,
): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    logger.warn("Twilio not configured - skipping SMS");
    return false;
  }

  try {
    const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: TWILIO_PHONE_NUMBER,
          Body: message,
        }),
      },
    );
    return response.ok;
  } catch (err) {
    logger.error({ err }, "Error sending SMS");
    return false;
  }
}
