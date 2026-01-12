from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from sqlalchemy import func

from database import get_db
from auth import get_current_user, check_permission
from models import User, Group, Server, GroupStatus, History
from schemas import GroupCreate, GroupUpdate, GroupResponse

router = APIRouter(prefix="/api/groups", tags=["groups"])


@router.get("/", response_model=List[GroupResponse])
async def get_groups(
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    query = db.query(Group)

    if search:
        search = f"%{search}%"
        query = query.filter(
            (Group.id.cast(str).like(search)) |
            (Group.title.ilike(search))
        )

    groups = query.offset(skip).limit(limit).all()

    # Calculate assigned servers for each group
    for group in groups:
        server_count = db.query(func.count(Server.id)).filter(
            Server.group_id == group.id
        ).scalar()
        group.assigned_servers = server_count

    return groups


@router.post("/", response_model=GroupResponse)
async def create_group(
        group: GroupCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 2L"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db_group = Group(**group.dict())

    db.add(db_group)
    db.commit()
    db.refresh(db_group)

    # Log history
    history = History(
        action="CREATE",
        table_name="groups",
        record_id=db_group.id,
        changes={"all": "created"},
        user_id=current_user.id
    )
    db.add(history)
    db.commit()

    return db_group


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
        group_id: int,
        group_update: GroupUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 2L"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db_group = db.query(Group).filter(Group.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")

    changes = {}
    update_data = group_update.dict(exclude_unset=True)

    for field, new_value in update_data.items():
        old_value = getattr(db_group, field)
        if old_value != new_value:
            changes[field] = {"old": old_value, "new": new_value}
            setattr(db_group, field, new_value)

    db_group.updated_at = datetime.utcnow()

    db.add(db_group)
    db.commit()
    db.refresh(db_group)

    # Log history
    if changes:
        history = History(
            action="UPDATE",
            table_name="groups",
            record_id=group_id,
            changes=changes,
            user_id=current_user.id
        )
        db.add(history)
        db.commit()

    return db_group