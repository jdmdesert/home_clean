"""Static website server with a deterministic, editable cleaning estimator."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import smtplib
import uuid
import math
from datetime import datetime, timezone
from email.message import EmailMessage

ROOT = Path(__file__).resolve().parent
LOG_PATH = ROOT / "estimate_log.jsonl"


def write_log(event):
    event["timestamp"] = datetime.now(timezone.utc).isoformat()
    with LOG_PATH.open("a", encoding="utf-8") as file:
        file.write(json.dumps(event, ensure_ascii=False) + "\n")


def email_event(subject, event):
    """Email when SMTP settings and a complete recipient address are configured."""
    recipient = os.environ.get("ESTIMATE_EMAIL", "")
    host = os.environ.get("SMTP_HOST", "")
    sender = os.environ.get("SMTP_FROM", "")
    if not (recipient and "@" in recipient and host and sender):
        return False
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(json.dumps(event, indent=2, ensure_ascii=False))
    port = int(os.environ.get("SMTP_PORT", "587"))
    with smtplib.SMTP(host, port, timeout=15) as smtp:
        smtp.starttls()
        username = os.environ.get("SMTP_USERNAME", "")
        password = os.environ.get("SMTP_PASSWORD", "")
        if username:
            smtp.login(username, password)
        smtp.send_message(message)
    return True


def calculate_estimate(payload):
    with (ROOT / "pricing_rules.json").open(encoding="utf-8") as file:
        rules = json.load(file)
    service_key = str(payload.get("service", "")).strip()
    description = " ".join((str(payload.get("notes", "")), str(payload.get("otherService", "")))).lower()
    try:
        square_feet = int(float(payload.get("squareFeet", 0)))
    except (TypeError, ValueError):
        square_feet = 0
    if square_feet <= 0:
        raise ValueError("Please enter the home’s square footage.")
    if not description.strip():
        raise ValueError("Please describe the work you would like completed.")
    if service_key not in rules["services"]:
        raise ValueError("Instant pricing is currently available for Airbnb turnover, standard, deep, and move-out cleaning.")

    service = rules["services"][service_key]
    low, high = float(service["minimumRate"]), float(service["maximumRate"])
    score, adjustments = 0, []
    for rule in rules["conditionRules"]:
        if any(keyword in description for keyword in rule["keywords"]):
            score += int(rule["weight"])
            adjustments.append(rule["explanation"])

    lower_position = {-1: 0.0, 0: 0.25, 1: 0.55}.get(score, 0.8)
    upper_position = {-1: 0.25, 0: 0.55, 1: 0.8}.get(score, 1.0)
    lower_rate = low + ((high - low) * lower_position)
    upper_rate = low + ((high - low) * upper_position)
    minimum = float(rules["minimumCharge"])
    estimate_low = max(math.ceil(minimum), math.ceil(square_feet * lower_rate))
    raw_high = max(minimum, square_feet * upper_rate)
    # Add a 5% contingency to the upper bound, then guarantee that the
    # customer-facing range remains at least 10% wider than the lower bound.
    estimate_high = max(
        math.ceil(raw_high * 1.05),
        math.ceil(estimate_low * 1.10),
    )
    # A customer should always see a meaningful range, including very small jobs
    # where both calculations would otherwise collapse to the minimum charge.
    if estimate_high <= estimate_low:
        estimate_high = estimate_low + max(5, math.ceil(estimate_low * 0.1))
    if estimate_low == math.ceil(minimum) and square_feet * lower_rate < minimum:
        adjustments.append(f"${minimum:.0f} minimum service charge applied")
    if not adjustments:
        adjustments.append("Standard condition assumed from your description")
    return {"service": service["label"], "squareFeet": square_feet,
            "estimateLow": estimate_low, "estimateHigh": estimate_high,
            "minimumCharge": math.ceil(minimum),
            "adjustments": adjustments, "conditionScore": score}


class EstimateHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path not in ("/api/estimate", "/api/decision"):
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 64_000:
                raise ValueError("Request is too large.")
            payload = json.loads(self.rfile.read(length) or b"{}")
            if self.path == "/api/estimate":
                required = ("firstName", "lastName", "phone", "email", "squareFeet", "city", "service", "notes")
                if any(not str(payload.get(field, "")).strip() for field in required):
                    raise ValueError("Please complete every requested field before calculating an estimate.")
                result = calculate_estimate(payload)
                result["estimateId"] = uuid.uuid4().hex
                event = {"event": "estimate_calculated", "estimateId": result["estimateId"],
                         "customer": payload, "estimate": result}
                write_log(event)
                try:
                    result["emailSent"] = email_event("New Steadfast & Co. Cleaning estimate calculated", event)
                except (OSError, smtplib.SMTPException):
                    result["emailSent"] = False
            else:
                estimate_id = str(payload.get("estimateId", "")).strip()
                decision = str(payload.get("decision", "")).strip()
                reason = str(payload.get("reason", "")).strip()
                if not estimate_id or decision not in ("accepted", "rejected"):
                    raise ValueError("Invalid estimate response.")
                if decision == "rejected" and not reason:
                    raise ValueError("Please select a rejection reason.")
                event = {"event": "estimate_decision", "estimateId": estimate_id,
                         "decision": decision, "reason": reason}
                write_log(event)
                try:
                    email_event(f"Estimate {decision}", event)
                except (OSError, smtplib.SMTPException):
                    pass
                result = {"saved": True}
            self.send_json(result, 200)
        except (ValueError, json.JSONDecodeError) as error:
            self.send_json({"error": str(error)}, 400)

    def send_json(self, payload, status):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "127.0.0.1")
    print(f"Steadfast & Co. Cleaning running at http://{host}:{port}")
    ThreadingHTTPServer((host, port), EstimateHandler).serve_forever()
