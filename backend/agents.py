# backend/agents.py

def run_agents(patient):
    """
    Simulates AI agents completing discharge tasks
    """

    checklist = {
        "vitals_check": False,
        "medication_review": False,
        "billing": False,
        "transport": False
    }

    priority = patient["priority"]

    # AI logic (simple)
    checklist["vitals_check"] = True
    checklist["medication_review"] = True

    if priority in ["MEDIUM", "LOW"]:
        checklist["billing"] = True

    if priority == "LOW":
        checklist["transport"] = True

    completed = sum(checklist.values())
    total = len(checklist)

    return {
        "checklist": checklist,
        "completed": f"{completed}/{total}",
        "ready_for_discharge": completed == total
    }
