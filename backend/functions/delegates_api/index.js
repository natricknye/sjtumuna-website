// Delegate roster API.
//
// `verify` is the legacy delegate-code claim flow. `login` and `seat` are
// read-only: they look up one name + delegate number pair and never return the
// roster. The service API key stays in CloudBase function environment variables.
//
// CloudBase currently exposes the key as CLOUDBASE_APIKEY; keep the older
// CLOUDBASE_API_KEY spelling as a fallback for local/other deployments.

const ENV_ID = process.env.CLOUDBASE_ENV_ID;
const API_KEY = process.env.CLOUDBASE_APIKEY || process.env.CLOUDBASE_API_KEY;

const COMMITTEE_NAMES = {
  1: "联合国大会第二委员会（经济和金融委员会）",
  2: "联合国经济及社会理事会（ECOSOC）",
  3: "1912年伦敦会议",
  4: "联合国毒品和犯罪问题办公室（UNODC）",
  5: "第五会场",
};

function result(ok, code) {
  return { ok, code };
}

function readText(value, maxLength) {
  return typeof value === "string" && value.trim() && value.trim().length <= maxLength
    ? value.trim()
    : "";
}

function committeeCode(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? String(number).padStart(2, "0") : "";
}

function committeeName(value) {
  return COMMITTEE_NAMES[Number(value)] || "会场";
}

function textOrEmpty(value) {
  return typeof value === "string" ? value.trim() : "";
}

function paymentInfo(value) {
  const raw = textOrEmpty(value);
  if (/已缴|paid/i.test(raw)) return { key: "paid", label: raw };
  if (/未缴|unpaid/i.test(raw)) return { key: "unpaid", label: raw };
  return { key: "pending", label: raw };
}

