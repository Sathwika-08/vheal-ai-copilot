from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import csv

from backend.ml_model import predict_priority
from backend.agents import run_agents
from backend.notifier import send_sms, send_whatsapp

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ This set remembers which patients already got notified
# So we don't send duplicate messages every time page loads
already_notified = set()

def read_patients():
    patients = []

    with open("backend/patients.csv", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            # ML prediction
            row["priority"] = predict_priority(row)

            # AI agents
            agent_result = run_agents(row)
            row["checklist"] = agent_result["checklist"]
            row["tasks_completed"] = agent_result["completed"]
            row["ready_for_discharge"] = agent_result["ready_for_discharge"]

            # ✅ Only notify if ready AND not already notified
            if row["ready_for_discharge"]:
                patient_id = row["patient_id"]

                if patient_id not in already_notified:
                    msg = (
                        f"Hello {row['name']},\n"
                        f"You are ready for discharge.\n"
                        f"Doctor: {row['doctor']}\n"
                        f"Room: {row['room']}\n"
                        f"- VHeal AI"
                    )
                    try:
                        send_sms(row["phone"], msg)
                        send_whatsapp(row["phone"], msg)
                        row["notification"] = "SMS + WhatsApp Sent"
                        already_notified.add(patient_id)  # mark as done
                    except Exception as e:
                        row["notification"] = f"Notification failed: {e}"
                else:
                    # Already sent before — don't send again
                    row["notification"] = "SMS + WhatsApp Sent ✅"
            else:
                row["notification"] = "Not Ready"

            patients.append(row)

    return patients


@app.get("/")
def home():
    return {"message": "VHeal AI Running"}


@app.get("/patients")
def get_patients():
    return read_patients()


@app.get("/stats")
def get_stats():
    patients = read_patients()
    total_ready = sum(1 for p in patients if p["ready_for_discharge"])
    urgent = sum(1 for p in patients if p["priority"] == "HIGH")
    return {
        "total_patients": len(patients),
        "total_ready": total_ready,
        "urgent_high": urgent,
        "avg_discharge_time": "1h 15m",
        "active_agents": 4
    }


@app.get("/patients/{patient_id}")
def get_patient(patient_id: str):
    patients = read_patients()
    for p in patients:
        if p["patient_id"] == patient_id:
            return p
    return {"error": "Patient not found"}


# ✅ New endpoint — manually trigger notifications
@app.post("/notify/{patient_id}")
def notify_patient(patient_id: str):
    patients = read_patients()
    for p in patients:
        if p["patient_id"] == patient_id and p["ready_for_discharge"]:
            msg = (
                f"Hello {p['name']},\n"
                f"You are ready for discharge.\n"
                f"Doctor: {p['doctor']}\n"
                f"Room: {p['room']}\n"
                f"- VHeal AI"
            )
            try:
                send_sms(p["phone"], msg)
                send_whatsapp(p["phone"], msg)
                already_notified.add(patient_id)
                return {"status": "Notifications sent successfully"}
            except Exception as e:
                return {"status": f"Failed: {e}"}
    return {"status": "Patient not found or not ready"}