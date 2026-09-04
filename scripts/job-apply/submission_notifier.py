#!/usr/bin/env python3
"""Submission Notifier: Delivers job-application events to WhatsApp."""

import json
import os

PENDING_FILE = os.path.join(os.path.dirname(__file__), "submissions_pending.jsonl")
SENT_FILE = os.path.join(os.path.dirname(__file__), "submissions_sent.jsonl")


def load_pending():
    """Load pending submissions from JSONL file."""
    if not os.path.exists(PENDING_FILE):
        return []
    
    submissions = []
    with open(PENDING_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                submissions.append(json.loads(line))
            except json.JSONDecodeError:
                # Skip malformed lines
                pass
    return submissions


def save_sent(submissions):
    """Append sent submissions to sent file."""
    with open(SENT_FILE, "a") as f:
        for sub in submissions:
            f.write(json.dumps(sub) + "\n")


def clear_pending():
    """Clear the pending file after successful delivery."""
    open(PENDING_FILE, "w").close()


def format_message(company, role, when_str):
    """Format a single submission event to the exact requested format."""
    # The when_str is already in the format "DD Mon YYYY, HH:MM AM/PM IST"
    return f"✅ Applied: {company} — {role} — {when_str}"


def print_to_whatsapp(messages):
    """Print messages to WhatsApp channel (stdout)."""
    for msg in messages:
        print(msg)


if __name__ == "__main__":
    # Read pending events
    pending = load_pending()
    
    if not pending:
        # No pending events — do nothing (exit silently as per requirement)
        pass
    else:
        # Format messages
        messages = [format_message(p["company"], p["role"], p["when"]) for p in pending]
        
        # Deliver to WhatsApp (stdout)
        print_to_whatsapp(messages)
        
        # Move to sent and clear pending
        save_sent(pending)
        clear_pending()