async function lookupDelegate({ name, delegateNo, select }) {
  if (!ENV_ID || !API_KEY) {
    throw new Error("server_not_configured");
  }

  const endpoint = new URL(
    `https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/rest/delegates`,
  );
  endpoint.search = new URLSearchParams({
    select,
    delegate_no: `eq.${delegateNo}`,
    name: `eq.${name}`,
    limit: "1",
  }).toString();

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    console.error("Delegate lookup failed with HTTP status", response.status);
    throw new Error("database_error");
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

function delegateSummary(record) {
  return {
    no: record.delegate_no,
    name: record.name,
    committee: committeeName(record.venue_preference),
    committeeCode: committeeCode(record.venue_preference),
  };
}

async function handleLogin(input) {
  const name = readText(input.name, 80);
  const delegateNo = readText(input.delegate_no, 40).toUpperCase();
  if (!name || !delegateNo) return result(false, "invalid_input");

  try {
    const rows = await lookupDelegate({
      name,
      delegateNo,
      select: "delegate_no,name,venue_preference",
    });
    if (rows.length !== 1) return result(false, "invalid_credentials");
    return {
      ok: true,
      code: "matched",
      delegate: delegateSummary(rows[0]),
    };
  } catch (error) {
    if (error.message === "server_not_configured") {
      console.error("Missing CloudBase function environment variables.");
      return result(false, "server_not_configured");
    }
    console.error("Delegate login lookup failed:", error.message);
    return result(false, "database_unavailable");
  }
}

async function handleSeat(input) {
  const name = readText(input.name, 80);
  const delegateNo = readText(input.delegate_no, 40).toUpperCase();
  if (!name || !delegateNo) return result(false, "invalid_input");

  try {
    const rows = await lookupDelegate({
      name,
      delegateNo,
      select: "delegate_no,name,venue_preference,assigned_seat,seat_role,school,payment_status,result_published",
    });
    if (rows.length !== 1) return result(false, "invalid_credentials");

    const record = rows[0];
    const seat = textOrEmpty(record.assigned_seat);
    if (!record.result_published || !seat) {
      return result(false, "not_published");
    }
    const payment = paymentInfo(record.payment_status);

    return {
      ok: true,
      code: "matched",
      seat: {
        ...delegateSummary(record),
        seat,
        seatRole: textOrEmpty(record.seat_role),
        school: textOrEmpty(record.school),
        paymentKey: payment.key,
        paymentLabel: payment.label,
      },
    };
  } catch (error) {
    if (error.message === "server_not_configured") {
      console.error("Missing CloudBase function environment variables.");
      return result(false, "server_not_configured");
    }
    console.error("Delegate seat lookup failed:", error.message);
    return result(false, "database_unavailable");
  }
}

exports.main = async (event = {}) => {
  const input = event.data && typeof event.data === "object" ? event.data : event;

  if (input.action === "login") {
    return handleLogin(input);
  }
  if (input.action === "seat") {
    return handleSeat(input);
  }
  if (input.action !== "verify") {
    return result(false, "unsupported_action");
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const delegateNo = typeof input.delegate_no === "string" ? input.delegate_no.trim().toUpperCase() : "";
  const venuePreference = Number(input.venue_preference);

  if (
    !name ||
    !delegateNo ||
    name.length > 80 ||
    delegateNo.length > 40 ||
    !Number.isInteger(venuePreference) ||
    venuePreference < 1 ||
    venuePreference > 5
  ) {
    return result(false, "invalid_input");
  }

  if (!ENV_ID || !API_KEY) {
    console.error("Missing CloudBase function environment variables.");
    return result(false, "server_not_configured");
  }

  const endpoint = new URL(
    `https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/rest/delegates`,
  );
  const rosterUrl = new URL(endpoint);
  rosterUrl.search = new URLSearchParams({
    select: "id,name,venue_preference",
    delegate_no: `eq.${delegateNo}`,
    limit: "1",
  }).toString();

  try {
    const lookup = await fetch(rosterUrl, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
      },
    });

    if (!lookup.ok) {
      console.error("Roster lookup failed with HTTP status", lookup.status);
      return result(false, "database_error");
    }

    const rows = await lookup.json();
    if (!Array.isArray(rows) || rows.length !== 1) {
      return result(false, "code_not_found");
    }

    const record = rows[0];
    if (record.name === name) {
      if (record.venue_preference === venuePreference) {
        return result(true, "matched");
      }

      const updateUrl = new URL(endpoint);
      updateUrl.search = new URLSearchParams({
        select: "id",
        delegate_no: `eq.${delegateNo}`,
        name: `eq.${name}`,
      }).toString();
      const update = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ venue_preference: venuePreference }),
      });

      if (!update.ok) {
        console.error("Venue preference update failed with HTTP status", update.status);
        return result(false, "database_error");
      }

      const updatedRows = await update.json();
      return Array.isArray(updatedRows) && updatedRows.length === 1
        ? result(true, "matched")
        : result(false, "code_already_claimed");
    }
    if (record.name !== null) {
      return result(false, "code_already_claimed");
    }

    // Claim only while the name is still empty. This conditional update makes
    // sure two people cannot claim the same code at the same time.
    const claimUrl = new URL(endpoint);
    claimUrl.search = new URLSearchParams({
      select: "id",
      delegate_no: `eq.${delegateNo}`,
      name: "is.null",
    }).toString();
    const claim = await fetch(claimUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ name, venue_preference: venuePreference }),
    });

    if (!claim.ok) {
      console.error("Code claim failed with HTTP status", claim.status);
      return result(false, "database_error");
    }

    const claimedRows = await claim.json();
    if (Array.isArray(claimedRows) && claimedRows.length === 1) {
      return result(true, "claimed");
    }

    // If another request claimed it first, permit only the same bound name.
    const check = await fetch(rosterUrl, {
      headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" },
    });
    if (!check.ok) return result(false, "database_error");
    const latestRows = await check.json();
    return Array.isArray(latestRows) && latestRows.length === 1 && latestRows[0].name === name
      ? result(true, "matched")
      : result(false, "code_already_claimed");
  } catch (error) {
    console.error("Roster lookup request failed:", error.message);
    return result(false, "database_unavailable");
  }
};
