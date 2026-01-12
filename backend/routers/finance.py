from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from sqlalchemy import func

from database import get_db
from auth import get_current_user, check_permission
from models import User, Finance, Server, AccountStatus, History
from schemas import FinanceCreate, FinanceUpdate, FinanceResponse

router = APIRouter(prefix="/api/finance", tags=["finance"])


@router.get("/", response_model=List[FinanceResponse])
async def get_finance_accounts(
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 2L") and current_user.role.value != "Service Manager":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    query = db.query(Finance).join(Server, Finance.server_id == Server.id)

    if search:
        search = f"%{search}%"
        query = query.filter(
            (Finance.id.cast(str).like(search)) |
            (Server.id.cast(str).like(search)) |
            (func.to_char(Finance.payment_date, 'YYYY-MM-DD').like(search)) |
            (Server.group_id.cast(str).like(search))
        )

    return query.offset(skip).limit(limit).all()


@router.post("/", response_model=FinanceResponse)
async def create_finance_account(
        finance: FinanceCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 2L") and current_user.role.value != "Service Manager":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Check if server exists
    server = db.query(Server).filter(Server.id == finance.server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    db_finance = Finance(**finance.dict())

    db.add(db_finance)
    db.commit()
    db.refresh(db_finance)

    # Log history
    history = History(
        action="CREATE",
        table_name="finance",
        record_id=db_finance.id,
        changes={"all": "created"},
        user_id=current_user.id,
        finance_id=db_finance.id
    )
    db.add(history)
    db.commit()

    return db_finance


@router.put("/{finance_id}", response_model=FinanceResponse)
async def update_finance_account(
        finance_id: int,
        finance_update: FinanceUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 2L") and current_user.role.value != "Service Manager":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db_finance = db.query(Finance).filter(Finance.id == finance_id).first()
    if not db_finance:
        raise HTTPException(status_code=404, detail="Finance account not found")

    changes = {}
    update_data = finance_update.dict(exclude_unset=True)

    for field, new_value in update_data.items():
        old_value = getattr(db_finance, field)
        if old_value != new_value:
            changes[field] = {"old": old_value, "new": new_value}
            setattr(db_finance, field, new_value)

    db_finance.updated_at = datetime.utcnow()

    db.add(db_finance)
    db.commit()
    db.refresh(db_finance)

    # Log history
    if changes:
        history = History(
            action="UPDATE",
            table_name="finance",
            record_id=finance_id,
            changes=changes,
            user_id=current_user.id,
            finance_id=finance_id
        )
        db.add(history)
        db.commit()

    return db_finance


@router.get("/{finance_id}/history")
async def get_finance_history(
        finance_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 1L"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    history = db.query(History).filter(
        History.finance_id == finance_id
    ).order_by(History.timestamp.desc()).all()

    return history