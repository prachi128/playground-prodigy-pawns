import json
from typing import Optional

from sqlalchemy.orm import Session

from models import AdminAuditLog


def log_admin_action(
    db: Session,
    *,
    admin_id: int,
    action: str,
    target_type: str,
    target_id: Optional[int] = None,
    details: Optional[dict] = None,
) -> None:
    entry = AdminAuditLog(
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details_json=json.dumps(details or {}),
    )
    db.add(entry)
