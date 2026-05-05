# backend/ml_model.py

def predict_priority(patient):
    """
    Very simple ML-like logic:
    Uses age and severity to decide priority
    """

    age = int(patient["age"])
    severity = int(patient["severity"])

    if severity >= 80 or age >= 70:
        return "HIGH"
    elif severity >= 50:
        return "MEDIUM"
    else:
        return "LOW"
